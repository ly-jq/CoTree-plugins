import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { apiCli, fields, id, object } from './mail-calendar-common.mjs';
import { workplaceRequest } from './workplace-graph-common.mjs';
const chat = r => `/chats/${id(r.chatId)}`;
const channel = r => `/teams/${id(r.teamId)}/channels/${id(r.channelId)}`;
const thread = r => `${channel(r)}/messages/${id(r.messageId)}`;
const operations = {
  profile: ['GET', () => '/me', [], ['$select']],
  'joined-teams': ['GET', () => '/me/joinedTeams', [], [], true],
  channels: ['GET', r => `/teams/${id(r.teamId)}/channels`, ['teamId'], ['$select', '$filter'], true],
  chats: ['GET', () => '/me/chats', [], ['$top', '$orderby'], true],
  'chat-members': ['GET', r => `${chat(r)}/members`, ['chatId'], [], true],
  'chat-messages': ['GET', r => `${chat(r)}/messages`, ['chatId'], ['$top', '$orderby', '$filter'], true],
  'chat-message': ['GET', r => `${chat(r)}/messages/${id(r.messageId)}`, ['chatId', 'messageId']],
  'channel-messages': ['GET', r => `${channel(r)}/messages`, ['teamId', 'channelId'], ['$top'], true],
  'channel-message': ['GET', thread, ['teamId', 'channelId', 'messageId']],
  'channel-replies': ['GET', r => `${thread(r)}/replies`, ['teamId', 'channelId', 'messageId'], ['$top'], true],
  'channel-files': ['GET', r => `${channel(r)}/filesFolder`, ['teamId', 'channelId']],
  'chat-send': ['POST', r => `${chat(r)}/messages`, ['chatId']],
  'channel-send': ['POST', r => `${channel(r)}/messages`, ['teamId', 'channelId']],
  'channel-reply': ['POST', r => `${thread(r)}/replies`, ['teamId', 'channelId', 'messageId']],
};
export const actions = Object.keys(operations);
export async function executeTeams(request, options = {}) {
  if (!object(request)) throw new Error('Supply a JSON request.');
  if (['chat-send', 'channel-send', 'channel-reply'].includes(request.action)) {
    fields(request.body, ['body']); fields(request.body.body, ['contentType', 'content']);
    const body = request.body.body;
    if (body.contentType !== 'text' || typeof body.content !== 'string' || !body.content.trim() || body.content.length > 16000) throw new Error('Supply a non-empty plain text body of at most 16000 characters. HTML, mentions and attachments need a separate reviewed implementation.');
  }
  return workplaceRequest(request, operations, options);
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await apiCli(executeTeams, 'COTREE_TEAMS_ACCESS_TOKEN', actions);
