import { openSync, fstatSync, readFileSync, closeSync, lstatSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const base = 'http://127.0.0.1:23119';
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
function fields(value, allowed) { if (!object(value) || Object.keys(value).some(k => !allowed.includes(k))) throw new Error('Invalid request fields; use references/api.md.'); }
function key(value) { if (typeof value !== 'string' || !/^[A-Z0-9]{8}$/.test(value)) throw new Error('Use an observed eight-character Zotero item/collection key.'); return value; }
function number(value, maximum = 1000000) { if (!Number.isSafeInteger(value) || value < 0 || value > maximum) throw new Error('Invalid bounded integer.'); return value; }
function pin(value) { if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) throw new Error('Invalid server identity.'); return value; }
function newFile(file) {
  if (typeof file !== 'string' || !file || file.includes('\0')) throw new Error('Supply a new output file.');
  try { lstatSync(file); throw new Error('exists'); } catch (error) { if (error.code !== 'ENOENT') throw new Error('Output exists or is unavailable.'); }
}
export const actions = ['status', 'ping', 'item-types', 'item-fields', 'items', 'search', 'item', 'children', 'collections', 'tags', 'groups', 'searches', 'search-items', 'fulltext', 'file-url', 'export-bibtex', 'citations', 'selected-target', 'import-bibtex', 'import-ris'];

async function exchange(url, { method = 'GET', body, text = false, write = false, serverId } = {}, { fetcher = fetch, signal } = {}) {
  const deadline = AbortSignal.timeout(15000), combined = signal ? AbortSignal.any([signal, deadline]) : deadline;
  const headers = url.pathname.startsWith('/connector/') ? { 'X-Zotero-Connector-API-Version': '3' } : { 'Zotero-API-Version': '3' };
  if (serverId !== undefined) headers['Zotero-Server-ID'] = pin(serverId);
  if (body !== undefined) headers['Content-Type'] = text ? 'text/plain' : 'application/json';
  let response;
  try { response = await fetcher(url, { method, headers, ...(body === undefined ? {} : { body: text ? body : JSON.stringify(body) }), redirect: 'error', signal: combined }); }
  catch { throw new Error(write ? 'Import outcome unknown after interruption; inspect Zotero and the saved session before retrying.' : 'Zotero local request failed, timed out or redirected. Check Desktop and local API settings.'); }
  if (!response.ok) { await response.body?.cancel(); throw new Error(`Zotero HTTP ${response.status}; response omitted.${write ? ' Inspect the selected library before retrying.' : ''}`); }
  const reader = response.body?.getReader(), chunks = []; let size = 0;
  try {
    if (reader) while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > 8 * 1024 * 1024) { await reader.cancel(); throw new Error(); } chunks.push(Buffer.from(part.value)); }
  } catch { throw new Error(write ? 'Import response incomplete or exceeds 8 MiB; inspect Zotero before retrying.' : 'Zotero response incomplete or exceeds 8 MiB; narrow the request.'); }
  finally { reader?.releaseLock(); }
  const apiVersion = response.headers.get('Zotero-API-Version'), observedServer = response.headers.get('Zotero-Server-ID');
  if (apiVersion && apiVersion !== '3') throw new Error('Unsupported Zotero API version.');
  if (serverId !== undefined && observedServer !== serverId && !url.pathname.startsWith('/connector/')) throw new Error('Zotero server identity changed; discard cached pages.');
  return { response, text: Buffer.concat(chunks).toString('utf8'), apiVersion, serverId: observedServer, version: response.headers.get('Last-Modified-Version') };
}
function decode(result) { try { return JSON.parse(result.text); } catch { throw new Error('Zotero returned invalid JSON; inspect any import before retrying.'); } }
function selection(data) {
  if (!object(data) || !Number.isSafeInteger(data.libraryID) || data.libraryID < 1 || !(data.id === null || Number.isSafeInteger(data.id) && data.id > 0)) throw new Error('Unknown Zotero selection shape.');
  return { libraryID: data.libraryID, collectionID: data.id, libraryName: data.libraryName, collectionName: data.name, editable: data.editable === true && data.libraryEditable !== false };
}
export async function executeZotero(request, options = {}) {
  if (!object(request) || !actions.includes(request.action)) throw new Error('Unsupported Zotero action.');
  const action = request.action, importing = action.startsWith('import-');
  if (importing || action === 'selected-target') {
    fields(request, ['action', ...(importing ? ['text', 'session', 'target'] : [])]);
    if (importing) {
      if (options.apply !== true) throw new Error('Import requires --apply and existing user authorization.');
      if (typeof request.text !== 'string' || !request.text.trim() || Buffer.byteLength(request.text) > 1024 * 1024) throw new Error('Supply nonempty BibTeX/RIS text up to 1 MiB.');
      if (typeof request.session !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(request.session)) throw new Error('Supply a stable import session ID before starting.');
      fields(request.target, ['libraryID', 'collectionID']); number(request.target.libraryID); if (!request.target.libraryID) throw new Error('Invalid target library.'); if (request.target.collectionID !== null) { number(request.target.collectionID); if (!request.target.collectionID) throw new Error('Invalid target collection.'); }
    }
    const current = selection(decode(await exchange(new URL(base + '/connector/getSelectedCollection'), { method: 'POST', body: { switchToReadableLibrary: false } }, options)));
    if (!importing) return { data: current, write: false, businessVerified: false };
    if (!current.editable || current.libraryID !== request.target.libraryID || current.collectionID !== request.target.collectionID) throw new Error('Selected Zotero target changed or is not editable; no import sent.');
    const url = new URL(base + '/connector/import'); url.searchParams.set('session', request.session);
    const imported = await exchange(url, { method: 'POST', body: request.text, text: true, write: true }, options);
    const data = decode(imported);
    if (imported.response.status !== 201 || !Array.isArray(data)) throw new Error('Import response unrecognized; inspect Zotero before repeating.');
    return { data, session: request.session, preflightTarget: current, httpStatus: 201, write: true, serviceAccepted: true, businessVerified: false, destinationMustBeVerified: true };
  }
  const simple = { status: '/api/', ping: '/connector/ping', 'item-types': '/api/itemTypes', 'item-fields': '/api/itemFields' };
  if (Object.hasOwn(simple, action)) {
    fields(request, ['action']);
    const result = await exchange(new URL(base + simple[action]), {}, options);
    return { httpStatus: result.response.status, apiVersion: result.apiVersion, serverId: result.serverId, ...(action.startsWith('item-') ? { data: decode(result) } : {}), write: false, businessVerified: false };
  }
  const keyed = ['item', 'children', 'fulltext', 'file-url'].includes(action), savedSearch = action === 'search-items';
  const paged = ['items', 'search', 'children', 'collections', 'tags', 'groups', 'searches', 'search-items', 'export-bibtex', 'citations'].includes(action);
  const supportsChildren = ['items', 'search', 'export-bibtex', 'citations'].includes(action);
  fields(request, ['action', ...(action === 'groups' ? [] : ['groupId']), 'serverId', 'version', ...(supportsChildren ? ['includeChildren'] : []), ...(keyed ? ['itemKey'] : []), ...(savedSearch ? ['searchKey'] : []), ...(paged ? ['query'] : [])]);
  if (request.includeChildren !== undefined && typeof request.includeChildren !== 'boolean') throw new Error('includeChildren must be a boolean.');
  if (['children', 'fulltext', 'file-url'].includes(action) && options.content !== true) throw new Error('Attachment metadata/text/path requires --content and user-requested attachment access.');
  const prefix = request.groupId === undefined ? '/api/users/0' : /^\d{1,15}$/.test(request.groupId) && Number(request.groupId) > 0 ? '/api/groups/' + request.groupId : null;
  if (!prefix) throw new Error('Use an observed positive group ID.');
  const suffix = keyed ? '/items/' + key(request.itemKey) + ({ item: '', children: '/children', fulltext: '/fulltext', 'file-url': '/file/view/url' })[action]
    : savedSearch ? '/searches/' + key(request.searchKey) + '/items'
      : ({ items: '/items/top', search: '/items/top', collections: '/collections', tags: '/tags', groups: '/groups', searches: '/searches', 'export-bibtex': '/items/top', citations: '/items/top' })[action];
  const url = new URL(base + prefix + (supportsChildren && request.includeChildren ? '/items' : suffix)), query = request.query ?? {};
  const itemQuery = ['items', 'search', 'export-bibtex', 'citations', 'search-items'].includes(action);
  fields(query, paged ? ['limit', 'start', ...(itemQuery ? ['q', 'qmode', 'tag', 'itemKey', 'sort', 'direction'] : []), ...(action === 'citations' ? ['style'] : [])] : []);
  for (const [name, value] of Object.entries(query)) {
    if (name === 'limit') { number(value, 100); if (!value) throw new Error('limit must be 1..100.'); }
    else if (name === 'start') number(value);
    else if (typeof value !== 'string' || !value.trim() || value.length > 512 || /[\x00-\x1f]/.test(value)) throw new Error('Query values must be bounded strings.');
    if (name === 'itemKey') key(value);
    if (name === 'qmode' && !['titleCreatorYear', 'everything'].includes(value)) throw new Error('Unsupported qmode.');
    url.searchParams.set(name, String(value));
  }
  if (action === 'search' && !query.q) throw new Error('Search requires explicit q.');
  if (paged) { if (!url.searchParams.has('limit')) url.searchParams.set('limit', '50'); if (!url.searchParams.has('start')) url.searchParams.set('start', '0'); }
  if (action === 'export-bibtex') url.searchParams.set('format', 'bibtex');
  if (action === 'citations') { url.searchParams.set('include', 'data,citation'); if (!query.style) url.searchParams.set('style', 'apa'); }
  if (request.version !== undefined && (typeof request.version !== 'string' || !/^\d{1,16}$/.test(request.version))) throw new Error('Invalid library version.');
  const result = await exchange(url, { serverId: request.serverId }, options);
  if (request.version !== undefined && result.version !== request.version) throw new Error('Zotero library changed between pages; restart the bounded query.');
  const textMode = ['export-bibtex', 'file-url'].includes(action), data = textMode ? result.text : decode(result);
  if (paged && !textMode && !Array.isArray(data)) throw new Error('Expected Zotero collection JSON.');
  if (action === 'file-url') { let file; try { file = new URL(data.trim()); } catch { throw new Error('Invalid attachment file URL.'); } if (file.protocol !== 'file:' || !['', 'localhost'].includes(file.hostname) || file.username || file.password) throw new Error('Attachment URL is not a local file reference.'); }
  const answer = { data, httpStatus: result.response.status, serverId: result.serverId, version: result.version, write: false, businessVerified: false };
  if (paged) {
    const start = Number(url.searchParams.get('start')), limit = Number(url.searchParams.get('limit')), totalHeader = result.response.headers.get('Total-Results');
    const total = totalHeader !== null && /^\d{1,12}$/.test(totalHeader) ? Number(totalHeader) : null;
    // Rebuild the next request ourselves; never follow provider-supplied links.
    const link = result.response.headers.get('Link') ?? '', hasNext = /;\s*rel="?next"?(?:\s*[,;]|\s*$)/.test(link);
    const nonempty = textMode ? Boolean(data.trim()) : data.length > 0;
    if (!textMode && data.length > limit) throw new Error('Server ignored the bounded page size.');
    const incomplete = hasNext || (total !== null ? start + limit < total : nonempty && (textMode || data.length === limit));
    if (incomplete && !nonempty) throw new Error('Pagination returned an empty page before completion.');
    Object.assign(answer, { incomplete, totalResults: total, ...(incomplete ? { nextRequest: { ...request, query: { ...query, limit, start: number(start + limit) }, ...(result.serverId ? { serverId: pin(result.serverId) } : {}), ...(result.version ? { version: result.version } : {}) } } : {}) });
  }
  return answer;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    let values;
    try { ({ values } = parseArgs({ options: { request: { type: 'string' }, output: { type: 'string' }, apply: { type: 'boolean' }, content: { type: 'boolean' }, help: { type: 'boolean' } }, allowPositionals: false })); } catch { throw new Error('Invalid command; use --help.'); }
    if (values.help) process.stdout.write(`Use --request request.json [--output new-file] [--apply] [--content]. Local 127.0.0.1:23119 only; no credentials or profile edits. Actions: ${actions.join(', ')}.\n`);
    else {
      let fd, request;
      try { fd = openSync(values.request, 'r'); const info = fstatSync(fd); if (!info.isFile() || info.size > 2 * 1024 * 1024) throw new Error(); request = JSON.parse(readFileSync(fd, 'utf8')); } catch { throw new Error('Use a regular request JSON file up to 2 MiB.'); } finally { if (fd !== undefined) closeSync(fd); }
      if (values.output) newFile(values.output);
      const result = JSON.stringify(await executeZotero(request, { apply: values.apply, content: values.content }), null, 2) + '\n';
      if (values.output) { try { writeFileSync(values.output, result, { flag: 'wx', mode: 0o600 }); } catch { throw new Error('Result received but local save failed; inspect any import before retrying.'); } process.stdout.write(JSON.stringify({ output: values.output, businessVerified: false }) + '\n'); }
      else process.stdout.write(result);
    }
  } catch (error) { process.stderr.write((error instanceof Error ? error.message : 'Zotero request failed.') + '\n'); process.exitCode = 1; }
}
