import { createHash } from 'node:crypto';
import { lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function portName(value) {
  if (typeof value !== 'string' || !/^(?:COM[1-9]\d*|\/dev\/[A-Za-z0-9._-]+)$/u.test(value)) throw new Error('An explicit local serial port is required; auto and network transports are not accepted');
  return value;
}
function sourceFile(file, firmware = false) {
  if (typeof file !== 'string' || !path.isAbsolute(file)) throw new Error('Source path must be absolute');
  const stat = lstatSync(file); if (!stat.isFile() || stat.isSymbolicLink() || stat.size === 0 || stat.size > (firmware ? 32 * 1024 * 1024 : 256 * 1024)) throw new Error('Expected a bounded, nonempty regular source file');
  const bytes = readFileSync(file); if (!firmware && (!file.endsWith('.py') || bytes.includes(0))) throw new Error('Expected Python source without NUL bytes');
  return { path: realpathSync(file), sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length };
}
export function devicePlan(input) {
  const port = portName(input?.port), operation = input?.operation;
  if (!['list-files', 'push', 'run', 'flash'].includes(operation)) throw new Error('Unsupported device operation');
  const base = ['-m', 'mpremote', 'connect', port]; let argv, source;
  if (operation === 'list-files') argv = [...base, 'fs', 'ls', ':/flash'];
  if (operation === 'push' || operation === 'run') {
    source = sourceFile(input.sourcePath);
    if (operation === 'run') argv = [...base, 'run', source.path];
    else {
      if (typeof input.remotePath !== 'string' || !/^\/flash\/apps\/[A-Za-z][A-Za-z0-9_-]*\.py$/u.test(input.remotePath)) throw new Error('Push target must be a single .py app under /flash/apps; create that directory if needed');
      argv = [...base, 'fs', 'cp', source.path, `:${input.remotePath}`];
    }
  }
  if (operation === 'flash') {
    if (!['cardputer', 'cardputer-adv'].includes(input.variant) || input.firmwareLayout !== 'merged-uiflow2') throw new Error('Select the actual Cardputer variant and a merged UIFlow2 firmware image explicitly');
    source = sourceFile(input.sourcePath, true);
    if (!/^[a-f0-9]{64}$/u.test(input.expectedSha256 ?? '') || source.sha256 !== input.expectedSha256) throw new Error('Firmware digest does not match the independently supplied expected SHA256');
    argv = ['-m', 'esptool', '--chip', 'esp32s3', '--port', port, 'write-flash', '0x0', source.path];
  }
  return { schemaVersion: 1, operation, port, executed: false, ...(source ? { source } : {}), ...(operation === 'flash' ? { variant: input.variant, firmwareLayout: input.firmwareLayout } : {}), argv, next: operation === 'flash' ? 'Confirm the board, firmware provenance/layout and device backup before running; flashing changes device contents. A matching digest alone does not prove board compatibility.' : 'Use the selected Python environment. mpremote may interrupt and soft-reset the running app; verify uploaded bytes or actual device output afterwards.' };
}
export function createProject(directory) {
  const root = path.resolve(directory), parent = path.dirname(root); if (!lstatSync(parent).isDirectory() || lstatSync(parent).isSymbolicLink()) throw new Error('Project parent must be an existing directory');
  mkdirSync(root); // Exclusive: preserve existing projects.
  const files = { 'requirements.txt': 'mpremote==1.29.0\nesptool==5.5.0\n', 'cotree_hello.py': '# Portable MicroPython serial example. No WiFi, BLE, credentials or boot changes.\nimport sys\nprint("Hello from CoTree")\nprint("MicroPython:", sys.implementation.name)\n', 'README.md': '# CoTree Cardputer USB project\n\nUse Python 3.10+ in a dedicated venv and install requirements.txt. Select the physical port explicitly. The example prints to serial; it does not draw on the LCD or implement BLE. Use the plugin app references for M5 display/keyboard code matched to your firmware.\n\nGenerate a device plan with the plugin scripts/maker-project.mjs; inspect it, then use the host execution tool within the authorized task. No install, upload or flash is performed by project creation. A run can soft-reset the board.\n' };
  for (const [name, body] of Object.entries(files)) writeFileSync(path.join(root, name), body, { flag: 'wx' });
  return { root, files: Object.keys(files), executed: false };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const [action, input, output] = process.argv.slice(2);
    if (action === 'create' && input && process.argv.length === 4) console.log(JSON.stringify(createProject(input), null, 2));
    else if (action === 'plan' && input && output && process.argv.length === 5) { const stat = lstatSync(input); if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 65536) throw new Error('Expected bounded JSON input'); const plan = devicePlan(JSON.parse(readFileSync(input, 'utf8'))); writeFileSync(output, JSON.stringify(plan, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ output: path.resolve(output), executed: false })); }
    else throw new Error('Usage: maker-project.mjs create NEW_DIRECTORY | plan input.json output.json');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
