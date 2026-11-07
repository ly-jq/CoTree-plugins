import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { apiCli, callGoogle, identifier, inputObject, object, query } from './google-api-common.mjs';

const drive = 'https://www.googleapis.com/drive/v3';
const file = r => `${drive}/files/${identifier(r.id)}`;
const comment = r => `${file(r)}/comments/${identifier(r.secondaryId)}`;
const shared = ['supportsAllDrives', 'fields'];
const operations = {
  'files-list': ['GET', () => `${drive}/files`, ['q', 'pageSize', 'pageToken', 'orderBy', 'corpora', 'driveId', 'includeItemsFromAllDrives', ...shared]],
  'files-get': ['GET', file, ['acknowledgeAbuse', ...shared]],
  'files-create': ['POST', () => `${drive}/files`, shared],
  'files-update': ['PATCH', file, ['addParents', 'removeParents', ...shared]],
  'files-copy': ['POST', r => `${file(r)}/copy`, shared],
  'files-export': ['GET', r => `${file(r)}/export`, ['mimeType'], true],
  'files-download': ['GET', file, ['acknowledgeAbuse', ...shared], true],
  'permissions-list': ['GET', r => `${file(r)}/permissions`, ['pageSize', 'pageToken', ...shared]],
  'permissions-create': ['POST', r => `${file(r)}/permissions`, ['sendNotificationEmail', 'emailMessage', 'transferOwnership', ...shared]],
  'permissions-delete': ['DELETE', r => `${file(r)}/permissions/${identifier(r.secondaryId)}`, ['supportsAllDrives']],
  'revisions-list': ['GET', r => `${file(r)}/revisions`, ['pageSize', 'pageToken', 'fields']],
  'revisions-get': ['GET', r => `${file(r)}/revisions/${identifier(r.secondaryId)}`, ['fields']],
  'comments-list': ['GET', r => `${file(r)}/comments`, ['pageSize', 'pageToken', 'includeDeleted', 'startModifiedTime', 'fields']],
  'comments-create': ['POST', r => `${file(r)}/comments`, ['fields']],
  'comments-update': ['PATCH', comment, ['fields']],
  'replies-list': ['GET', r => `${comment(r)}/replies`, ['pageSize', 'pageToken', 'includeDeleted', 'fields']],
  'replies-create': ['POST', r => `${comment(r)}/replies`, ['fields']],
  'docs-get': ['GET', r => `https://docs.googleapis.com/v1/documents/${identifier(r.id)}`, ['includeTabsContent', 'suggestionsViewMode', 'fields']],
  'docs-create': ['POST', () => 'https://docs.googleapis.com/v1/documents', ['fields']],
  'docs-batch-update': ['POST', r => `https://docs.googleapis.com/v1/documents/${identifier(r.id)}:batchUpdate`, []],
  'sheets-get': ['GET', r => `https://sheets.googleapis.com/v4/spreadsheets/${identifier(r.id)}`, ['ranges', 'includeGridData', 'fields']],
  'sheets-create': ['POST', () => 'https://sheets.googleapis.com/v4/spreadsheets', ['fields']],
  'sheets-batch-update': ['POST', r => `https://sheets.googleapis.com/v4/spreadsheets/${identifier(r.id)}:batchUpdate`, []],
  'values-get': ['GET', r => `https://sheets.googleapis.com/v4/spreadsheets/${identifier(r.id)}/values/${range(r.range)}`, ['majorDimension', 'valueRenderOption', 'dateTimeRenderOption', 'fields']],
  'values-update': ['PUT', r => `https://sheets.googleapis.com/v4/spreadsheets/${identifier(r.id)}/values/${range(r.range)}`, ['valueInputOption', 'includeValuesInResponse', 'responseValueRenderOption', 'responseDateTimeRenderOption']],
  'values-batch-update': ['POST', r => `https://sheets.googleapis.com/v4/spreadsheets/${identifier(r.id)}/values:batchUpdate`, []],
  'slides-get': ['GET', r => `https://slides.googleapis.com/v1/presentations/${identifier(r.id)}`, ['fields']],
  'slides-create': ['POST', () => 'https://slides.googleapis.com/v1/presentations', ['fields']],
  'slides-batch-update': ['POST', r => `https://slides.googleapis.com/v1/presentations/${identifier(r.id)}:batchUpdate`, []],
  'slides-thumbnail': ['GET', r => `https://slides.googleapis.com/v1/presentations/${identifier(r.id)}/pages/${identifier(r.secondaryId)}/thumbnail`, ['thumbnailProperties.mimeType', 'thumbnailProperties.thumbnailSize']]
};
function range(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 1024 || /[\x00-\x1f]/.test(value)) throw new Error('Supply a bounded A1 range using the observed sheet name.');
  return encodeURIComponent(value);
}
export const actions = [...Object.keys(operations), 'files-import'];
export async function executeDrive(request, options = {}) {
  inputObject(request, ['action', 'id', 'secondaryId', 'range', 'query', 'body', 'resourceKey']);
  const operation = operations[request.action];
  if (!operation && request.action !== 'files-import') throw new Error('Unsupported Drive action.');
  if (options.upload && request.action !== 'files-import') throw new Error('Upload is only valid for files-import.');
  let [method, endpoint, allowed, binary] = operation ?? ['POST', () => 'https://www.googleapis.com/upload/drive/v3/files', shared, false];
  const url = new URL(endpoint(request)); query(url, request.query, allowed);
  let body = request.body, contentType;
  if (method === 'GET' && body !== undefined) throw new Error('Read actions do not accept a body.');
  if (['POST', 'PATCH', 'PUT'].includes(method) && !object(body)) throw new Error('This action requires an explicit JSON body.');
  if (request.action.endsWith('-batch-update') && request.action !== 'values-batch-update') {
    if (!Array.isArray(body.requests) || !body.requests.length || body.requests.length > 100) throw new Error('Use 1..100 batch requests.');
    if (['docs-batch-update', 'slides-batch-update'].includes(request.action) && !body.writeControl?.requiredRevisionId) throw new Error('Read the current revision and supply writeControl.requiredRevisionId.');
  }
  if (request.action === 'docs-get' && !url.searchParams.has('includeTabsContent')) url.searchParams.set('includeTabsContent', 'true');
  if (request.action === 'values-update' && !url.searchParams.has('valueInputOption')) url.searchParams.set('valueInputOption', 'RAW');
  if (request.action === 'values-batch-update' && (!['RAW', 'USER_ENTERED'].includes(body.valueInputOption) || !Array.isArray(body.data) || !body.data.length || body.data.length > 100)) throw new Error('Supply valueInputOption and 1..100 explicit ranges.');
  if (request.action === 'files-export' && !url.searchParams.get('mimeType')) throw new Error('Export requires a MIME type from file metadata/export formats.');
  if (request.action === 'files-download') url.searchParams.set('alt', 'media');
  if ((request.action.startsWith('comments-') || request.action.startsWith('replies-')) && !url.searchParams.get('fields')) throw new Error('Comments/replies require an explicit fields projection.');
  if (request.action === 'files-import') {
    const upload = options.upload;
    if (!upload || !Buffer.isBuffer(upload.bytes) || upload.bytes.length > 10 * 1024 * 1024 || !/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(upload.mimeType)) throw new Error('Supply an explicit supported local upload, at most 10 MiB.');
    if (!['application/vnd.google-apps.document', 'application/vnd.google-apps.spreadsheet', 'application/vnd.google-apps.presentation'].includes(body.mimeType)) throw new Error('Import requires the target native Google MIME type.');
    const boundary = `cotree_${randomBytes(18).toString('hex')}`;
    contentType = `multipart/related; boundary=${boundary}`; url.searchParams.set('uploadType', 'multipart');
    body = Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(body)}\r\n--${boundary}\r\nContent-Type: ${upload.mimeType}\r\n\r\n`), upload.bytes, Buffer.from(`\r\n--${boundary}--\r\n`)]);
  }
  const headers = {};
  if (request.resourceKey !== undefined) { headers['X-Goog-Drive-Resource-Keys'] = `${identifier(request.id)}/${identifier(request.resourceKey)}`; }
  return callGoogle({ url, method, body, binary, contentType, headers }, options);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) apiCli(executeDrive, 'COTREE_GOOGLE_DRIVE_ACCESS_TOKEN', actions, {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', odt: 'application/vnd.oasis.opendocument.text',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ods: 'application/vnd.oasis.opendocument.spreadsheet', csv: 'text/csv', tsv: 'text/tab-separated-values',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', odp: 'application/vnd.oasis.opendocument.presentation'
}).catch(error => { process.stderr.write(`Drive API: ${error.message}\n`); process.exitCode = 1; });
