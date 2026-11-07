import { callApi, continuation, fields, headerValue, id, interval, object, params, zone, dateOnly } from './mail-calendar-common.mjs';

export const me = 'https://graph.microsoft.com/v1.0/me';
export const resource = (collection, request) => `${me}/${collection}/${id(request.id)}`;
export const listQuery = ['$top', '$select', '$filter', '$orderby', '$search'];
export function graphTimes(body) {
  if (body.start === undefined && body.end === undefined) return;
  if (!object(body.start) || !object(body.end)) throw new Error('Supply start and end together when changing time.');
  for (const point of [body.start, body.end]) {
    fields(point, ['dateTime', 'timeZone']); zone(point.timeZone);
    if (typeof point.dateTime !== 'string' || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,7})?$/.test(point.dateTime)) throw new Error('Graph body times require local dateTime without an offset plus an explicit timeZone.');
    dateOnly(point.dateTime.slice(0, 10));
  }
  if (body.start.timeZone !== body.end.timeZone) throw new Error('Use one explicit time zone for the start and end pair.');
  if (Date.parse(body.end.dateTime + 'Z') <= Date.parse(body.start.dateTime + 'Z')) throw new Error('End must be after start.');
  if (body.isAllDay === true && [body.start, body.end].some(point => !/T00:00:00(?:\.0+)?$/.test(point.dateTime))) throw new Error('All-day events need midnight boundaries in the same time zone, with an exclusive end.');
}
export async function graphRequest(request, operations, options) {
  fields(request, ['action', 'id', 'calendarId', 'folderId', 'attachmentId', 'query', 'body', 'nextLink', 'timeZone', 'etag']);
  if (!Object.hasOwn(operations, request.action)) throw new Error('Unsupported Outlook action.');
  const [method, endpoint, allowed = [], mode = 'resource'] = operations[request.action];
  let url = new URL(endpoint(request)); params(url, request.query, allowed);
  const paged = mode === 'list', readOnlyPost = mode === 'read-post', write = method !== 'GET' && !readOnlyPost;
  if (paged && !url.searchParams.has('$top')) url.searchParams.set('$top', '50');
  if (['calendar-view', 'event-instances'].includes(request.action)) interval(request.query?.startDateTime, request.query?.endDateTime);
  if (request.nextLink !== undefined) {
    if (!paged || method !== 'GET') throw new Error('nextLink is only valid for paged reads.');
    url = continuation(request.nextLink, url);
  }
  const headers = { Prefer: 'IdType="ImmutableId"' };
  if (request.timeZone !== undefined) headers.Prefer += `, outlook.timezone="${zone(request.timeZone)}"`;
  if (request.etag !== undefined) {
    if (method !== 'PATCH' || request.etag === '*') throw new Error('ETag preconditions are only supported for a targeted patch.');
    headers['If-Match'] = headerValue(request.etag);
  }
  if (method === 'GET' && request.body !== undefined) throw new Error('Read actions do not accept body data.');
  if (mode === 'empty-write') { if (request.body !== undefined) throw new Error('This action requires an empty request body.'); }
  else if (method !== 'GET' && !object(request.body)) throw new Error('Supply the explicit JSON body.');
  const result = await callApi({ url, method, body: request.body, headers, write, paged }, options);
  if (paged && !Array.isArray(result.data?.value)) throw new Error('Expected an Outlook collection.');
  if (result.nextLink) result.nextRequest = { ...request, nextLink: result.nextLink };
  return result;
}
