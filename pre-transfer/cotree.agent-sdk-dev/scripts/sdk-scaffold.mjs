import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { projectName, readTree, writeNewProject } from './new-project.mjs';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
export function scaffold({ template, name, output }) {
  const catalog = JSON.parse(readFileSync(path.join(root, 'templates/catalog.json'), 'utf8'));
  if (!Object.hasOwn(catalog, template)) throw new Error('Choose a template listed in templates/catalog.json.');
  projectName(name);
  const files = readTree(path.join(root, 'templates', template));
  for (const key of Object.keys(files)) files[key] = files[key].toString('utf8').replaceAll('__APP_NAME__', name);
  return { ...writeNewProject(output, files), template, liveApiCalled: false };
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const { values } = parseArgs({ options: { template: { type: 'string' }, name: { type: 'string' }, output: { type: 'string' } } });
    console.log(JSON.stringify(scaffold(values)));
  } catch (error) { console.error(error instanceof Error ? error.message : 'Scaffold failed.'); process.exitCode = 1; }
}
