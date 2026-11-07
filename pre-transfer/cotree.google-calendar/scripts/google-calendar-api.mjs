import { pathToFileURL } from 'node:url';
import { apiCli, callApi, fields, headerValue, id, interval, dateOnly, object, params, zone } from './mail-calendar-common.mjs';
const base = 'https://www.googleapis.com/calendar/v3';
const calendar = r => `${base}/calendars/${id(r.calendarId)}`;
const event = r => `${calendar(r)}/events/${id(r.id)}`;
const operations = {
  'calendars-list': ['GET', () => `${base}/users/me/calendarList`, ['maxResults', 'pageToken', 'minAccessRole', 'showHidden']],
  'calendar-get': ['GET', calendar, []],
  'events-list': ['GET', r => `${calendar(r)}/events`, ['timeMin', 'timeMax', 'singleEvents', 'orderBy', 'q', 'showDeleted', 'maxResults', 'pageToken', 'timeZone']],
  'event-get': ['GET', event, ['timeZone']],
  'event-instances': ['GET', r => `${event(r)}/instances`, ['timeMin', 'timeMax', 'maxResults', 'pageToken', 'timeZone', 'showDeleted']],
  freebusy: ['POST', () => `${base}/freeBusy`, []],
  'event-create': ['POST', r => `${calendar(r)}/events`, ['sendUpdates', 'conferenceDataVersion']],
  'event-patch': ['PATCH', event, ['sendUpdates', 'conferenceDataVersion']],
  'event-delete': ['DELETE', event, ['sendUpdates']]
};
function eventTimes(body) {
  if (body.start === undefined && body.end === undefined) return;
  if (!object(body.start) || !object(body.end)) throw new Error('Supply both start and end when changing event time.');
  if (body.start.date !== undefined || body.end.date !== undefined) {
    if (body.start.dateTime !== undefined || body.end.dateTime !== undefined) throw new Error('Do not mix all-day dates and timed events.');
    if (dateOnly(body.end.date) <= dateOnly(body.start.date)) throw new Error('All-day end date is exclusive and must be after start.');
  } else {
    interval(body.start.dateTime, body.end.dateTime);
    for (const time of [body.start, body.end]) if (time.timeZone !== undefined) { zone(time.timeZone); try { new Intl.DateTimeFormat('en', { timeZone: time.timeZone }); } catch { throw new Error('Use a Google-supported IANA time zone.'); } }
  }
  if (body.recurrence && !body.start.date && (!body.start.timeZone || !body.end.timeZone)) throw new Error('Timed recurring events require explicit IANA time zones.');
}
export const actions = Object.keys(operations);
export async function executeGoogleCalendar(request, options = {}) {
  fields(request, ['action', 'calendarId', 'id', 'query', 'body', 'etag']);
  if (!Object.hasOwn(operations, request.action)) throw new Error('Unsupported Google Calendar action.');
  const [method, endpoint, allowed] = operations[request.action], url = new URL(endpoint(request)); params(url, request.query, allowed);
  const list = ['calendars-list', 'events-list', 'event-instances'].includes(request.action), write = method !== 'GET' && request.action !== 'freebusy';
  if (list && !url.searchParams.has('maxResults')) url.searchParams.set('maxResults', '50');
  if (['events-list', 'event-instances'].includes(request.action)) {
    if (request.query?.timeMin === undefined || request.query?.timeMax === undefined) throw new Error('Event reads require an explicit timeMin / timeMax window.');
    interval(request.query.timeMin, request.query.timeMax);
    if (request.action === 'events-list' && request.query?.singleEvents === undefined) url.searchParams.set('singleEvents', 'true');
    if (request.query?.orderBy === 'startTime' && url.searchParams.get('singleEvents') !== 'true') throw new Error('startTime ordering requires singleEvents=true.');
  }
  if (method === 'GET' || method === 'DELETE') { if (request.body !== undefined) throw new Error('This action has no request body.'); }
  else if (!object(request.body)) throw new Error('Supply a JSON body.');
  if (request.action === 'freebusy') {
    fields(request.body, ['timeMin', 'timeMax', 'timeZone', 'items', 'groupExpansionMax', 'calendarExpansionMax']);
    interval(request.body.timeMin, request.body.timeMax);
    if (!Array.isArray(request.body.items) || !request.body.items.length || request.body.items.length > 50) throw new Error('Supply 1..50 calendars for freebusy.');
    for (const item of request.body.items) { fields(item, ['id']); id(item.id); }
  }
  if (request.action === 'event-create' || request.action === 'event-patch') {
    if (request.action === 'event-create' && (!request.body.start || !request.body.end)) throw new Error('New events need start and end.');
    eventTimes(request.body);
  }
  const headers = {};
  if (request.action === 'event-patch' || request.action === 'event-delete') {
    if (!request.etag || request.etag === '*') throw new Error('Read the event and supply its current ETag for patch/delete.');
    headers['If-Match'] = headerValue(request.etag);
  } else if (request.etag !== undefined) throw new Error('ETag precondition applies only to patch/delete.');
  if (write && !['all', 'externalOnly', 'none'].includes(request.query?.sendUpdates)) throw new Error('Choose sendUpdates explicitly: all, externalOnly or none; it is not an authorization flag.');
  const result = await callApi({ url, method, body: request.body, headers, write }, options);
  if (list) {
    if (!Array.isArray(result.data?.items) && result.data?.items !== undefined) throw new Error('Invalid calendar collection.');
    const next = result.data?.nextPageToken;
    if (next !== undefined && (typeof next !== 'string' || !next || next.length > 8192 || next === request.query?.pageToken)) throw new Error('Invalid or repeated Calendar page token.');
    result.incomplete = Boolean(next);
    if (next) result.nextRequest = { ...request, query: { ...request.query, pageToken: next } };
  }
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await apiCli(executeGoogleCalendar, 'COTREE_GOOGLE_CALENDAR_ACCESS_TOKEN', actions);
