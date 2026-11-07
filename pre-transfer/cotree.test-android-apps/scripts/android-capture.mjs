import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const runFile = promisify(execFile);
const operations = new Set(['screenshot', 'ui', 'gfxinfo', 'meminfo', 'logcat']);
export function planCapture(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) throw new Error('Expected capture options.');
  for (const key of Object.keys(options)) if (!['operation', 'serial', 'package', 'output', 'adb', 'pid'].includes(key)) throw new Error('Unsupported capture option.');
  const { operation, serial, output } = options;
  if (!operations.has(operation)) throw new Error('Choose screenshot, ui, gfxinfo, meminfo or logcat.');
  if (typeof serial !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(serial)) throw new Error('Specify one observed device serial.');
  if (typeof output !== 'string' || !output.trim()) throw new Error('Choose a new output file.');
  const destination = path.resolve(output);
  if (existsSync(destination)) throw new Error('Output already exists.');
  const parent = realpathSync(path.dirname(destination));
  if (!lstatSync(parent).isDirectory()) throw new Error('Output parent must be a directory.');
  let command = options.adb ?? 'adb';
  if (command !== 'adb') {
    if (typeof command !== 'string' || !path.isAbsolute(command) || !lstatSync(command).isFile() || /\.(?:cmd|bat)$/i.test(command)) throw new Error('ADB must be an absolute executable file or adb on PATH.');
    command = realpathSync(command);
  }
  const args = ['-H', '127.0.0.1', '-P', '5037', '-s', serial];
  if (operation === 'gfxinfo' || operation === 'meminfo') {
    if (typeof options.package !== 'string' || !/^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/.test(options.package)) throw new Error('Specify the observed Android package name.');
    args.push('shell', 'dumpsys', operation, options.package);
    if (operation === 'gfxinfo') args.push('framestats');
  } else {
    if (options.package !== undefined) throw new Error('Package is only used by gfxinfo / meminfo.');
    if (operation === 'screenshot') args.push('exec-out', 'screencap', '-p');
    if (operation === 'ui') args.push('exec-out', 'uiautomator', 'dump', '/dev/tty');
    if (operation === 'logcat') {
      if (!Number.isSafeInteger(options.pid) || options.pid < 1) throw new Error('Logcat requires a freshly observed numeric application PID.');
      args.push('logcat', '-d', '-v', 'threadtime', '--pid', String(options.pid), '-t', '500');
    }
  }
  if (operation !== 'logcat' && options.pid !== undefined) throw new Error('PID is only used by logcat.');
  return { command, args, output: path.join(parent, path.basename(destination)), operation, execution: 'not-started', timeoutMs: 30000, maxBytes: 16 * 1024 * 1024 };
}

export async function captureAdb(options, { signal, run = runFile } = {}) {
  signal?.throwIfAborted();
  const plan = planCapture(options);
  const { stdout } = await run(plan.command, plan.args, { encoding: 'buffer', timeout: plan.timeoutMs, maxBuffer: plan.maxBytes, shell: false, windowsHide: true, signal });
  signal?.throwIfAborted();
  const bytes = Buffer.from(stdout);
  if (!bytes.length || bytes.length > plan.maxBytes) throw new Error('Capture is empty or exceeds the output limit.');
  if (plan.operation === 'screenshot' && !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error('Device did not return PNG bytes.');
  if (plan.operation === 'ui' && !bytes.toString('utf8').includes('</hierarchy>')) throw new Error('Device did not return a complete UI hierarchy.');
  // Exclusive creation catches a destination created while ADB was running.
  writeFileSync(plan.output, bytes, { flag: 'wx', mode: 0o600 });
  return { operation: plan.operation, output: plan.output, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), capturedAt: new Date().toISOString(), visualOrBusinessOutcomeVerified: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const options = {}; let execute = false;
  try {
    for (let i = 2; i < process.argv.length; i++) {
      const flag = process.argv[i];
      if (flag === '--execute') { execute = true; continue; }
      if (flag === '--help') { console.log('android-capture.mjs --operation screenshot|ui|gfxinfo|meminfo|logcat --serial SERIAL --output NEW_FILE [--package PACKAGE] [--pid PID] [--adb ABSOLUTE_EXECUTABLE] [--execute]'); process.exit(0); }
      if (!['--operation', '--serial', '--output', '--package', '--pid', '--adb'].includes(flag) || !process.argv[i + 1] || options[flag.slice(2)] !== undefined) throw new Error('Invalid arguments.');
      const value = process.argv[++i]; options[flag.slice(2)] = flag === '--pid' ? Number(value) : value;
    }
    console.log(JSON.stringify(execute ? await captureAdb(options) : planCapture(options), null, 2));
  } catch { console.error('Android capture failed; check arguments, device authorization, output path and ADB availability. No capture was certified.'); process.exitCode = 1; }
}
