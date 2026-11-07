import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

// This package retains the upstream US1 endpoint. Other sites must first be
// verified against Datadog's site-specific setup page; do not guess their URL.
export function datadogConnection(auth = 'bearer') {
  if (!['bearer', 'keys'].includes(auth)) throw new Error('Choose bearer or keys authentication.');
  return { mcpServers: { 'cotree.datadog.datadog': {
    transport: 'streamable-http', url: 'https://mcp.datadoghq.com/v1/mcp',
    headersEnv: auth === 'bearer' ? { Authorization: 'COTREE_DATADOG_MCP_AUTHORIZATION' }
      : { DD_API_KEY: 'COTREE_DATADOG_API_KEY', DD_APPLICATION_KEY: 'COTREE_DATADOG_APPLICATION_KEY' },
  } } };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    let values;
    try { ({ values } = parseArgs({ options: { auth: { type: 'string' }, help: { type: 'boolean' } }, allowPositionals: false })); }
    catch { throw new Error('Invalid options. Use --help.'); }
    if (values.help) process.stdout.write('Offline: node connection-config.mjs [--auth bearer|keys]\nUS1 only. Outputs an CoTree same-name override. No credentials, network, OAuth or file writes.\n');
    else process.stdout.write(JSON.stringify(datadogConnection(values.auth), null, 2) + '\n');
  } catch (error) { process.stderr.write((error instanceof Error ? error.message : 'Configuration failed.') + '\n'); process.exitCode = 1; }
}
