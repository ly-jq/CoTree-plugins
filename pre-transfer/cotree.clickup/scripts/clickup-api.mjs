import { pathToFileURL } from 'node:url';
import { identifier, queryParams, requestJson, runCli, writeBody } from './project-api-common.mjs';

const routes = {
  me: ['GET', '/user'], workspaces: ['GET', '/team'], spaces: ['GET', '/team/:id/space'],
  folders: ['GET', '/space/:id/folder'], lists: ['GET', '/folder/:id/list'], 'folderless-lists': ['GET', '/space/:id/list'],
  list: ['GET', '/list/:id'], tasks: ['GET', '/list/:id/task'], task: ['GET', '/task/:id'], comments: ['GET', '/task/:id/comment'],
  'create-task': ['POST', '/list/:id/task'], 'update-task': ['PUT', '/task/:id'], comment: ['POST', '/task/:id/comment']
};
const taskQueries = ['page', 'archived', 'include_closed', 'include_timl', 'subtasks', 'include_markdown_description', 'order_by', 'reverse', 'statuses', 'assignees', 'tags', 'due_date_gt', 'due_date_lt', 'date_created_gt', 'date_created_lt', 'date_updated_gt', 'date_updated_lt'];
export async function clickupRequest({ operation, id, query = {}, body, apply = false, token }, dependencies) {
  if (!Object.hasOwn(routes, operation)) throw new Error('Unsupported ClickUp operation.');
  const [method, route] = routes[operation];
  const endpoint = route.includes(':id') ? route.replace(':id', identifier(id, !route.startsWith('/task/'))) : route;
  if (!route.includes(':id') && id !== undefined) throw new Error('This operation does not accept --id.');
  // Only canonical task IDs are supported here. Custom task IDs must be resolved with their workspace first.
  const params = queryParams(query, operation === 'tasks' ? taskQueries : operation === 'comments' ? ['start', 'start_id'] : ['spaces', 'folders', 'lists', 'folderless-lists'].includes(operation) ? ['archived'] : operation === 'task' ? ['include_markdown_description', 'include_subtasks'] : []);
  for (const key of Object.keys(query)) if (Array.isArray(query[key]) && !['statuses', 'assignees', 'tags'].includes(key)) throw new Error('This query field requires a scalar value.');
  if (operation === 'tasks') {
    const page = params.get('page') ?? '0';
    if (!/^\d{1,6}$/.test(page)) throw new Error('page must be a non-negative integer below one million.');
    params.set('page', page);
  }
  if (operation === 'comments' && (params.has('start') !== params.has('start_id'))) throw new Error('Comment pagination requires both start and start_id.');
  let payload;
  if (method !== 'GET') {
    payload = writeBody(body, apply);
    if (operation === 'create-task' && (typeof payload.name !== 'string' || !payload.name.trim())) throw new Error('Task name is required.');
    if (operation === 'update-task' && Object.hasOwn(payload, 'custom_fields')) throw new Error('Updating custom fields requires the separate field API; do not use task update.');
    if (operation === 'comment' && (typeof payload.comment_text !== 'string' || !payload.comment_text.trim())) throw new Error('comment_text is required.');
  } else if (body !== undefined || apply) throw new Error('Read operations do not accept a body or --apply.');
  const url = new URL('https://api.clickup.com/api/v2' + endpoint); url.search = params.toString();
  const data = await requestJson(url, { method, token, bearer: false, body: payload }, dependencies);
  if (Object.hasOwn(data, 'err') || Object.hasOwn(data, 'ECODE')) throw new Error('ClickUp returned an API error; body omitted and write outcome unverified.');
  let pagination;
  if (operation === 'tasks') {
    if (!Array.isArray(data.tasks) || (data.last_page !== undefined && typeof data.last_page !== 'boolean')) throw new Error('Invalid ClickUp tasks page.');
    const more = data.last_page === undefined ? null : !data.last_page;
    pagination = { mode: 'page', hasMore: more, ...(more === null ? { reason: 'last_page_not_reported' } : {}), ...(more !== false ? { nextQuery: { ...query, page: Number(params.get('page')) + 1 } } : {}) };
  } else if (operation === 'comments') {
    if (!Array.isArray(data.comments)) throw new Error('Invalid ClickUp comments page.');
    const last = data.comments.at(-1);
    if (last && (!/^\d+$/.test(String(last.date)) || !/^\d+$/.test(String(last.id)))) throw new Error('Invalid ClickUp comment cursor.');
    if (last && String(last.date) === params.get('start') && String(last.id) === params.get('start_id')) throw new Error('ClickUp repeated the current comment cursor.');
    // A non-empty page may still be the final page; expose a continuation, never claim full history.
    pagination = { mode: 'comment', hasMore: last ? null : false, ...(last ? { reason: 'continuation_not_probed' } : {}), ...(last ? { nextQuery: { start: String(last.date), start_id: String(last.id) } } : {}) };
  }
  return { service: 'clickup', operation, readOnly: method === 'GET', data, ...(pagination ? { pagination } : {}) };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runCli('clickup', 'COTREE_CLICKUP_API_TOKEN', clickupRequest, Object.keys(routes));
