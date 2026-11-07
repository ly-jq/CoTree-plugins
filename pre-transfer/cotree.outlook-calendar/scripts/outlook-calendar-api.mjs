import { pathToFileURL } from 'node:url';
import { apiCli, fields, id, object } from './mail-calendar-common.mjs';
import { me, resource, graphRequest, graphTimes } from './outlook-api-common.mjs';
const calendar = r => r.calendarId === undefined ? `${me}/calendar` : `${me}/calendars/${id(r.calendarId)}`;
const event = r => resource('events', r);
const readQuery = ['$select'];
const windowQuery = ['startDateTime', 'endDateTime', '$top', '$select', '$filter', '$orderby'];
const operations = {
  profile: ['GET', () => me, readQuery],
  'calendars-list': ['GET', () => `${me}/calendars`, ['$top', '$select'], 'list'],
  'calendar-get': ['GET', calendar, readQuery],
  'calendar-view': ['GET', r => `${calendar(r)}/calendarView`, windowQuery, 'list'],
  'event-get': ['GET', event, readQuery],
  'event-instances': ['GET', r => `${event(r)}/instances`, windowQuery, 'list'],
  schedule: ['POST', () => `${me}/calendar/getSchedule`, [], 'read-post'],
  'event-create': ['POST', r => `${calendar(r)}/events`],
  'event-patch': ['PATCH', event],
  'event-cancel': ['POST', r => `${event(r)}/cancel`],
  'event-accept': ['POST', r => `${event(r)}/accept`],
  'event-decline': ['POST', r => `${event(r)}/decline`],
  'event-tentative': ['POST', r => `${event(r)}/tentativelyAccept`]
};
export const actions = Object.keys(operations);
export async function executeOutlookCalendar(request, options = {}) {
  if (!object(request)) throw new Error('Supply a JSON request object.');
  if (['event-create', 'event-patch'].includes(request.action)) {
    if (!object(request.body)) throw new Error('Supply event fields.');
    if (request.action === 'event-create' && (!request.body.start || !request.body.end)) throw new Error('New events need start and end.');
    graphTimes(request.body);
    if (request.body.isAllDay !== undefined && (!request.body.start || !request.body.end)) throw new Error('Changing all-day mode requires both boundaries.');
  }
  if (request.action === 'schedule') {
    fields(request.body, ['schedules', 'startTime', 'endTime', 'availabilityViewInterval']);
    if (!Array.isArray(request.body.schedules) || !request.body.schedules.length || request.body.schedules.length > 20 || request.body.schedules.some(value => typeof value !== 'string' || !/^[^\s@]+@[^\s@]+$/.test(value))) throw new Error('Supply 1..20 SMTP addresses for schedule lookup.');
    graphTimes({ start: request.body.startTime, end: request.body.endTime });
    if (Date.parse(request.body.endTime.dateTime + 'Z') - Date.parse(request.body.startTime.dateTime + 'Z') >= 62 * 86400000) throw new Error('Schedule window must be shorter than 62 days.');
    const step = request.body.availabilityViewInterval;
    if (step !== undefined && (!Number.isInteger(step) || step < 5 || step > 1440)) throw new Error('availabilityViewInterval must be 5..1440 minutes.');
  }
  if (request.action === 'event-cancel') {
    fields(request.body, ['comment']);
    if (request.body.comment !== undefined && typeof request.body.comment !== 'string') throw new Error('Cancellation comment must be text.');
  }
  if (['event-accept', 'event-decline', 'event-tentative'].includes(request.action)) {
    fields(request.body, ['comment', 'sendResponse']);
    if (typeof request.body.sendResponse !== 'boolean') throw new Error('Choose sendResponse explicitly.');
  }
  return graphRequest(request, operations, options);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await apiCli(executeOutlookCalendar, 'COTREE_OUTLOOK_CALENDAR_ACCESS_TOKEN', actions);
