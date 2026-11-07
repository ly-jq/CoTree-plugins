import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { readTree, writeNewProject } from './new-project.mjs';

export function createWebhook(output) {
  const files = readTree(fileURLToPath(new URL('../templates/webhook/', import.meta.url)));
  return writeNewProject(output, files);
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const { values } = parseArgs({ options: { output: { type: 'string' }, help: { type: 'boolean' } }, allowPositionals: false });
    if (values.help) console.log('node create-webhook.mjs --output <new-directory>\nThe parent must exist. Does not install dependencies, connect accounts or start a server.');
    else console.log(JSON.stringify(createWebhook(values.output)));
  } catch (error) { console.error(error instanceof Error ? error.message : 'Could not create the webhook project.'); process.exitCode = 1; }
}
