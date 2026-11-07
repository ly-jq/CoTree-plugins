import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';

const fields = ['id', 'eventID', 'shortId', 'title', 'message', 'status', 'level', 'priority', 'platform', 'type', 'issueType', 'issueCategory', 'culprit', 'firstSeen', 'lastSeen', 'dateCreated', 'dateReceived', 'count', 'userCount', 'environment', 'release', 'firstRelease', 'lastRelease', 'permalink', 'project', 'tags', 'stats'];
const segment = value => {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(value)) throw new Error('Supply a valid organization/project slug or identifier.');
  return encodeURIComponent(value);
};
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function redact(value, token) {
  if (typeof value === 'string') return value.replaceAll(token, '[REDACTED_TOKEN]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[REDACTED_IP]');
  if (Array.isArray(value)) return value.map(item => redact(item, token));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key,
    /^(email|ip|ip_address|user|request|headers|cookies|authorization|password|token|vars|locals)$/i.test(key) ? '[REDACTED]' : redact(item, token)]));
  return value;
}

function projectOutput(item, token, includeEntries) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Unexpected Sentry response shape.');
  return redact(Object.fromEntries([...fields, ...(includeEntries ? ['entries'] : [])].filter(key => Object.hasOwn(item, key)).map(key => [key, item[key]])), token);
}

async function readJson(response) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Empty Sentry response.');
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 4 * 1024 * 1024) { await reader.cancel(); throw new Error('Sentry response exceeds 4 MiB. Narrow the query.'); }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new Error('Sentry returned invalid JSON.'); }
}

function nextCursor(header, current) {
  for (const part of (header ?? '').split(/,(?=\s*<)/)) {
    if (!/\brel="next"/.test(part) || !/\bresults="true"/.test(part)) continue;
    const target = part.match(/<([^>]+)>/);
    if (!target) throw new Error('Invalid Sentry pagination link.');
    const next = new URL(target[1], current);
    if (next.origin !== current.origin || next.pathname !== current.pathname || next.username || next.password) throw new Error('Sentry pagination changed origin or resource.');
    const cursor = part.match(/\bcursor="([^"]+)"/)?.[1] ?? next.searchParams.get('cursor');
    if (!cursor || cursor.length > 1024) throw new Error('Invalid Sentry pagination cursor.');
    return cursor;
  }
  return undefined;
}

/** Only explicit read endpoints. Dependencies are injectable for offline protocol tests. */
export async function readSentry(options, { fetcher = fetch, sleep = delay } = {}) {
  const { command, org, project, id, token, includeEntries = false, query, shortId, environment, period = '24h', limit = 20, baseUrl = 'https://sentry.io' } = options;
  const base = new URL(baseUrl);
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || base.pathname !== '/') throw new Error('Use an explicit HTTPS Sentry origin without a path or credentials.');
  if (typeof token !== 'string' || !token.trim() || /\s/.test(token)) throw new Error('Set COTREE_SENTRY_API_TOKEN locally to an API token, without the Bearer prefix.');
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new Error('Limit must be between 1 and 50.');
  if (!/^[1-9]\d{0,5}[smhdw]$/.test(period)) throw new Error('Use a time range such as 24h or 7d.');
  const orgPath = segment(org);
  let endpoint, paged = false;
  if (command === 'list-issues') {
    // The project issues endpoint's statsPeriod only controls its stats field.
    // Organization issues supports a real query window and an explicit project slug.
    endpoint = `/api/0/organizations/${orgPath}/issues/`; paged = true; segment(project);
  } else if (command === 'issue-detail' || command === 'issue-events') {
    if (typeof id !== 'string' || !/^\d+$/.test(id)) throw new Error('Use the numeric issue ID returned by Sentry.');
    endpoint = `/api/0/organizations/${orgPath}/issues/${id}/${command === 'issue-events' ? 'events/' : ''}`;
    paged = command === 'issue-events';
  } else if (command === 'event-detail') {
    if (typeof id !== 'string' || !/^[a-fA-F0-9]{32}$/.test(id)) throw new Error('Use a 32-character event ID.');
    endpoint = `/api/0/projects/${orgPath}/${segment(project)}/events/${id}/`;
  } else throw new Error('Supported commands: list-issues, issue-detail, issue-events, event-detail.');
  if (includeEntries && command !== 'event-detail') throw new Error('--include-entries is only supported for event-detail.');
  if (shortId && (command !== 'list-issues' || shortId.length > 128 || !/^[A-Z0-9][A-Z0-9_-]*-[A-Z0-9]+$/.test(shortId) || query !== undefined)) throw new Error('Use --short-id only for list-issues, without --query.');
  const original = new URL(endpoint, base);
  if (paged) {
    original.searchParams.set('statsPeriod', period);
    if (environment) original.searchParams.set('environment', environment);
    original.searchParams.set('query', shortId ?? query ?? (command === 'list-issues' ? 'is:unresolved' : ''));
    if (command === 'list-issues') {
      original.searchParams.set('project', project);
      original.searchParams.set('sort', 'date');
      original.searchParams.set('shortIdLookup', shortId ? '1' : '0');
    }
  }
  const data = [], seen = new Set(); let cursor, pages = 0, more = false, clipped = false;
  do {
    const url = new URL(original);
    if (paged) url.searchParams.set(command === 'list-issues' ? 'limit' : 'per_page', String(limit - data.length));
    if (cursor) url.searchParams.set('cursor', cursor);
    let response;
    for (let attempt = 0; attempt < 2; attempt++) {
      try { response = await fetcher(url, { method: 'GET', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(15000) }); }
      catch { throw new Error('Sentry connection failed, timed out, or attempted a redirect.'); }
      if (response.ok) break;
      const status = response.status, retry = response.headers.get('retry-after');
      await response.body?.cancel();
      if (attempt === 0 && (status === 429 || status >= 500)) {
        const ms = retry === null ? 1000 : /^\d+$/.test(retry) ? Number(retry) * 1000 : Date.parse(retry) - Date.now();
        if (Number.isFinite(ms) && ms >= 0 && ms <= 5000) { await sleep(ms); continue; }
      }
      throw new Error(`Sentry HTTP ${status}. Check scope, region, query, or retry later; response body omitted.`);
    }
    if (!response?.ok) throw new Error('Sentry request did not complete.');
    const body = await readJson(response); pages++;
    if (!paged) return { command, org, ...(project ? { project } : {}), data: projectOutput(body, token, includeEntries), pages, readOnly: true };
    if (!Array.isArray(body)) throw new Error('Expected a Sentry result list.');
    if (shortId && body.some(item => item?.project?.slug !== project && item?.project?.id !== project)) throw new Error('Short ID lookup returned a different or unverifiable project.');
    clipped ||= body.length > limit - data.length;
    data.push(...body.slice(0, limit - data.length).map(item => projectOutput(item, token, false)));
    cursor = nextCursor(response.headers.get('link'), url); more = Boolean(cursor);
    if (cursor && seen.has(cursor)) throw new Error('Sentry repeated a pagination cursor.');
    if (cursor) seen.add(cursor);
    if (more && body.length === 0) throw new Error('Sentry returned an empty page with more results.');
    if (more && pages >= 10 && data.length < limit) throw new Error('Sentry pagination exceeded ten pages. Narrow the query.');
  } while (more && data.length < limit);
  return { command, org, ...(project ? { project } : {}), ...(shortId ? { shortId, filterCaveat: 'Short ID lookup may ignore time/environment filters; project was checked.' } : { period, ...(environment ? { environment } : {}) }), data, pages, hasMore: more || clipped, truncated: more || clipped, readOnly: true };
}

async function main() {
  const { values, positionals } = parseArgs({ options: {
    org: { type: 'string' }, project: { type: 'string' }, 'base-url': { type: 'string' },
    'time-range': { type: 'string' }, environment: { type: 'string' }, query: { type: 'string' }, 'short-id': { type: 'string' }, limit: { type: 'string' },
    'include-entries': { type: 'boolean', default: false }, help: { type: 'boolean', default: false }
  }, allowPositionals: true });
  if (values.help) {
    process.stdout.write('node sentry-api.mjs --org ORG [--project PROJECT] <list-issues|issue-detail ID|issue-events ID|event-detail ID> [--time-range 24h] [--environment NAME] [--limit 1..50] [--query QUERY | --short-id PROJECT-123] [--base-url https://sentry.io] [--include-entries]\nToken: COTREE_SENTRY_API_TOKEN (read from environment only). GET only. No default environment filter.\n'); return;
  }
  const [command, id, ...extra] = positionals;
  if (extra.length || (command === 'list-issues' && id)) throw new Error('Unexpected positional arguments.');
  const result = await readSentry({ command, id, org: values.org, project: values.project, baseUrl: values['base-url'], period: values['time-range'], environment: values.environment, query: values.query,
    shortId: values['short-id'], limit: values.limit === undefined ? 20 : Number(values.limit), includeEntries: values['include-entries'], token: process.env.COTREE_SENTRY_API_TOKEN });
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { process.stderr.write(`Sentry read failed: ${error.message}\n`); process.exitCode = 1; });
}
