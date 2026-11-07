import { lstatSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { readObject, resolveCli } from './inspect-project.mjs';

function bounded(value, min, max, name, integer = true) { if (!Number.isFinite(value) || value < min || value > max || integer && !Number.isInteger(value)) throw new Error(`Invalid ${name}.`); return value; }
export function planRender(input) {
  const allowed = ['workspace', 'entry', 'composition', 'output', 'format', 'fps', 'durationInFrames', 'width', 'height', 'frame', 'propsFile', 'browserExecutable', 'concurrency'];
  if (!input || Array.isArray(input) || typeof input !== 'object' || Object.keys(input).some(key => !allowed.includes(key))) throw new Error('Unknown render request fields.');
  const { workspace, entry, composition, output, format = 'mp4' } = input;
  if (![workspace, entry, composition, output].every(value => typeof value === 'string' && value.length > 0)) throw new Error('workspace, entry, composition and output are required.');
  if (!/^[A-Za-z0-9][A-Za-z0-9-]{0,99}$/.test(composition)) throw new Error('Use the observed Remotion composition ID.');
  const cwd = realpathSync(path.resolve(workspace)), source = realpathSync(path.resolve(cwd, entry)), relative = path.relative(cwd, source);
  if (relative.startsWith('..') || path.isAbsolute(relative) || !lstatSync(source).isFile()) throw new Error('Entry must be a file inside the application.');
  const cli = resolveCli(cwd, '@remotion/cli', 'remotion'), destination = path.resolve(cwd, output);
  try { lstatSync(destination); throw new Error('Output already exists.'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (!lstatSync(path.dirname(destination)).isDirectory()) throw new Error('Output parent must exist.');
  const fps = bounded(input.fps, 1, 120, 'fps', false), duration = bounded(input.durationInFrames, 1, 432000, 'duration');
  const width = bounded(input.width, 16, 8192, 'width'), height = bounded(input.height, 16, 8192, 'height');
  const settings = { mp4: ['.mp4', '--codec=h264', '--pixel-format=yuv420p'], 'webm-alpha': ['.webm', '--codec=vp9', '--pixel-format=yuva420p', '--image-format=png'], 'prores-alpha': ['.mov', '--codec=prores', '--prores-profile=4444', '--pixel-format=yuva444p10le', '--image-format=png'], png: ['.png', '--image-format=png'] }[format];
  if (!settings || path.extname(destination).toLowerCase() !== settings[0]) throw new Error('Output extension must match mp4, webm-alpha, prores-alpha or png.');
  if (format === 'mp4' && (width % 2 || height % 2)) throw new Error('H.264 yuv420p requires even dimensions.');
  if (format !== 'png' && input.frame !== undefined) throw new Error('frame is only valid for png stills.');
  const args = [cli.executable, format === 'png' ? 'still' : 'render', source, composition, destination, '--overwrite=false', ...settings.slice(1), `--width=${width}`, `--height=${height}`];
  if (format === 'png') args.push(`--frame=${bounded(input.frame ?? 0, 0, duration - 1, 'frame')}`);
  else args.push(`--concurrency=${bounded(input.concurrency ?? 2, 1, 16, 'concurrency')}`);
  if (input.propsFile !== undefined) { if (typeof input.propsFile !== 'string') throw new Error('propsFile must be a path.'); const file = path.resolve(cwd, input.propsFile); readObject(file); args.push('--props', file); }
  if (input.browserExecutable !== undefined) { if (typeof input.browserExecutable !== 'string') throw new Error('browserExecutable must be a path.'); const file = path.resolve(cwd, input.browserExecutable); if (!lstatSync(file).isFile()) throw new Error('Browser executable is missing.'); args.push('--browser-executable', file); }
  return { command: process.execPath, args, cwd, remotionVersion: cli.version, observedComposition: { composition, fps, durationInFrames: duration, width, height }, expectedDurationSeconds: duration / fps, execution: 'not-started', metadataMustBeRechecked: true, credentialsUsed: false };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { const { values } = parseArgs({ options: { input: { type: 'string' }, output: { type: 'string' }, help: { type: 'boolean' } } });
    if (values.help) console.log('render-plan.mjs --input request.json [--output new-plan.json]; prepares argv, never renders or overwrites output.');
    else { if (!values.input) throw new Error('input is required.'); const result = JSON.stringify(planRender(readObject(values.input)), null, 2) + '\n'; if (values.output) writeFileSync(values.output, result, { flag: 'wx', mode: 0o600 }); else process.stdout.write(result); }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
