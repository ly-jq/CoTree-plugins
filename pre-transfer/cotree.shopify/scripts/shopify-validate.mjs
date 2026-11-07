import { spawnSync } from 'node:child_process';
import { lstatSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

export const surfaces = Object.freeze(['admin', 'customer', 'partner', 'payments-apps', 'storefront-graphql']);
export function validationCommand(api, file, environment = process.env) {
  if (!surfaces.includes(api)) throw new Error('Choose admin, customer, partner, payments-apps or storefront-graphql.');
  if (typeof file !== 'string' || !file.trim()) throw new Error('Supply a GraphQL file.');
  const input = path.resolve(file), stat = lstatSync(input);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1024 * 1024) throw new Error('Input must be a regular file of at most 1 MiB.');
  const env = { OPT_OUT_INSTRUMENTATION: 'true' };
  for (const key of ['SystemRoot', 'WINDIR', 'ComSpec', 'TEMP', 'TMP', 'TMPDIR']) if (environment[key]) env[key] = environment[key];
  // No NODE_OPTIONS, credentials, staging URLs or instrumentation override are inherited.
  const script = fileURLToPath(new URL(`../references/validators/shopify-${api}/scripts/validate.mjs`, import.meta.url));
  return { command: process.execPath, args: [script, '--file', input, '--json'], env };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const { values } = parseArgs({ options: { api: { type: 'string' }, file: { type: 'string' }, help: { type: 'boolean' } }, allowPositionals: false });
    if (values.help) console.log('node shopify-validate.mjs --api admin --file query.graphql\nOffline snapshot: 2026-04. Does not execute queries or certify store permissions.');
    else {
      const invocation = validationCommand(values.api, values.file);
      const result = spawnSync(invocation.command, invocation.args, { env: invocation.env, timeout: 30000, maxBuffer: 2 * 1024 * 1024, encoding: 'utf8', windowsHide: true });
      if (result.error || result.signal || result.status === null) throw new Error('Validator did not finish; inspect the input and local Node runtime.');
      if (result.stdout) process.stdout.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
      process.exitCode = result.status;
    }
  } catch (error) { console.error(error instanceof Error ? error.message : 'Validation input could not be read.'); process.exitCode = 2; }
}
