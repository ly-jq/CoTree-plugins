import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { apiCli, fields, id, object } from './mail-calendar-common.mjs';
import { workplaceRequest } from './workplace-graph-common.mjs';
const site = r => `/sites/${id(r.siteId)}`;
const list = r => `${site(r)}/lists/${id(r.listId)}`;
const listItem = r => `${list(r)}/items/${id(r.itemId)}`;
const drive = r => `/drives/${id(r.driveId)}`;
const driveItem = r => `${drive(r)}/items/${id(r.itemId)}`;
const operations = {
  profile: ['GET', () => '/me', [], ['$select']],
  'site-search': ['GET', () => '/sites', [], ['search', '$select'], true],
  'site-get': ['GET', site, ['siteId'], ['$select']],
  'site-drives': ['GET', r => `${site(r)}/drives`, ['siteId'], ['$select'], true],
  'site-lists': ['GET', r => `${site(r)}/lists`, ['siteId'], ['$select', '$expand'], true],
  'list-columns': ['GET', r => `${list(r)}/columns`, ['siteId', 'listId'], [], true],
  'list-items': ['GET', r => `${list(r)}/items`, ['siteId', 'listId'], ['$top', '$expand', '$filter'], true],
  'list-item': ['GET', listItem, ['siteId', 'listId', 'itemId'], ['$expand']],
  'item-create': ['POST', r => `${list(r)}/items`, ['siteId', 'listId']],
  'item-update': ['PATCH', r => `${listItem(r)}/fields`, ['siteId', 'listId', 'itemId']],
  'drive-children': ['GET', r => `${driveItem(r)}/children`, ['driveId', 'itemId'], ['$top', '$select', '$orderby'], true],
  'drive-root': ['GET', r => `${drive(r)}/root/children`, ['driveId'], ['$top', '$select', '$orderby'], true],
  'drive-item': ['GET', driveItem, ['driveId', 'itemId'], ['$select']],
  pages: ['GET', r => `${site(r)}/pages/microsoft.graph.sitePage`, ['siteId'], ['$top', '$select', '$orderby', '$filter'], true],
  page: ['GET', r => `${site(r)}/pages/${id(r.pageId)}/microsoft.graph.sitePage`, ['siteId', 'pageId'], ['$select', '$expand']],
};
export const actions = Object.keys(operations);
export async function executeSharePoint(request, options = {}) {
  if (!object(request)) throw new Error('Supply a JSON request.');
  if (request.action === 'site-search' && (typeof request.query?.search !== 'string' || !request.query.search.trim() || request.query.search.includes('*'))) throw new Error('Supply explicit site search terms; broad site enumeration is not supported.');
  if (['item-create', 'item-update'].includes(request.action)) {
    if (request.action === 'item-create') fields(request.body, ['fields']);
    const values = request.action === 'item-create' ? request.body.fields : request.body;
    if (!object(values) || !Object.keys(values).length || Object.keys(values).length > 100 || Object.keys(values).some(key => !/^[A-Za-z_][A-Za-z0-9_]{0,127}$/.test(key))) throw new Error('Supply 1..100 observed internal column names and field values.');
  }
  return workplaceRequest(request, operations, options);
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await apiCli(executeSharePoint, 'COTREE_SHAREPOINT_ACCESS_TOKEN', actions);
