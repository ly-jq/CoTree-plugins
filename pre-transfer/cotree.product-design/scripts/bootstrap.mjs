import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { projectName, readTree, writeNewProject } from './new-project.mjs';

export function bootstrap({ output, name, template = 'prototype' }) {
  projectName(name);
  if (!['prototype', 'mobile-app'].includes(template)) throw new Error('Use prototype or mobile-app.');
  const source = fileURLToPath(new URL(`../resources/source-01/content/templates/${template}/`, import.meta.url));
  const files = readTree(source, (relative, directory) => {
    if (relative === 'src' || relative.startsWith('src/') || relative === 'public' || relative.startsWith('public/')) return true;
    if (relative === 'tests' || relative.startsWith('tests/')) return !relative.includes('sites-worker');
    return !directory && ['index.html', 'tsconfig.json', 'package.json', 'package-lock.json'].includes(relative);
  });
  const pkg = JSON.parse(files['package.json'].toString('utf8'));
  pkg.name = name;
  pkg.scripts = { dev: 'vite', build: template === 'mobile-app' ? 'tsc && vite build' : 'vite build', preview: 'vite preview' };
  if (template === 'mobile-app') {
    pkg.scripts['check:runtime'] = 'node scripts/check-mobile-runtime.mjs';
    pkg.scripts['predev'] = 'npm run check:runtime'; pkg.scripts['prebuild'] = 'npm run check:runtime';
    pkg.scripts['test:runtime'] = 'playwright test';
    files['scripts/check-mobile-runtime.mjs'] = readFileSync(path.join(source, 'scripts/check-mobile-runtime.mjs'));
    const runtimeTest = 'tests/mobile-runtime.spec.ts';
    const cornerClick = 'await page.getByTestId("sheet-overlay").click({ position: { x: 8, y: 8 } });';
    const testSource = files[runtimeTest].toString('utf8');
    if (testSource.split(cornerClick).length !== 2) throw new Error('Review the upstream overlay test before adapting it.');
    // The original point lies outside the phone screen's 42px rounded clip.
    files[runtimeTest] = testSource.replace(cornerClick, `const overlayBox = await page.getByTestId("sheet-overlay").boundingBox();
  if (!overlayBox) throw new Error("Missing overlay bounds");
  await page.mouse.click(overlayBox.x + overlayBox.width / 2, overlayBox.y + overlayBox.height * 0.12);`);
    // Text inputs deliberately retain pointer gestures. Test keyboard dismissal
    // from the footer padding after its opening animation, not from the input.
    for (const [before, after] of [
      ['deltaY: number, steps = 8)', 'deltaY: number, steps = 8, position?: { y: number })'],
      ['const startY = box.y + box.height / 2;', 'const startY = box.y + (position?.y ?? box.height / 2);'],
      ['await drag(page, footer, 0, 120, 5);', 'await expect.poll(() => keyboard.evaluate(element => new DOMMatrixReadOnly(getComputedStyle(element).transform).m42)).toBeLessThan(1);\n  await drag(page, footer, 0, 120, 5, { y: 8 });']
    ]) {
      if (files[runtimeTest].split(before).length !== 2) throw new Error('Review the upstream keyboard gesture test before adapting it.');
      files[runtimeTest] = files[runtimeTest].replace(before, after);
    }
    files['playwright.config.ts'] = `import { defineConfig } from '@playwright/test';\nconst port = Number(process.env.MOBILE_RUNTIME_TEST_PORT ?? 4174);\nif (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid fixture port');\nexport default defineConfig({ testDir: './tests', testMatch: '**/*.spec.ts', timeout: 20000, use: { baseURL: 'http://127.0.0.1:' + port, viewport: { width: 1100, height: 1100 }, ...(process.env.COTREE_PLAYWRIGHT_CHANNEL ? { channel: process.env.COTREE_PLAYWRIGHT_CHANNEL } : {}) }, webServer: { command: 'npm run dev -- --host 127.0.0.1 --port ' + port + ' --strictPort', url: 'http://127.0.0.1:' + port + '/tests/runtime-fixture.html', reuseExistingServer: false } });\n`;
  }
  files['package.json'] = JSON.stringify(pkg, null, 2) + '\n';
  if (files['package-lock.json']) {
    const lock = JSON.parse(files['package-lock.json'].toString('utf8'));
    lock.name = name; if (lock.packages?.['']) lock.packages[''].name = name;
    files['package-lock.json'] = JSON.stringify(lock, null, 2) + '\n';
  }
  const configName = template === 'mobile-app' ? 'vite.config.ts' : 'vite.config.mjs';
  files[configName] = `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nexport default defineConfig({ plugins: [react()], build: { outDir: 'dist' }, server: { host: '127.0.0.1', strictPort: true }, preview: { host: '127.0.0.1', strictPort: true } });\n`;
  if (template === 'mobile-app') {
    // Recompute the portable snapshot only at scaffolding; preserve original runtime bytes.
    const upstreamLock = JSON.parse(readFileSync(path.join(source, 'mobile-runtime.lock.json'), 'utf8'));
    const selected = Object.keys(upstreamLock).filter(file => Object.hasOwn(files, file));
    files['mobile-runtime.lock.json'] = JSON.stringify(Object.fromEntries(selected.map(file => [file, createHash('sha256').update(files[file]).digest('hex')])), null, 2) + '\n';
  }
  files['.gitignore'] = 'node_modules/\ndist/\nplaywright-report/\ntest-results/\n.env\n.env.*\n';
  files['README.md'] = `# ${name}\n\nCoTree local ${template} starter. Node 22.12+ is recommended for the retained mobile toolchain; see package.json engines of installed dependencies. Install with npm ci, then npm run dev. The returned Vite URL is loopback only. Build with npm run build; static output is dist/.\n\nNo Sites worker, hosting file, cloud login, deploy hook or dependency install is created by scaffolding. This is an empty canvas for the requested product, not a finished application. Reuse the project design system and user content.\n\n${template === 'mobile-app' ? 'Mobile device frames, scroll / gesture / keyboard / layer components and runtime tests are retained. Put product screens in src/Prototype.tsx and src/prototype.css. npm run check:runtime checks the adapted snapshot; npm run test:runtime exercises the local browser fixture. Set COTREE_PLAYWRIGHT_CHANNEL to an installed supported browser channel when needed. User-authorized runtime changes require review and a new integrity snapshot; do not silently disable checks.\n' : 'Implement the product in src/App.jsx and src/styles.css; validate real interaction, desktop / mobile layouts and errors in a browser.\n'}\nSource and adaptation metadata: cotree-prototype-source.json. Keep generated screenshots and runtime evidence in a task output directory. Public sharing requires a selected hosting target and explicit task authorization; this starter does not deploy.\n`;
  const report = JSON.parse(readFileSync(new URL('../provenance/source-1.json', import.meta.url), 'utf8'));
  files['cotree-prototype-source.json'] = JSON.stringify({ template, source: report.source, adaptations: ['loopback-only Vite configuration', 'standard dist output', 'Sites worker and publishing hooks omitted', ...(template === 'mobile-app' ? ['portable mobile runtime snapshot', 'overlay dismissal test clicks inside the visible rounded screen'] : [])], sourceFiles: Object.keys(files).filter(file => file.startsWith('src/') || file.startsWith('public/')).map(file => ({ path: file, sha256: createHash('sha256').update(files[file]).digest('hex') })) }, null, 2) + '\n';
  return { ...writeNewProject(output, files), template, scriptsExecuted: false };
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    const { values } = parseArgs({ options: { output: { type: 'string' }, name: { type: 'string' }, template: { type: 'string' }, help: { type: 'boolean' } }, allowPositionals: false });
    if (values.help) process.stdout.write('bootstrap.mjs --name my-prototype --output NEW_DIRECTORY [--template prototype|mobile-app]. No install or publishing.\n');
    else process.stdout.write(JSON.stringify(bootstrap(values)) + '\n');
  } catch (error) { process.stderr.write(`Prototype creation failed: ${error.message}\n`); process.exitCode = 1; }
}
