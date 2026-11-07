import { realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

export function terraformConnection({ binary, cloud = false, address = 'https://app.terraform.io' } = {}) {
  if (typeof cloud !== 'boolean') throw new Error('cloud must be boolean.');
  if (typeof address !== 'string' || /[\s\\%?#]/u.test(address) || /(?:^|\/)\.{1,2}(?:\/|$)/u.test(address)) throw new Error('Use a clean HTTPS Terraform instance origin.');
  let url;
  try { url = new URL(address); } catch { throw new Error('Use a valid HTTPS Terraform instance origin.'); }
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password || url.pathname !== '/') throw new Error('Use an HTTPS origin without credentials, paths, query or fragment.');
  if (!cloud && url.origin !== 'https://app.terraform.io') throw new Error('A custom instance requires --cloud.');
  let command = 'docker';
  if (binary !== undefined) {
    if (typeof binary !== 'string' || !path.isAbsolute(binary) || binary.includes('\0')) throw new Error('Supply an absolute path to the verified 0.4.0 binary.');
    try { command = realpathSync(binary); if (!statSync(command).isFile()) throw new Error(); }
    catch { throw new Error('Binary must be an existing regular file.'); }
  }
  const toolsets = cloud ? 'registry,registry-private,terraform' : 'registry';
  // SDK stdio does not inherit arbitrary credentials; resolve only this binding.
  const env = cloud ? { TFE_TOKEN: '${COTREE_TERRAFORM_TFE_TOKEN}', TFE_ADDRESS: url.origin } : {};
  const args = binary !== undefined ? ['stdio', '--toolsets=' + toolsets]
    : ['run', '-i', '--rm', ...(cloud ? ['-e', 'TFE_TOKEN', '-e', 'TFE_ADDRESS'] : []), 'hashicorp/terraform-mcp-server:0.4.0', 'stdio', '--toolsets=' + toolsets];
  return { mcpServers: { 'cotree.terraform.terraform': { transport: 'stdio', command, args, env, cwd: '.', cwdBase: 'workspace' } } };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    let values;
    try { ({ values } = parseArgs({ options: { binary: { type: 'string' }, cloud: { type: 'boolean', default: false }, address: { type: 'string' }, help: { type: 'boolean' } }, allowPositionals: false })); }
    catch { throw new Error('Invalid options. Use --help.'); }
    if (values.help) process.stdout.write('Offline: node connection-config.mjs [--binary <absolute-0.4.0-binary>] [--cloud [--address https://terraform.example.com]]\nDefaults to public registry tools. Cloud tools can write; token is an env reference, never an argument. Does not verify binary contents, read credentials, connect, or write config.\n');
    else process.stdout.write(JSON.stringify(terraformConnection(values), null, 2) + '\n');
  } catch (error) { process.stderr.write((error instanceof Error ? error.message : 'Configuration failed.') + '\n'); process.exitCode = 1; }
}
