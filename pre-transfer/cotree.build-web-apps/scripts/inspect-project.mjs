import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

export function inspectProject(workspace) {
  if (typeof workspace !== 'string' || !workspace) throw new Error('Choose an existing workspace.');
  const root = realpathSync(workspace);
  if (!lstatSync(root).isDirectory()) throw new Error('Workspace must be a directory.');
  const jsonFile = path.join(root, 'package.json');
  let pkg = {};
  if (existsSync(jsonFile)) {
    const stat = lstatSync(jsonFile);
    if (stat.isSymbolicLink() || !stat.isFile() || stat.size > 1024 * 1024) throw new Error('package.json must be a regular file under 1 MiB.');
    try { pkg = JSON.parse(readFileSync(jsonFile, 'utf8')); } catch { throw new Error('Invalid package.json; contents omitted.'); }
    if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) throw new Error('package.json must be an object.');
  }
  const frameworkNames = ['react', 'react-dom', 'next', 'vite', 'vue', '@sveltejs/kit', 'astro', 'angular', '@angular/core'];
  const dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
  const scriptNames = pkg.scripts && typeof pkg.scripts === 'object' && !Array.isArray(pkg.scripts) ? Object.keys(pkg.scripts).sort() : [];
  const lockfiles = ['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'bun.lock', 'bun.lockb'].filter(file => existsSync(path.join(root, file)));
  return {
    workspace: root, packageFound: existsSync(jsonFile), frameworks: frameworkNames.filter(name => Object.hasOwn(dependencies, name)), scriptNames, lockfiles, ambiguousPackageManager: lockfiles.length > 1,
    surfaces: ['src', 'app', 'pages', 'public', 'index.html', 'tests', 'e2e'].filter(file => existsSync(path.join(root, file))),
    scriptsExecuted: false, environmentRead: false, rendered: false, remoteServicesVerified: false
  };
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    const { values } = parseArgs({ options: { workspace: { type: 'string' } }, allowPositionals: false });
    process.stdout.write(JSON.stringify(inspectProject(values.workspace), null, 2) + '\n');
  } catch (error) { process.stderr.write(`Inspection failed: ${error.message}\n`); process.exitCode = 1; }
}
