import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = new URL('./', import.meta.url);
const bundle = await build({ entryPoints: [fileURLToPath(new URL('./widget.js', root))], bundle: true, format: 'esm', target: 'es2022', write: false, minify: false });
const html = readFileSync(new URL('./widget.html', root), 'utf8').replace('/* BUNDLED_WIDGET */', () => bundle.outputFiles[0].text.replaceAll('</script', '<\\/script'));
mkdirSync(new URL('./dist/', root), { recursive: true });
writeFileSync(new URL('./dist/widget.html', root), html);
console.log('Built dist/widget.html');
