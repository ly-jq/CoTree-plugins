import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';

export function inspectProject(workspace) {
  const root = realpathSync(path.resolve(workspace));
  const read = relative => {
    const file = path.join(root, relative);
    if (!existsSync(file)) return undefined;
    const real = realpathSync(file), rel = path.relative(root, real), stat = statSync(real);
    if (path.isAbsolute(rel) || rel === '..' || rel.startsWith('..' + path.sep) || !stat.isFile() || stat.size > 1024 * 1024) throw new Error(`Invalid or external project file: ${relative}`);
    let value;
    try { value = JSON.parse(readFileSync(real, 'utf8')); } catch { throw new Error(`Invalid JSON in ${relative}`); }
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Expected an object in ${relative}`);
    return value;
  };
  const pkg = read('package.json'), link = read('.vercel/project.json'), config = read('vercel.json');
  const known = new Set(['next', 'react', 'react-dom', 'swr', 'ai', 'workflow', 'eve', 'chat', 'turbo', '@vercel/sdk', '@vercel/sandbox', '@vercel/blob', '@vercel/flags', '@vercel/og', 'shadcn']);
  const dependencies = Object.fromEntries(Object.entries({ ...pkg?.dependencies, ...pkg?.devDependencies }).filter(([name]) => known.has(name)).map(([name, version]) => [name,
    typeof version === 'string' && version.length < 100 && /^[~^<>=|\d.vx* +a-z-]+$/i.test(version) ? version : '(non-registry specification)']));
  const label = value => typeof value === 'string' && /^[A-Za-z0-9_.@/-]{1,128}$/.test(value) ? value : undefined;
  return { workspace: root, packageManager: label(pkg?.packageManager), scripts: Object.keys(pkg?.scripts ?? {}), dependencies,
    link: link ? { projectId: label(link.projectId), orgId: label(link.orgId), projectName: label(link.projectName) } : null,
    config: config ? { framework: label(config.framework), environmentVariableNames: Object.keys(config.env ?? {}), buildEnvironmentVariableNames: Object.keys(config.build?.env ?? {}) } : null,
    remoteVerified: false, credentialValuesEmitted: false, note: 'Local metadata only. Script bodies and environment values are omitted; .env files are not read and scripts are not executed.' };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { values } = parseArgs({ options: { workspace: { type: 'string', default: process.cwd() } }, allowPositionals: false });
    process.stdout.write(JSON.stringify(inspectProject(values.workspace), null, 2) + '\n');
  } catch (error) { process.stderr.write(`Project inspection failed: ${error.message}\n`); process.exitCode = 1; }
}
