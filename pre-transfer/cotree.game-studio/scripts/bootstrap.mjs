import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { projectName, readTree, writeNewProject } from './new-project.mjs';

export function bootstrap(output, name) {
  const validName = projectName(name);
  const files = readTree(fileURLToPath(new URL('../template/', import.meta.url)));
  if (files['package.json']) {
    const pkg = JSON.parse(files['package.json'].toString('utf8'));
    files['package.json'] = JSON.stringify({ ...pkg, name: validName }, null, 2) + '\n';
  }
  return { ...writeNewProject(output, files), name: validName, hostConfigurationChanged: false };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const { values } = parseArgs({ options: { output: { type: 'string' }, name: { type: 'string' }, help: { type: 'boolean' } } });
    if (values.help) console.log('bootstrap.mjs --output NEW_DIRECTORY --name project-name; creates files only, no installation or host configuration.');
    else console.log(JSON.stringify(bootstrap(values.output, values.name), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
