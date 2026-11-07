import { callApi, continuation, fields, headerValue, id, params } from './mail-calendar-common.mjs';

export const graph = 'https://graph.microsoft.com/v1.0';
export async function workplaceRequest(request, operations, options = {}) {
  if (!request || !Object.hasOwn(operations, request.action)) throw new Error('Unsupported workplace action.');
  const [method, endpoint, ids = [], query = [], paged = false] = operations[request.action];
  const write = method !== 'GET';
  fields(request, ['action', ...ids, 'query', ...(paged ? ['nextLink'] : []), ...(write ? ['body'] : []), ...(method === 'PATCH' ? ['etag'] : [])]);
  for (const key of ids) id(request[key]);
  let url = new URL(graph + endpoint(request)); params(url, request.query, query);
  if (query.includes('$top') && !url.searchParams.has('$top')) url.searchParams.set('$top', '50');
  if (Number(url.searchParams.get('$top')) > 50) throw new Error('Workplace page size must be 1..50.');
  if (request.nextLink !== undefined) url = continuation(request.nextLink, url);
  const headers = {};
  if (method === 'PATCH') {
    if (request.etag === '*') throw new Error('Use the current concrete ETag for a patch.');
    headers['If-Match'] = headerValue(request.etag);
  }
  const result = await callApi({ url, method, body: request.body, headers, write, paged }, options);
  if (paged && !Array.isArray(result.data?.value)) throw new Error('Expected a Graph collection.');
  // Preauthenticated file URLs are capabilities, not useful summary metadata.
  function redactCapabilities(value) {
    if (value && typeof value === 'object') for (const key of Object.keys(value)) {
      if (key === '@microsoft.graph.downloadUrl') delete value[key]; else redactCapabilities(value[key]);
    }
  }
  redactCapabilities(result.data);
  if (result.nextLink) result.nextRequest = { ...request, nextLink: result.nextLink };
  return result;
}
