import { pathToFileURL } from 'node:url';
import { apiCli, callGoogle, identifier, inputObject, object, query } from './google-api-common.mjs';
const base = 'https://gmail.googleapis.com/gmail/v1/users/me';
const message = r => `${base}/messages/${identifier(r.id)}`;
const draft = r => `${base}/drafts/${identifier(r.id)}`;
const operations = {
  profile: ['GET', () => `${base}/profile`, []],
  'messages-list': ['GET', () => `${base}/messages`, ['q', 'maxResults', 'pageToken', 'labelIds', 'includeSpamTrash', 'fields']],
  'message-get': ['GET', message, ['format', 'metadataHeaders', 'fields']],
  'threads-list': ['GET', () => `${base}/threads`, ['q', 'maxResults', 'pageToken', 'labelIds', 'includeSpamTrash', 'fields']],
  'thread-get': ['GET', r => `${base}/threads/${identifier(r.id)}`, ['format', 'metadataHeaders', 'fields']],
  'attachment-get': ['GET', r => `${message(r)}/attachments/${identifier(r.secondaryId)}`, []],
  'labels-list': ['GET', () => `${base}/labels`, ['fields']],
  'labels-create': ['POST', () => `${base}/labels`, []],
  'message-modify': ['POST', r => `${message(r)}/modify`, []],
  'message-trash': ['POST', r => `${message(r)}/trash`, []],
  'message-untrash': ['POST', r => `${message(r)}/untrash`, []],
  'drafts-list': ['GET', () => `${base}/drafts`, ['q', 'maxResults', 'pageToken', 'includeSpamTrash', 'fields']],
  'draft-get': ['GET', draft, ['format', 'fields']],
  'draft-create': ['POST', () => `${base}/drafts`, []],
  'draft-update': ['PUT', draft, []],
  'draft-send': ['POST', () => `${base}/drafts/send`, []],
  'message-send': ['POST', () => `${base}/messages/send`, []]
};
export const actions = Object.keys(operations);
export async function executeGmail(request, options = {}) {
  inputObject(request, ['action', 'id', 'secondaryId', 'query', 'body']);
  const operation = operations[request.action]; if (!operation) throw new Error('Unsupported Gmail action.');
  const [method, endpoint, allowed] = operation, url = new URL(endpoint(request)); query(url, request.query, allowed);
  if (method === 'GET' && request.body !== undefined) throw new Error('Read actions do not accept a body.');
  if (method !== 'GET' && !object(request.body)) throw new Error('Supply the explicit write body (or {} for trash/untrash).');
  if (request.action === 'draft-send') identifier(request.body.id);
  if (['message-send', 'draft-create', 'draft-update'].includes(request.action)) {
    const resource = request.action === 'message-send' ? request.body : request.body.message;
    if (!object(resource) || typeof resource.raw !== 'string' || !/^[A-Za-z0-9_-]+={0,2}$/.test(resource.raw)) throw new Error('Supply an RFC 2822 message encoded as base64url.');
    if (resource.threadId !== undefined) identifier(resource.threadId);
  }
  const result = await callGoogle({ url, method, body: request.body }, options);
  if (request.action === 'attachment-get') {
    if (typeof result.data?.data !== 'string' || !/^[A-Za-z0-9_-]*={0,2}$/.test(result.data.data)) throw new Error('Invalid attachment data.');
    const bytes = Buffer.from(result.data.data, 'base64url');
    if (!Number.isInteger(result.data.size) || result.data.size !== bytes.length) throw new Error('Attachment length does not match the service response.');
    return { bytes, serviceAccepted: true, businessVerified: false };
  }
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) apiCli(executeGmail, 'COTREE_GMAIL_ACCESS_TOKEN', actions)
  .catch(error => { process.stderr.write(`Gmail API: ${error.message}\n`); process.exitCode = 1; });
