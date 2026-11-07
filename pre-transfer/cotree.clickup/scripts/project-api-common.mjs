import { openSync, fstatSync, readFileSync, closeSync } from 'node:fs';
import { parseArgs } from 'node:util';

const MAX_BYTES = 4 * 1024 * 1024;
export const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export function identifier(value, numeric = true) {
  if (typeof value !== 'string' || !(numeric ? /^[1-9][0-9]{0,31}$/ : /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/).test(value)) throw new Error('Supply a verified resource ID, not a URL or path.');
  return value;
}
export function queryParams(input, allowed) {
  if (!object(input)) throw new Error('Query must be a JSON object.');
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (!allowed.includes(key)) throw new Error('Unsupported query field; see references/api.md.');
    const list = Array.isArray(value) ? value : [value];
    if (list.length > 100) throw new Error('Too many query values.');
    for (const item of list) {
      if (!['string', 'boolean', 'number'].includes(typeof item) || (typeof item === 'number' && !Number.isFinite(item)) || String(item).length > 4096) throw new Error('Query values must be bounded strings, booleans or finite numbers.');
      query.append(Array.isArray(value) ? key + '[]' : key, String(item));
    }
  }
  if (query.toString().length > 16384) throw new Error('Query exceeds 16 KiB.');
  return query;
}
export function writeBody(value, apply) {
  if (apply !== true) throw new Error('Write requires --apply and existing user authorization.');
  if (!object(value) || !Object.keys(value).length) throw new Error('Write body must be a non-empty JSON object.');
  if (Buffer.byteLength(JSON.stringify(value)) > 256 * 1024) throw new Error('Body exceeds 256 KiB.');
  return value;
}

/** Fixed provider URLs are supplied by each wrapper. No redirects, retries or credential persistence. */
export async function requestJson(url, { method, token, bearer, body }, { fetcher = fetch, signal } = {}) {
  if (typeof token !== 'string' || !/^[\x21-\x7e]{8,8192}$/.test(token)) throw new Error('Set the plugin REST token environment variable locally, without an Authorization prefix.');
  let response;
  try {
    const deadline = AbortSignal.timeout(15000);
    response = await fetcher(url, { method, headers: { Accept: 'application/json', Authorization: bearer ? `Bearer ${token}` : token, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), redirect: 'error', signal: signal ? AbortSignal.any([deadline, signal]) : deadline });
  } catch { throw new Error('Connection failed, cancelled, timed out or redirected. A sent write may have completed; read back before retrying.'); }
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`API HTTP ${response.status}; check identity, scope, target or rate limit. Response body omitted. A sent write may have completed; do not blindly retry.`);
  }
  if (!/^application\/(?:[\w.+-]+\+)?json\b/i.test(response.headers.get('content-type') ?? '')) {
    await response.body?.cancel(); throw new Error('Expected a JSON response; write outcome is unverified.');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Empty API response; write outcome is unverified.');
  const chunks = []; let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BYTES) { await reader.cancel(); throw new Error('Response too large.'); }
      chunks.push(Buffer.from(value));
    }
  } catch { throw new Error('Response incomplete or exceeds 4 MiB; narrow the query. Write outcome is unverified.'); }
  finally { reader.releaseLock(); }
  try {
    const raw = Buffer.concat(chunks).toString('utf8');
    const encoded = JSON.stringify(token).slice(1, -1);
    const result = JSON.parse(raw.replaceAll(encoded, '[REDACTED_TOKEN]'));
    if (!object(result)) throw new Error('Invalid shape');
    return result;
  } catch { throw new Error('Invalid JSON response; write outcome is unverified.'); }
}

function inputFile(filename) {
  const fd = openSync(filename, 'r');
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.size > 256 * 1024) throw new Error('Input must be a regular JSON file no larger than 256 KiB.');
    try { return JSON.parse(readFileSync(fd, 'utf8')); }
    catch { throw new Error('Input file must contain valid JSON.'); }
  } finally { closeSync(fd); }
}
export async function runCli(service, tokenName, execute, commands) {
  try {
    const { values, positionals } = parseArgs({ options: { id: { type: 'string' }, 'query-file': { type: 'string' }, 'body-file': { type: 'string' }, apply: { type: 'boolean', default: false }, help: { type: 'boolean', default: false } }, allowPositionals: true });
    if (values.help) { process.stdout.write(`node ${service}-api.mjs <${commands.join('|')}> [--id ID] [--query-file query.json] [--body-file body.json --apply]\nCredential: ${tokenName}, read only from environment. One page per call. See references/api.md.\n`); return; }
    if (positionals.length !== 1) throw new Error('Supply exactly one operation.');
    const result = await execute({ operation: positionals[0], id: values.id, query: values['query-file'] ? inputFile(values['query-file']) : {}, body: values['body-file'] ? inputFile(values['body-file']) : undefined, apply: values.apply, token: process.env[tokenName] });
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } catch (error) {
    // Never print input filenames, parseArgs diagnostics, transport exceptions or response bodies.
    const message = error?.code || error instanceof SyntaxError ? 'Invalid command or input file.' : error.message;
    process.stderr.write(`${service} request failed: ${message}\n`); process.exitCode = 1;
  }
}
