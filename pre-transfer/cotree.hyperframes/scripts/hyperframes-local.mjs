import { existsSync, lstatSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { resolveCli } from './inspect-project.mjs';

export function planHyperframes(options) {
  for (const key of Object.keys(options)) if (!['workspace', 'mode', 'output'].includes(key)) throw new Error('Unsupported option.');
  if (!options.workspace || !['lint', 'inspect', 'render'].includes(options.mode)) throw new Error('workspace and mode lint|inspect|render are required.');
  const cwd = path.resolve(options.workspace), cli = resolveCli(cwd, 'hyperframes', 'hyperframes');
  if (cli.version !== '0.8.139') throw new Error('This helper targets HyperFrames 0.8.139. Check installed CLI help before adapting another version.');
  if (!lstatSync(path.join(cwd, 'index.html')).isFile()) throw new Error('index.html is required.');
  const args = [cli.executable, options.mode, cwd];
  let outputDirectory = null, outputFile = null;
  if (options.mode === 'render') {
    if (typeof options.output !== 'string' || !options.output.trim()) throw new Error('Choose a new output directory.');
    outputDirectory = path.resolve(options.output);
    if (existsSync(outputDirectory) || !lstatSync(path.dirname(outputDirectory)).isDirectory()) throw new Error('Output directory must not exist and its parent must exist.');
    outputFile = path.join(outputDirectory, 'video.mp4');
    args.push('--output', outputFile, '--format', 'mp4', '--fps', '24', '--quality', 'draft', '--workers', '1');
  } else { if (options.output) throw new Error('output applies only to render.'); args.push('--json'); }
  return { command: process.execPath, args, cwd, cliVersion: cli.version, outputDirectory, outputFile, execution: 'not-started', env: { HYPERFRAMES_NO_TELEMETRY: '1', DO_NOT_TRACK: '1' } };
}
export async function runHyperframes(options, { signal } = {}) {
  signal?.throwIfAborted();
  const plan = planHyperframes(options);
  if (plan.outputDirectory) mkdirSync(plan.outputDirectory); // Exclusive: a concurrent destination also fails.
  signal?.throwIfAborted();
  const code = await new Promise((resolve, reject) => {
    const child = spawn(plan.command, plan.args, { cwd: plan.cwd, shell: false, windowsHide: true, stdio: 'inherit', signal, env: { ...process.env, ...plan.env } });
    child.once('error', reject); child.once('exit', (code, killedBy) => killedBy ? reject(new Error(`CLI terminated by ${killedBy}.`)) : resolve(code ?? 1));
  });
  if (code !== 0) throw new Error(`HyperFrames exited with code ${code}; inspect the CLI output and any partial artifact.`);
  if (plan.outputFile && (!existsSync(plan.outputFile) || lstatSync(plan.outputFile).size === 0)) throw new Error('CLI exited without a nonempty video artifact.');
  return { ...plan, execution: 'cli-exited-successfully', mediaAndVisualVerificationRequired: true };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const controller = new AbortController(), stop = () => controller.abort();
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
  try {
    const { values } = parseArgs({ options: { workspace: { type: 'string' }, mode: { type: 'string' }, output: { type: 'string' }, execute: { type: 'boolean' }, help: { type: 'boolean' } } });
    const { execute, help, ...options } = values;
    if (help) console.log('hyperframes-local.mjs --workspace PROJECT --mode lint|inspect|render [--output NEW_DIRECTORY] [--execute]. Default: print an argv plan only.');
    else console.log(JSON.stringify(execute ? await runHyperframes(options, { signal: controller.signal }) : planHyperframes(options), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop); }
}
