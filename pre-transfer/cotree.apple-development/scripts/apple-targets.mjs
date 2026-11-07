import { lstatSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu;
const text = (value, field) => { if (typeof value !== 'string' || !value.trim() || value.length > 1024 || /[\x00-\x1f\x7f]/u.test(value)) throw new Error(`Invalid ${field}`); return value; };
export function selectSimulator(document, udid) {
  if (!uuid.test(udid)) throw new Error('An explicit Simulator UDID is required');
  if (!document?.devices || typeof document.devices !== 'object' || Array.isArray(document.devices)) throw new Error('Missing simctl devices evidence');
  const matches = [];
  for (const [runtime, devices] of Object.entries(document.devices)) {
    if (!Array.isArray(devices)) throw new Error('Invalid simctl runtime devices');
    for (const device of devices) if (device?.udid?.toLowerCase() === udid.toLowerCase()) matches.push({ ...device, runtime });
  }
  if (matches.length !== 1) throw new Error(`Expected one matching Simulator; observed ${matches.length}`);
  const device = matches[0];
  if (device.isAvailable !== true) throw new Error('Simulator availability is absent or false; install the selected runtime and refresh simctl evidence');
  return { udid: device.udid, name: text(device.name, 'device name'), runtime: text(device.runtime, 'runtime'), state: text(device.state, 'device state'), evidence: 'supplied-simctl-json', liveVerified: false };
}
export function buildPlan(input) {
  const project = text(input?.projectPath, 'projectPath'), derived = text(input?.derivedDataPath, 'derivedDataPath');
  if (!path.isAbsolute(project) || !path.isAbsolute(derived)) throw new Error('Project and derived data paths must be absolute');
  const extension = path.extname(project);
  if (!['.xcodeproj', '.xcworkspace'].includes(extension) || !lstatSync(project).isDirectory() || lstatSync(project).isSymbolicLink()) throw new Error('An existing Xcode project/workspace directory is required');
  const scheme = text(input.scheme, 'scheme');
  if (!uuid.test(input.simulatorUDID)) throw new Error('An explicit Simulator UDID is required');
  const rel = path.relative(project, derived);
  if (!rel || (!rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel))) throw new Error('Derived data must be outside the project bundle');
  const base = [extension === '.xcworkspace' ? '-workspace' : '-project', project, '-scheme', scheme, '-destination', `platform=iOS Simulator,id=${input.simulatorUDID}`, '-derivedDataPath', derived];
  return { schemaVersion: 1, platformRequired: 'darwin', executed: false, commands: { build: ['xcodebuild', ...base, 'build'], test: ['xcodebuild', ...base, 'test'] }, limitations: ['The supplied scheme and Simulator have not been checked on macOS.', 'A process exit alone does not prove launch, rendering or test coverage.'] };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const [action, file, target] = process.argv.slice(2);
    if (!['select', 'plan'].includes(action) || !file || !target || process.argv.length !== 5) throw new Error('Usage: apple-targets.mjs select simctl.json UDID | plan input.json output.json');
    const stat = lstatSync(file); if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 2 * 1024 * 1024) throw new Error('Expected a bounded regular JSON file');
    const input = JSON.parse(readFileSync(file, 'utf8'));
    if (action === 'select') console.log(JSON.stringify(selectSimulator(input, target), null, 2));
    else { writeFileSync(target, JSON.stringify(buildPlan(input), null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ output: path.resolve(target), executed: false })); }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
