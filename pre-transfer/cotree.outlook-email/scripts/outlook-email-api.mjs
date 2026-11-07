import { pathToFileURL } from 'node:url';
import { apiCli, fields, id, object } from './mail-calendar-common.mjs';
import { me, resource, graphRequest, listQuery } from './outlook-api-common.mjs';
const message = r => resource('messages', r);
const folder = r => `${me}/mailFolders/${id(r.folderId)}`;
const operations = {
  profile: ['GET', () => me, ['$select']],
  'folders-list': ['GET', () => `${me}/mailFolders`, ['$top', '$select', 'includeHiddenFolders'], 'list'],
  'child-folders': ['GET', r => `${folder(r)}/childFolders`, ['$top', '$select', 'includeHiddenFolders'], 'list'],
  'messages-list': ['GET', r => r.folderId === undefined ? `${me}/messages` : `${folder(r)}/messages`, listQuery, 'list'],
  'message-get': ['GET', message, ['$select', '$expand']],
  'attachments-list': ['GET', r => `${message(r)}/attachments`, ['$top', '$select'], 'list'],
  'attachment-get': ['GET', r => `${message(r)}/attachments/${id(r.attachmentId)}`, ['$select']],
  'draft-create': ['POST', () => `${me}/messages`],
  'reply-draft': ['POST', r => `${message(r)}/createReply`],
  'reply-all-draft': ['POST', r => `${message(r)}/createReplyAll`],
  'forward-draft': ['POST', r => `${message(r)}/createForward`],
  'message-patch': ['PATCH', message],
  'draft-send': ['POST', r => `${message(r)}/send`, [], 'empty-write'],
  'message-move': ['POST', r => `${message(r)}/move`]
};
export const actions = Object.keys(operations);
export async function executeOutlookEmail(request, options = {}) {
  if (!object(request)) throw new Error('Supply a JSON request object.');
  if (request.action === 'message-move') {
    fields(request.body, ['destinationId']); id(request.body.destinationId);
  }
  if (request.action === 'draft-create' || request.action === 'message-patch') {
    fields(request.body, ['subject', 'body', 'toRecipients', 'ccRecipients', 'bccRecipients', 'replyTo', 'importance', 'categories', 'isRead', 'flag']);
    for (const key of ['toRecipients', 'ccRecipients', 'bccRecipients', 'replyTo']) if (request.body[key] !== undefined) {
      if (!Array.isArray(request.body[key]) || request.body[key].length > 100) throw new Error('Recipients must be an array of at most 100 addresses.');
      for (const recipient of request.body[key]) if (!object(recipient?.emailAddress) || typeof recipient.emailAddress.address !== 'string' || !/^[^\s@<>]+@[^\s@<>]+$/.test(recipient.emailAddress.address)) throw new Error('Use explicit emailAddress recipients.');
    }
    if (request.body.body !== undefined && (!object(request.body.body) || !['Text', 'HTML'].includes(request.body.body.contentType) || typeof request.body.body.content !== 'string')) throw new Error('Use a Text or HTML message body.');
  }
  if (['reply-draft', 'reply-all-draft', 'forward-draft'].includes(request.action)) {
    // Create the server-generated draft first, then inspect and patch its recipients / body.
    fields(request.body, []);
  }
  return graphRequest(request, operations, options);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await apiCli(executeOutlookEmail, 'COTREE_OUTLOOK_EMAIL_ACCESS_TOKEN', actions);
