import { realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

// Matches the pinned firebase-tools 15.32.1 MCP entrypoint, not the generic CLI.
export const firebaseVersion = '15.32.1';
export const firebaseFeatures = ['core', 'firestore', 'storage', 'dataconnect', 'auth', 'messaging', 'functions', 'remoteconfig', 'crashlytics', 'apptesting', 'apphosting', 'database', 'developerknowledge'];
export function firebaseConnection(projectDirectory, only = 'auth,firestore,storage') {
  if (typeof projectDirectory !== 'string' || !path.isAbsolute(projectDirectory) || /[\x00-\x1f]/u.test(projectDirectory)) throw new Error('Supply an absolute project directory containing firebase.json.');
  let directory;
  try {
    directory = realpathSync(projectDirectory);
    if (!statSync(directory).isDirectory() || !statSync(path.join(directory, 'firebase.json')).isFile()) throw new Error();
  } catch { throw new Error('Project directory must exist and contain firebase.json; this script does not initialize it.'); }
  if (typeof only !== 'string') throw new Error('Feature groups must be comma separated.');
  const features = only.split(',').map(value => value.trim());
  if (!features.length || features.some(value => !firebaseFeatures.includes(value)) || new Set(features).size !== features.length) throw new Error('Supply unique supported feature groups; invalid groups can silently widen upstream discovery.');
  return { mcpServers: { 'cotree.firebase.firebase': {
    transport: 'stdio', command: 'npx', args: ['-y', `firebase-tools@${firebaseVersion}`, 'mcp', '--dir', directory, '--only', features.join(',')], cwd: directory,
  } } };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    let values;
    try { ({ values } = parseArgs({ options: { 'project-dir': { type: 'string' }, only: { type: 'string' }, help: { type: 'boolean' } }, allowPositionals: false })); }
    catch { throw new Error('Invalid options. Use --help.'); }
    if (values.help) process.stdout.write('Offline only: node connection-config.mjs --project-dir <absolute directory with firebase.json> [--only auth,firestore,storage]\nGenerates an CoTree MCP override. No credentials, login, network, writes, or --project flag.\nFeatures: ' + firebaseFeatures.join(',') + '\n');
    else process.stdout.write(JSON.stringify(firebaseConnection(values['project-dir'], values.only), null, 2) + '\n');
  } catch (error) { process.stderr.write((error instanceof Error ? error.message : 'Configuration failed.') + '\n'); process.exitCode = 1; }
}
