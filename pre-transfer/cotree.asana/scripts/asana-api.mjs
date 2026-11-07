import { pathToFileURL } from 'node:url';
import { identifier, object, queryParams, requestJson, runCli, writeBody } from './project-api-common.mjs';

const routes = {
  me: ['GET', '/users/me'], workspaces: ['GET', '/workspaces', 'page'],
  projects: ['GET', '/workspaces/:id/projects', 'page'], project: ['GET', '/projects/:id'],
  tasks: ['GET', '/projects/:id/tasks', 'page'], task: ['GET', '/tasks/:id'],
  stories: ['GET', '/tasks/:id/stories', 'page'],
  'create-task': ['POST', '/tasks'], 'update-task': ['PUT', '/tasks/:id'], comment: ['POST', '/tasks/:id/stories']
};
export async function asanaRequest({ operation, id, query = {}, body, apply = false, token }, dependencies) {
  if (!Object.hasOwn(routes, operation)) throw new Error('Unsupported Asana operation.');
  const [method, route, paging] = routes[operation];
  const endpoint = route.includes(':id') ? route.replace(':id', identifier(id)) : route;
  if (!route.includes(':id') && id !== undefined) throw new Error('This operation does not accept --id.');
  const params = queryParams(query, ['opt_fields', ...(paging ? ['limit', 'offset'] : []), ...(operation === 'projects' ? ['archived'] : []), ...(operation === 'tasks' ? ['completed_since'] : [])]);
  if (paging) {
    const limit = params.get('limit') ?? '50';
    if (!/^[1-9][0-9]?$|^100$/.test(limit) || params.has('limit[]') || params.has('offset[]')) throw new Error('Use a scalar limit from 1 to 100 and a scalar offset.');
    params.set('limit', limit);
  }
  if (params.has('opt_fields[]')) throw new Error('Use a comma-separated opt_fields string.');
  let payload;
  if (method !== 'GET') {
    const value = writeBody(body, apply);
    if (Object.hasOwn(value, 'data')) throw new Error('Supply unwrapped fields; the Asana data envelope is added automatically.');
    if (operation === 'create-task') {
      if (typeof value.name !== 'string' || !value.name.trim()) throw new Error('Task name is required.');
      if (!value.workspace && !value.parent && !value.projects?.length) throw new Error('Supply a verified workspace, parent or projects target.');
      if (value.workspace) identifier(value.workspace);
      if (value.parent) identifier(value.parent);
      if (value.projects !== undefined) {
        if (!Array.isArray(value.projects) || !value.projects.length) throw new Error('projects must be a non-empty list of GIDs.');
        value.projects.forEach(gid => identifier(gid));
      }
    }
    if (operation === 'comment' && (typeof value.text !== 'string' || !value.text.trim())) throw new Error('Comment text is required.');
    payload = { data: value };
  } else if (body !== undefined || apply) throw new Error('Read operations do not accept a body or --apply.');
  const url = new URL('https://app.asana.com/api/1.0' + endpoint); url.search = params.toString();
  const response = await requestJson(url, { method, token, bearer: true, body: payload }, dependencies);
  if (!Object.hasOwn(response, 'data') || (paging ? !Array.isArray(response.data) : !object(response.data))) throw new Error('Unexpected Asana data envelope; write outcome is unverified.');
  let pagination;
  if (paging) {
    const next = response.next_page;
    if (next !== undefined && next !== null && (!object(next) || typeof next.offset !== 'string' || !next.offset || next.offset.length > 4096)) throw new Error('Invalid Asana next_page.');
    if (next?.offset === params.get('offset')) throw new Error('Asana repeated the current offset.');
    pagination = { mode: 'offset', hasMore: next === undefined ? null : next !== null, ...(next === undefined ? { reason: 'next_page_not_reported' } : {}), ...(next ? { nextQuery: { ...query, limit: Number(params.get('limit')), offset: next.offset } } : {}) };
  }
  return { service: 'asana', operation, readOnly: method === 'GET', data: response.data, ...(pagination ? { pagination } : {}) };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runCli('asana', 'COTREE_ASANA_API_TOKEN', asanaRequest, Object.keys(routes));
