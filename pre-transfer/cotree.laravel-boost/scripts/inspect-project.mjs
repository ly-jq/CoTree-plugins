import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

export function readObject(file) {
  const stat = lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 2 * 1024 * 1024) throw new Error('Expected a regular JSON file of at most 2 MiB.');
  let data;
  try { data = JSON.parse(readFileSync(file, 'utf8')); } catch { throw new Error('Invalid JSON metadata.'); }
  if (!data || Array.isArray(data) || typeof data !== 'object') throw new Error('Expected a JSON object.');
  return data;
}
const range = value => typeof value === 'string' && value.length <= 100 && /^[v0-9xX.*~^<>=| +_-]+$/.test(value) ? value : 'custom-or-unspecified';
export function resolveCli(workspace, packageName, binaryName) {
  const root = path.resolve(workspace), pkg = readObject(path.join(root, 'package.json'));
  const declared = { ...pkg.dependencies, ...pkg.devDependencies };
  if (!Object.hasOwn(declared, packageName)) throw new Error(`Declare ${packageName} in the selected application package first.`);
  const require = createRequire(path.join(root, 'package.json'));
  let metadata;
  try { metadata = require.resolve(`${packageName}/package.json`); }
  catch {
    let directory = path.dirname(require.resolve(packageName));
    while (path.dirname(directory) !== directory) {
      const file = path.join(directory, 'package.json');
      if (existsSync(file) && readObject(file).name === packageName) { metadata = file; break; }
      directory = path.dirname(directory);
    }
  }
  if (!metadata) throw new Error(`Install the declared ${packageName} with the project's package manager.`);
  const installed = readObject(metadata), packageRoot = realpathSync(path.dirname(metadata));
  const bin = typeof installed.bin === 'string' ? installed.bin : installed.bin?.[binaryName];
  if (typeof bin !== 'string' || !bin || path.isAbsolute(bin)) throw new Error('Package CLI entry is missing or invalid.');
  const executable = realpathSync(path.resolve(packageRoot, bin)), relative = path.relative(packageRoot, executable);
  if (relative.startsWith('..') || path.isAbsolute(relative) || !lstatSync(executable).isFile()) throw new Error('Package CLI entry escapes its installed package.');
  return { executable, version: range(installed.version) };
}
export function inspectProject(workspace, kind) {
  if (!['expo', 'remotion', 'laravel'].includes(kind)) throw new Error('kind must be expo, remotion or laravel.');
  const root = path.resolve(workspace), php = kind === 'laravel';
  const manifest = readObject(path.join(root, php ? 'composer.json' : 'package.json'));
  const dependencies = php ? { ...manifest.require, ...manifest['require-dev'] } : { ...manifest.dependencies, ...manifest.devDependencies };
  const selected = php ? ['php', 'laravel/framework', 'laravel/boost', 'laravel/mcp'] : kind === 'expo' ? ['expo', 'expo-router', 'expo-dev-client', 'react', 'react-native', 'react-native-web', '@expo/ui', 'nativewind'] : ['remotion', '@remotion/cli', '@remotion/player', '@remotion/renderer', 'react', 'react-dom', 'mediabunny'];
  const locks = (php ? ['composer.lock'] : ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lock', 'bun.lockb']).filter(name => existsSync(path.join(root, name)));
  const declaredManager = typeof manifest.packageManager === 'string' ? /^(npm|pnpm|yarn|bun)@/.exec(manifest.packageManager)?.[1] : undefined;
  const inspected = {
    kind, workspace: root, declared: Object.fromEntries(selected.filter(name => Object.hasOwn(dependencies, name)).map(name => [name, range(dependencies[name])])),
    scriptNames: Object.keys(manifest.scripts ?? {}).sort(), lockfiles: locks, packageManager: php ? 'composer' : declaredManager ?? null,
    ambiguousPackageManager: !php && locks.length > 1,
    paths: Object.fromEntries((php ? ['artisan', 'vendor/autoload.php', 'bootstrap/app.php', 'boost.json'] : ['app.json', 'app.config.js', 'app.config.ts', 'app', 'src/app', 'ios', 'android', 'eas.json', 'remotion.config.ts']).map(name => [name, existsSync(path.join(root, name))])),
    scriptsExecuted: false, configurationExecuted: false, environmentRead: false, applicationBooted: false
  };
  if (php && existsSync(path.join(root, 'composer.lock'))) {
    const lock = readObject(path.join(root, 'composer.lock'));
    inspected.locked = Object.fromEntries([...(lock.packages ?? []), ...(lock['packages-dev'] ?? [])].filter(item => selected.includes(item.name)).map(item => [item.name, range(item.version)]));
  }
  return inspected;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const { values } = parseArgs({ options: { workspace: { type: 'string' }, kind: { type: 'string' }, help: { type: 'boolean' } } });
    if (values.help) console.log('inspect-project.mjs --workspace application-root --kind expo|remotion|laravel; reads bounded JSON metadata only.');
    else { if (!values.workspace) throw new Error('workspace is required.'); console.log(JSON.stringify(inspectProject(values.workspace, values.kind), null, 2)); }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
