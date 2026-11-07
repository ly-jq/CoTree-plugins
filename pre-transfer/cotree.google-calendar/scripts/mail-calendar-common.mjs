import { openSync, fstatSync, readFileSync, closeSync, statSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

export const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export function fields(value, allowed) {
  if (!object(value) || Object.keys(value).some(key => !allowed.includes(key))) throw new Error('Unexpected request fields; use references/api.md.');
}
export function id(value) {
  // Outlook IDs may contain base64 punctuation; encode exactly one segment, never accept pre-encoded paths.
  if (typeof value !== 'string' || !value || value.length > 2048 || /[\x00-\x20\x7f%?#\\]/.test(value) || value === '.' || value === '..' || value.includes('://')) throw new Error('Use an observed resource ID, not a URL or encoded path.');
  return encodeURIComponent(value);
}
export function params(url, input = {}, allowed = []) {
  fields(input, allowed);
  for (const [key, value] of Object.entries(input)) {
    if (!['string', 'boolean', 'number'].includes(typeof value) || (typeof value === 'number' && !Number.isFinite(value)) || String(value).length > 8192) throw new Error('Query values must be bounded scalar values.');
    url.searchParams.set(key, String(value));
  }
  for (const key of ['maxResults', '$top']) if (url.searchParams.has(key) && !/^(?:[1-9]\d?|100)$/.test(url.searchParams.get(key))) throw new Error('Page size must be 1..100.');
  if (url.href.length > 16384) throw new Error('Query URL exceeds 16 KiB.');
}
export function headerValue(value) {
  if (typeof value !== 'string' || !value || value.length > 512 || /[\x00-\x1f\x7f]/.test(value)) throw new Error('Invalid header value.');
  return value;
}
export function zone(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_+:/ .()-]{1,128}$/.test(value)) throw new Error('Supply the service-supported time zone without header syntax.');
  return value;
}
export function dateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value + 'T00:00:00Z')) || new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) !== value) throw new Error('Invalid calendar date.');
  return value;
}
export function instant(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,7})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value)) throw new Error('Use RFC3339 time with seconds and an explicit UTC offset.');
  dateOnly(value.slice(0, 10));
  const result = Date.parse(value); if (!Number.isFinite(result)) throw new Error('Invalid timestamp.');
  return result;
}
export function interval(start, end) {
  if (instant(end) <= instant(start)) throw new Error('End must be after start.');
}
export function continuation(next, expected) {
  if (typeof next !== 'string' || next.length > 16384) throw new Error('Invalid nextLink.');
  let url; try { url = new URL(next); } catch { throw new Error('Invalid nextLink.'); }
  if (url.origin !== expected.origin || url.pathname !== expected.pathname || url.username || url.password || url.hash) throw new Error('Pagination changed origin or resource.');
  for (const [key, value] of expected.searchParams) if (!['$skip', '$skiptoken', '$top'].includes(key) && url.searchParams.get(key) !== value) throw new Error('Pagination changed the query scope.');
  if (url.href === expected.href) throw new Error('Service repeated the current page.');
  return url;
}
export async function callApi({ url, method = 'GET', body, headers = {}, write = method !== 'GET', paged = false }, { token, apply = false, fetcher = fetch, signal } = {}) {
  if (!['https://www.googleapis.com', 'https://graph.microsoft.com'].includes(url.origin) || url.username || url.password || url.hash) throw new Error('Unsupported API target.');
  if (typeof token !== 'string' || !/^[\x21-\x7e]{8,16384}$/.test(token)) throw new Error('Set the plugin ACCESS_TOKEN locally to a bare OAuth access token.');
  if (write && apply !== true) throw new Error('Write requires --apply and existing user authorization.');
  const payload = body === undefined ? undefined : JSON.stringify(body);
  if (payload !== undefined && Buffer.byteLength(payload) > 1024 * 1024) throw new Error('Request body exceeds 1 MiB.');
  const deadline = AbortSignal.timeout(20000);
  let response;
  try { response = await fetcher(url, { method, headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...headers, ...(payload === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(payload === undefined ? {} : { body: payload }), redirect: 'error', signal: signal ? AbortSignal.any([signal, deadline]) : deadline }); }
  catch { throw new Error(write ? 'Write outcome unknown after connection failure, cancellation, timeout or redirect; read back before retrying.' : 'Read failed, cancelled, timed out or redirected.'); }
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`API HTTP ${response.status}; check identity, scope, resource, revision or quota. Response body omitted.${write ? ' Read back before retrying; do not duplicate a write.' : ''}`);
  }
  let data = null;
  const reader = response.body?.getReader(); const chunks = []; let size = 0;
  try {
    if (reader) while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength; if (size > 8 * 1024 * 1024) { await reader.cancel(); throw new Error('oversized'); }
      chunks.push(Buffer.from(value));
    }
    if (size) {
      if (!/^application\/(?:[\w.+-]+\+)?json\b/i.test(response.headers.get('content-type') ?? '')) throw new Error('Expected JSON');
      data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!object(data) || data.error) throw new Error('Expected resource');
      data = JSON.parse(JSON.stringify(data).replaceAll(JSON.stringify(token).slice(1, -1), '[REDACTED_TOKEN]'));
    } else if (![202, 204].includes(response.status)) throw new Error('Unexpected empty response');
  } catch { throw new Error(write ? 'Service accepted a write but the response is invalid, incomplete or exceeds 8 MiB; read back before retrying.' : 'Response invalid, interrupted or exceeds 8 MiB; narrow the query.'); }
  finally { reader?.releaseLock(); }
  const next = data?.['@odata.nextLink'];
  if (next !== undefined) {
    if (!paged) throw new Error('Unexpected pagination for this action.');
    continuation(next, url);
  }
  return { data, httpStatus: response.status, etag: response.headers.get('etag'), serviceAccepted: true, businessVerified: false, write, ...(paged ? { incomplete: Boolean(next), ...(next ? { nextLink: next } : {}) } : {}) };
}
export async function apiCli(execute, tokenName, actions) {
  try {
    const { values } = parseArgs({ options: { request: { type: 'string' }, output: { type: 'string' }, apply: { type: 'boolean', default: false }, help: { type: 'boolean' } } });
    if (values.help) { process.stdout.write(`Use --request request.json [--output new-file] [--apply]. Token: ${tokenName}. Actions: ${actions.join(', ')}. One page per call; writes are not retried.\n`); return; }
    let request;
    const fd = openSync(values.request, 'r');
    try {
      const info = fstatSync(fd); if (!info.isFile() || info.size > 1024 * 1024) throw new Error('Use a regular request JSON file no larger than 1 MiB.');
      try { request = JSON.parse(readFileSync(fd, 'utf8')); } catch { throw new Error('Invalid request JSON.'); }
    } finally { closeSync(fd); }
    if (values.output) { try { statSync(values.output); throw new Error('Output already exists.'); } catch (error) { if (error.code !== 'ENOENT') throw new Error('Output already exists or is unavailable.'); } }
    const result = await execute(request, { token: process.env[tokenName], apply: values.apply });
    const text = JSON.stringify(result, null, 2) + '\n';
    if (values.output) {
      try { writeFileSync(values.output, text, { flag: 'wx', mode: 0o600 }); }
      catch { throw new Error('Response received but local save failed; check the remote target before repeating a write.'); }
      process.stdout.write(JSON.stringify({ output: values.output, serviceAccepted: true, businessVerified: false }) + '\n');
    } else process.stdout.write(text);
  } catch (error) {
    process.stderr.write((error?.code || error instanceof TypeError ? 'Invalid command or input file.' : error.message) + '\n'); process.exitCode = 1;
  }
}
