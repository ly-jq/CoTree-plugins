import { pathToFileURL } from 'node:url';
import { identifier } from './google-api-common.mjs';
export function parseTarget(input) {
  const url = new URL(input);
  if (url.protocol !== 'https:' || !['docs.google.com', 'drive.google.com'].includes(url.hostname) || url.username || url.password || url.port) throw new Error('Use an HTTPS docs.google.com or drive.google.com file URL.');
  let id, kind, canonical;
  const native = url.pathname.match(/^\/(document|spreadsheets|presentation)\/(?:u\/\d+\/)?d\/([A-Za-z0-9_-]+)(?:\/|$)/);
  const file = url.pathname.match(/^\/file\/(?:u\/\d+\/)?d\/([A-Za-z0-9_-]+)(?:\/|$)/);
  const folder = url.pathname.match(/^\/drive\/(?:u\/\d+\/)?folders\/([A-Za-z0-9_-]+)(?:\/|$)/);
  if (url.hostname === 'docs.google.com' && native && !url.pathname.includes('/d/e/')) { [, kind, id] = native; canonical = `https://docs.google.com/${kind}/d/${id}/edit`; }
  else if (url.hostname === 'drive.google.com' && (file || folder)) { id = (file ?? folder)[1]; kind = file ? 'file' : 'folder'; canonical = file ? `https://drive.google.com/file/d/${id}/view` : `https://drive.google.com/drive/folders/${id}`; }
  else if (url.hostname === 'drive.google.com' && ['/open', '/uc'].includes(url.pathname)) { id = url.searchParams.get('id'); kind = 'file'; canonical = `https://drive.google.com/file/d/${identifier(id)}/view`; }
  else throw new Error('Unsupported or published-to-web URL. Resolve the real editable file using metadata.');
  identifier(id);
  const resourceKey = url.searchParams.get('resourcekey');
  if (resourceKey !== null) { identifier(resourceKey); canonical += `?resourcekey=${encodeURIComponent(resourceKey)}`; }
  return { id, kind, canonicalUrl: canonical, location: { tab: url.searchParams.get('tab'), range: url.searchParams.get('range'), gid: url.searchParams.get('gid'), fragment: url.hash || null }, resourceKey, verifiedByService: false };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { if (process.argv.length !== 3) throw new Error('Supply one file URL.'); process.stdout.write(JSON.stringify(parseTarget(process.argv[2]), null, 2) + '\n'); }
  catch (error) { process.stderr.write(`Google target: ${error.message}\n`); process.exitCode = 1; }
}
