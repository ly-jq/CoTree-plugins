import { spawn } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { resolveCli } from './inspect-project.mjs';

// A narrow read-only entrypoint. Authoring uses the documented official CLI directly.
const commands = {
  info: [0, []], whoami: [0, []], search: [1, ['team', 'personal', 'limit']],
  'list-projects': [0, ['team', 'personal', 'limit', 'offset']], 'list-components': [1, ['limit', 'after', 'sort-by', 'order', 'created-by']],
  'list-teams': [0, []], 'list-members': [0, ['team']], 'list-themes': [0, ['team']], 'get-theme': [1, ['team']],
  inspect: [1, []], selection: [0, []], 'active-project': [0, []], share: [1, []], 'code-status': [1, []]
};
const id = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,199}$/.test(value);
export function planMagicpath(options) {
  const allowed = new Set(['tooling', 'workspace', 'action', 'value', 'team', 'personal', 'limit', 'offset', 'after', 'sort-by', 'order', 'created-by']);
  if (Object.keys(options).some(key => !allowed.has(key))) throw new Error('Unsupported option.');
  if (!options.tooling || !options.workspace || !Object.hasOwn(commands, options.action)) throw new Error('tooling, workspace and a supported action are required.');
  const [arity, flags] = commands[options.action];
  const extras = Object.keys(options).filter(key => !['tooling', 'workspace', 'action', 'value'].includes(key));
  if (extras.some(key => !flags.includes(key))) throw new Error('Option is not supported by this action.');
  if (arity ? typeof options.value !== 'string' || !options.value.trim() || options.value.startsWith('-') || options.value.length > 500 : options.value !== undefined) throw new Error('Invalid command value.');
  if (options.value && /[\x00-\x1f]/.test(options.value)) throw new Error('Control characters are not accepted.');
  if (['inspect', 'share', 'list-components', 'code-status'].includes(options.action) && !id(options.value)) throw new Error('Use the exact returned identifier.');
  if (options.team && options.personal) throw new Error('Choose a team or personal scope.');
  for (const key of extras) {
    const value = options[key];
    if (key === 'personal') { if (value !== true) throw new Error('personal must be true.'); }
    else if (typeof value !== 'string' || !value.trim() || value.startsWith('-') || value.length > 200 || /[\x00-\x1f]/.test(value)) throw new Error('Invalid option value.');
    if (['limit', 'offset'].includes(key) && (!/^\d+$/.test(value) || Number(value) > 10000 || (key === 'limit' && Number(value) < 1))) throw new Error('Invalid pagination value.');
  }
  if (options['sort-by'] && !['name', 'createdAt'].includes(options['sort-by'])) throw new Error('Invalid sort field.');
  if (options.order && !['asc', 'desc'].includes(options.order)) throw new Error('Invalid sort order.');
  const cli = resolveCli(path.resolve(options.tooling), 'magicpath-ai', 'magicpath-ai');
  if (cli.version !== '2.6.1') throw new Error('This helper targets magicpath-ai 2.6.1.');
  const args = [cli.executable, ...(options.action === 'code-status' ? ['code', 'status'] : [options.action])];
  if (arity) args.push(options.value);
  for (const key of extras) { args.push(`--${key}`); if (key !== 'personal') args.push(options[key]); }
  args.push('-o', 'json');
  return { command: process.execPath, args, cwd: path.resolve(options.workspace), cliVersion: cli.version, execution: 'not-started', mutatesRemote: false, opensBrowser: false };
}
export async function runMagicpath(options, { signal, timeout = 60000 } = {}) {
  signal?.throwIfAborted();
  if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 300000) throw new Error('Invalid timeout.');
  const plan = planMagicpath(options);
  // Avoid accidental inherited alternative endpoints. No credential values are returned in the plan.
  const env = { ...process.env, MAGICPATH_API_URL: 'https://api.magicpath.ai', MAGICPATH_WEB_URL: 'https://www.magicpath.ai' };
  const result = await new Promise((resolve, reject) => {
    const child = spawn(plan.command, plan.args, { cwd: plan.cwd, env, signal, timeout, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', bytes = 0, exceeded = false;
    const capture = (chunk, output) => { bytes += Buffer.byteLength(chunk); if (bytes > 4 * 1024 * 1024) { exceeded = true; child.kill(); } else if (output) stdout += chunk; };
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => capture(chunk, true)); child.stderr.on('data', chunk => capture(chunk, false));
    child.once('error', reject);
    child.once('close', (code, killedBy) => {
      if (exceeded || killedBy || code !== 0) { reject(new Error(`MagicPath did not complete: ${exceeded ? 'output limit' : killedBy ?? `exit ${code}`}. Check independent login and CLI diagnostics.`)); return; }
      try { const data = JSON.parse(stdout); if (!data || typeof data !== 'object' || data.error) throw new Error(); resolve(data); }
      catch { reject(new Error('CLI did not return a successful JSON response.')); }
    });
  });
  return { cliVersion: plan.cliVersion, action: options.action, execution: 'cli-returned-json', result, accountBusinessVerified: false };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const controller = new AbortController(), stop = () => controller.abort();
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
  try {
    const options = Object.fromEntries(['tooling', 'workspace', 'action', 'value', 'team', 'limit', 'offset', 'after', 'sort-by', 'order', 'created-by'].map(key => [key, { type: 'string' }]));
    const { values } = parseArgs({ options: { ...options, personal: { type: 'boolean' }, execute: { type: 'boolean' }, help: { type: 'boolean' } } });
    const { execute, help, ...input } = values;
    if (help) console.log('magicpath-local.mjs --tooling CLI_INSTALL_ROOT --workspace PROJECT --action info|whoami|search|list-projects|list-components|list-teams|list-members|list-themes|get-theme|inspect|selection|active-project|share|code-status [--value VALUE] [--execute]. Default: argv plan only.');
    else console.log(JSON.stringify(execute ? await runMagicpath(input, { signal: controller.signal }) : planMagicpath(input), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop); }
}
