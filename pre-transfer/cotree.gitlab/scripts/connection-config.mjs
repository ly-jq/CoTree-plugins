import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

export const gitlabToolsets = ['core', 'work_items', 'merge_requests', 'repository', 'ci', 'wikis'];
export function gitlabConnection(instance = 'https://gitlab.com', toolsets = gitlabToolsets.join(','), legacy = false) {
  if (typeof instance !== 'string' || /[\s\\%?#]/u.test(instance) || /(?:^|\/)\.{1,2}(?:\/|$)/u.test(instance)) throw new Error('Supply a clean HTTPS instance base URL, without credentials, query, fragment, or encoded paths.');
  let url;
  try { url = new URL(instance); } catch { throw new Error('Supply a valid HTTPS instance base URL.'); }
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password || !/^[\w./~-]*$/u.test(url.pathname) || /\/api\/v4(?:\/|$)/u.test(url.pathname)) throw new Error('Supply an HTTPS instance base URL, not an API endpoint or credential URL.');
  if (typeof toolsets !== 'string' || typeof legacy !== 'boolean') throw new Error('Invalid toolset options.');
  const selected = toolsets.split(',').map(value => value.trim());
  if (selected.some(value => !gitlabToolsets.includes(value)) || new Set(selected).size !== selected.length) throw new Error('Supply unique supported collaboration toolsets.');
  url.pathname = url.pathname.replace(/\/+$/u, '') + '/api/v4/mcp';
  return { mcpServers: { 'cotree.gitlab.gitlab': {
    transport: 'streamable-http', url: url.href,
    headersEnv: { Authorization: 'COTREE_GITLAB_MCP_AUTHORIZATION' },
    ...(!legacy ? { headers: { 'X-Gitlab-Enabled-Mcp-Server-Toolsets': selected.join(',') } } : {}),
  } } };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    let values;
    try { ({ values } = parseArgs({ options: { instance: { type: 'string' }, toolsets: { type: 'string' }, legacy: { type: 'boolean', default: false }, help: { type: 'boolean' } }, allowPositionals: false })); }
    catch { throw new Error('Invalid options. Use --help.'); }
    if (values.help) process.stdout.write('Offline only: node connection-config.mjs [--instance https://gitlab.example.com/base] [--toolsets core,work_items] [--legacy]\nGenerates an CoTree MCP override. No credentials, network, OAuth, or writes. Legacy omits toolset filtering; it is not read-only.\n');
    else process.stdout.write(JSON.stringify(gitlabConnection(values.instance, values.toolsets, values.legacy), null, 2) + '\n');
  } catch (error) { process.stderr.write((error instanceof Error ? error.message : 'Configuration failed.') + '\n'); process.exitCode = 1; }
}
