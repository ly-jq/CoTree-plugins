import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

export const object = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
export function identifier(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,512}$/.test(value)) throw new Error('Use an observed resource ID, not a URL or path.');
  return value;
}
export function query(url, input = {}, allowed = []) {
  if (!object(input)) throw new Error('query must be an object.');
  for (const [key, value] of Object.entries(input)) {
    if (!allowed.includes(key)) throw new Error('Unsupported query parameter for this action.');
    for (const item of Array.isArray(value) ? value : [value]) {
      if (!['string', 'number', 'boolean'].includes(typeof item) || String(item).length > 8192) throw new Error('Invalid query value.');
      url.searchParams.append(key, String(item));
    }
  }
  for (const key of ['pageSize', 'maxResults']) if (url.searchParams.has(key) && !/^(?:[1-9]\d?|100)$/.test(url.searchParams.get(key))) throw new Error('Page size must be 1..100.');
}
export function inputObject(input, keys) {
  if (!object(input) || Object.keys(input).some(key => !keys.includes(key))) throw new Error('Unexpected request field. Use the packaged API reference.');
}
export async function boundedBytes(response, limit = 8 * 1024 * 1024) {
  const reader = response.body?.getReader(); if (!reader) return Buffer.alloc(0);
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new Error('Response exceeds the local size limit. Narrow the request.'); }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}
export async function callGoogle({ url, method = 'GET', body, contentType = 'application/json', binary = false, headers: extraHeaders = {} }, { token, apply = false, fetcher = fetch } = {}) {
  const allowed = ['https://www.googleapis.com', 'https://docs.googleapis.com', 'https://sheets.googleapis.com', 'https://slides.googleapis.com', 'https://gmail.googleapis.com'];
  if (!allowed.includes(url.origin) || url.username || url.password) throw new Error('Unsupported Google API origin.');
  const write = method !== 'GET';
  if (write && !apply) throw new Error('Write action requires --apply after the concrete operation is authorized.');
  if (typeof token !== 'string' || !token || /\s/.test(token)) throw new Error('Set this plugin\'s ACCESS_TOKEN locally to a bare Google OAuth access token.');
  let payload;
  if (body !== undefined) {
    payload = Buffer.isBuffer(body) ? body : JSON.stringify(body);
    if (Buffer.byteLength(payload) > 16 * 1024 * 1024) throw new Error('Request exceeds 16 MiB. Use a bounded or resumable operation.');
  }
  let response;
  try { response = await fetcher(url, { method, headers: { Authorization: `Bearer ${token}`, Accept: binary ? '*/*' : 'application/json', ...extraHeaders, ...(payload === undefined ? {} : { 'Content-Type': contentType }) }, ...(payload === undefined ? {} : { body: payload }), redirect: 'error', signal: AbortSignal.timeout(20000) }); }
  catch { throw new Error(write ? 'Google write outcome is unknown after connection failure/timeout. Read the target before retrying.' : 'Google read failed, timed out, or attempted a redirect.'); }
  if (!response.ok) {
    const status = response.status; await response.body?.cancel();
    throw new Error(`Google HTTP ${status}. Check scopes, API enablement, resource, quota, or revision; response body omitted.${write && status >= 500 ? ' Write outcome may be unknown; read back before retrying.' : ''}`);
  }
  let data = null;
  try {
    const bytes = await boundedBytes(response, binary ? 20 * 1024 * 1024 : undefined);
    if (binary) return { bytes, mimeType: response.headers.get('content-type'), serviceAccepted: true };
    if (bytes.length) data = JSON.parse(bytes.toString('utf8'));
    if (data !== null && !object(data)) throw new Error('Expected a Google resource object.');
  } catch {
    throw new Error(write ? 'Google accepted the write, but its response could not be read. Read the target before retrying.' : 'Google response was invalid, interrupted or exceeded the local size limit. Narrow the request.');
  }
  // Preserve user content; omit the exact access token if a service unexpectedly echoes it.
  if (data !== null) data = JSON.parse(JSON.stringify(data).replaceAll(token, '[REDACTED_TOKEN]'));
  return { data, etag: response.headers.get('etag'), serviceAccepted: true, businessVerified: false, write, ...(data?.nextPageToken ? { nextPageToken: data.nextPageToken, incomplete: true } : {}) };
}
export function readLocal(file, limit = 1024 * 1024) {
  if (!file || !statSync(file).isFile() || statSync(file).size > limit) throw new Error('Missing, non-file or oversized local input.');
  return readFileSync(file);
}
export async function apiCli(execute, tokenName, actions, uploadTypes) {
  const { values } = parseArgs({ options: { request: { type: 'string' }, output: { type: 'string' }, apply: { type: 'boolean' }, upload: { type: 'string' }, help: { type: 'boolean' } }, allowPositionals: false });
  if (values.help) { process.stdout.write(`Use --request request.json [--output new-file] [--apply]${uploadTypes ? ' [--upload file]' : ''}. Token: ${tokenName}. Fixed actions: ${actions.join(', ')}. Pagination is explicit. Writes are never retried. Binary responses require --output.\n`); return; }
  let request;
  try { request = JSON.parse(readLocal(values.request).toString('utf8')); } catch { throw new Error('Cannot read request JSON (max 1 MiB).'); }
  const binary = ['files-export', 'files-download', 'attachment-get'].includes(request.action);
  if (binary && !values.output) throw new Error('Binary responses require --output.');
  // Refuse existing output before issuing a remote operation. Exclusive create is rechecked on save.
  if (values.output) { try { statSync(values.output); throw new Error('OUTPUT_EXISTS'); } catch (error) { if (error.code !== 'ENOENT') throw new Error('Output already exists or is unavailable.'); } }
  let upload;
  if (values.upload) {
    const extension = values.upload.split('.').at(-1).toLowerCase(), mimeType = uploadTypes?.[extension];
    if (!mimeType || request.action !== 'files-import') throw new Error('Unsupported import file type or action.');
    upload = { bytes: readLocal(values.upload, 10 * 1024 * 1024), mimeType };
  }
  const result = await execute(request, { token: process.env[tokenName], apply: values.apply === true, upload });
  const contents = result.bytes ?? JSON.stringify(result, null, 2) + '\n';
  if (values.output) {
    try { writeFileSync(values.output, contents, { flag: 'wx', mode: 0o600 }); }
    catch { throw new Error('Service returned a response, but local output could not be saved. Check the target before retrying a write.'); }
    process.stdout.write(JSON.stringify({ output: values.output, action: request.action, bytes: Buffer.byteLength(contents), serviceAccepted: result.serviceAccepted, businessVerified: false }) + '\n');
  } else process.stdout.write(contents);
}
