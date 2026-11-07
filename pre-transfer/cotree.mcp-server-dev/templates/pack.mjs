import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { build } from 'esbuild';
import { projectName, writeNewProject } from './new-project.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const { values } = parseArgs({ options: { output: { type: 'string', default: path.join(root, 'packed-plugin') } }, allowPositionals: false });
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')), name = projectName(pkg.name);
if (existsSync(path.resolve(values.output))) throw new Error('Choose a new output directory; existing data is preserved.');
const bundled = await build({ absWorkingDir: root, entryPoints: ['server.mjs'], bundle: true, platform: 'node', target: 'node20', format: 'esm', write: false, metafile: true, legalComments: 'inline', banner: { js: "import { createRequire as __cotreeCreateRequire } from 'node:module'; const require = __cotreeCreateRequire(import.meta.url);" } });
const licenses = new Map();
for (const input of Object.keys(bundled.metafile.inputs)) {
  let folder = path.dirname(path.resolve(root, input));
  while (path.dirname(folder) !== folder) {
    if (existsSync(path.join(folder, 'package.json'))) {
      const dep = JSON.parse(readFileSync(path.join(folder, 'package.json'), 'utf8'));
      if (dep.name && dep.name !== pkg.name && !licenses.has(dep.name)) {
        const notice = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENCE', 'COPYING'].find(file => existsSync(path.join(folder, file)));
        licenses.set(dep.name, `## ${dep.name} ${dep.version ?? ''}\nLicense: ${dep.license ?? 'See upstream package'}\n${notice ? readFileSync(path.join(folder, notice), 'utf8') : ''}`);
      }
      if (dep.name) break;
    }
    folder = path.dirname(folder);
  }
}
const manifest = { manifestVersion: 3, id: `cotree.${name}`, name, version: '0.1.0', description: 'Local sample MCP server; replace the sample handler with the reviewed application contract.', minKernelVersion: '0.1.0', entry: 'README.md', capabilities: { mcpServers: true }, permissions: { shell: 'none', browser: 'none' }, mcpServers: [{ name: 'server', transport: 'stdio', command: 'node', args: ['server.mjs'], cwd: '.', cwdBase: 'plugin' }] };
const result = writeNewProject(values.output, { 'server.mjs': bundled.outputFiles[0].contents, 'plugin.json': JSON.stringify(manifest, null, 2) + '\n', '.gitattributes': '** -text\n', 'THIRD_PARTY_NOTICES.md': [...licenses.values()].join('\n\n'), 'README.md': `# ${name}\n\nCoTree Manifest v3 local stdio server. Runtime dependencies are bundled; Node 20.19+ must exist on the target PATH. Install and enable through CoTree's normal lifecycle.\n\nThe sample only computes a bounded numeric summary and exposes usage / prompt data. It does not implement a real service, cloud OAuth, MCP Apps UI or an MCPB installer. A stdio process has the host user's OS access; the plugin declaration is not an OS sandbox. Test real upstream behavior separately.\n` });
process.stdout.write(JSON.stringify({ ...result, pluginId: manifest.id, runtimeBundled: false, dependenciesBundled: true, licensePackages: licenses.size }) + '\n');
