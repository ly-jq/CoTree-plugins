import { createHash } from 'node:crypto';
import { lstatSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { fields, id } from './mail-calendar-common.mjs';
const maximum = 16 * 1024 * 1024;

export async function downloadSharePoint(request, output, { token, fetcher = fetch, signal } = {}) {
  fields(request, ['driveId', 'itemId', 'downloadHost']);
  const url = new URL(`https://graph.microsoft.com/v1.0/drives/${id(request.driveId)}/items/${id(request.itemId)}/content`);
  if (typeof request.downloadHost !== 'string' || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.sharepoint\.com$/.test(request.downloadHost)) throw new Error('Supply the observed tenant download hostname ending in .sharepoint.com.');
  if (typeof output !== 'string' || !output || output.includes('\0')) throw new Error('Supply a new output file.');
  try { lstatSync(output); throw new Error('Output exists.'); } catch (error) { if (error.code !== 'ENOENT') throw new Error('Output already exists or is unavailable.'); }
  if (typeof token !== 'string' || !/^[\x21-\x7e]{8,16384}$/.test(token)) throw new Error('Set COTREE_SHAREPOINT_ACCESS_TOKEN to a bare OAuth token.');
  const deadline = AbortSignal.timeout(20000), combined = signal ? AbortSignal.any([signal, deadline]) : deadline;
  let response;
  try {
    response = await fetcher(url, { headers: { Authorization: `Bearer ${token}` }, redirect: 'manual', signal: combined });
    if (response.status === 302) {
      const location = response.headers.get('location'); await response.body?.cancel();
      if (!location || location.length > 16384) throw new Error();
      const target = new URL(location);
      if (target.protocol !== 'https:' || target.hostname !== request.downloadHost || target.port || target.username || target.password || target.hash) throw new Error();
      // The Location already carries temporary access. Never forward OAuth,
      // cookies or the Graph URL as a Referer, and never follow a second redirect.
      response = await fetcher(target, { headers: {}, redirect: 'error', referrerPolicy: 'no-referrer', signal: combined });
    }
  } catch { throw new Error('Download connection, redirect target or timeout rejected; no download URL or credentials are logged.'); }
  if (response.status !== 200) { await response.body?.cancel(); throw new Error(`Download HTTP ${response.status}; check identity, file access and supported download host.`); }
  if (Number(response.headers.get('content-length')) > maximum) { await response.body?.cancel(); throw new Error('Download exceeds 16 MiB.'); }
  const reader = response.body?.getReader(), chunks = []; let bytes = 0;
  try {
    if (reader) while (true) {
      const item = await reader.read(); if (item.done) break;
      bytes += item.value.byteLength;
      if (bytes > maximum) { await reader.cancel(); throw new Error(); }
      chunks.push(Buffer.from(item.value));
    }
  } catch { throw new Error('Download interrupted or exceeds 16 MiB; no output was written.'); }
  finally { reader?.releaseLock(); }
  const content = Buffer.concat(chunks);
  try { writeFileSync(output, content, { flag: 'wx', mode: 0o600 }); } catch { throw new Error('Download received but saving the new local file failed.'); }
  return { output: path.resolve(output), bytes, sha256: createHash('sha256').update(content).digest('hex'), driveId: request.driveId, itemId: request.itemId, businessVerified: false };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    let values;
    try { ({ values } = parseArgs({ options: { drive: { type: 'string' }, item: { type: 'string' }, 'download-host': { type: 'string' }, output: { type: 'string' }, help: { type: 'boolean' } }, allowPositionals: false })); }
    catch { throw new Error('Invalid options. Use --help.'); }
    if (values.help) process.stdout.write('Use --drive ID --item ID --download-host tenant.sharepoint.com --output new-file. COTREE_SHAREPOINT_ACCESS_TOKEN is read only from the environment. Maximum 16 MiB, no overwrite, one constrained redirect without Bearer.\n');
    else process.stdout.write(JSON.stringify(await downloadSharePoint({ driveId: values.drive, itemId: values.item, downloadHost: values['download-host'] }, values.output, { token: process.env.COTREE_SHAREPOINT_ACCESS_TOKEN })) + '\n');
  } catch (error) { process.stderr.write((error instanceof Error ? error.message : 'Download failed.') + '\n'); process.exitCode = 1; }
}
