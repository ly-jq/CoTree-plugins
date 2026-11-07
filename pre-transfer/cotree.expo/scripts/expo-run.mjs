import { lstatSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { resolveCli } from './inspect-project.mjs';

export function planExpo({ workspace, mode = 'start', network = 'localhost', port = 8081, output }, platform = process.platform) {
  if (!workspace) throw new Error('Select the Expo application root.');
  if (!['start', 'ios', 'android', 'web', 'dev-client', 'export-web'].includes(mode)) throw new Error('Unsupported Expo mode.');
  if (!['localhost', 'lan', 'tunnel'].includes(network)) throw new Error('Unsupported network mode.');
  if (!Number.isInteger(Number(port)) || Number(port) < 1024 || Number(port) > 65535) throw new Error('Port must be 1024..65535.');
  if (mode === 'ios' && platform !== 'darwin') throw new Error('The local iOS simulator requires macOS.');
  if (output && mode !== 'export-web') throw new Error('output is only supported for export-web.');
  const cwd = path.resolve(workspace), cli = resolveCli(cwd, 'expo', 'expo');
  let args;
  if (mode === 'export-web') {
    if (!output || network !== 'localhost') throw new Error('export-web requires a new output directory and no network override.');
    const destination = path.resolve(cwd, output);
    try { lstatSync(destination); throw new Error('Export destination already exists.'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (!lstatSync(path.dirname(destination)).isDirectory()) throw new Error('Export parent must exist.');
    args = [cli.executable, 'export', '--platform', 'web', '--output-dir', destination];
  } else {
    args = [cli.executable, 'start', '--host', network, '--port', String(port)];
    if (mode !== 'start') args.push(`--${mode}`);
  }
  return { command: process.execPath, args, cwd, version: cli.version, execution: 'not-started', dependenciesInstalled: false, cloudBuild: false };
}
export async function executeExpo(plan, { signal } = {}) {
  if (signal?.aborted) throw signal.reason ?? new Error('Cancelled before launch.');
  // Arguments are passed directly; the wrapper never evaluates a shell string.
  const child = spawn(plan.command, plan.args, { cwd: plan.cwd, stdio: 'inherit', shell: false, windowsHide: true, signal });
  const interrupt = () => child.kill('SIGINT'), terminate = () => child.kill('SIGTERM');
  process.on('SIGINT', interrupt); process.on('SIGTERM', terminate);
  try { return await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', (code, stopped) => resolve({ exitCode: code ?? (stopped === 'SIGINT' ? 130 : 143), signal: stopped })); }); }
  finally { process.removeListener('SIGINT', interrupt); process.removeListener('SIGTERM', terminate); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const { values } = parseArgs({ options: { workspace: { type: 'string' }, mode: { type: 'string' }, network: { type: 'string' }, port: { type: 'string' }, output: { type: 'string' }, execute: { type: 'boolean' }, help: { type: 'boolean' } } });
    if (values.help) console.log('expo-run.mjs --workspace app --mode start|ios|android|web|dev-client|export-web [--network localhost|lan|tunnel] [--port 8081] [--output new-directory] [--execute]. Default prints a plan; --execute runs the installed CLI in foreground.');
    else { const plan = planExpo(values); if (values.execute) process.exitCode = (await executeExpo(plan)).exitCode; else console.log(JSON.stringify(plan, null, 2)); }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
