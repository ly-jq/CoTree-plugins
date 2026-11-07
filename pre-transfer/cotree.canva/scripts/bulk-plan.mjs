import { openSync, fstatSync, readFileSync, closeSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const key = value => typeof value === 'string' && value.trim() && value.length <= 200 && !['__proto__', 'constructor', 'prototype'].includes(value);
const identifier = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
function fields(value, names) { if (!object(value) || Object.keys(value).some(name => !names.includes(name))) throw new Error('Unexpected bulk plan fields.'); }

// Offline normalized plan, not a guessed MCP request. The caller maps it to
// the actual discovered tool schema before submitting explicitly authorized jobs.
export function planCanvaBulk(input) {
  fields(input, ['templateId', 'fields', 'rows', 'titleColumn']);
  if (Buffer.byteLength(JSON.stringify(input)) > 1024 * 1024) throw new Error('Bulk input exceeds 1 MiB.');
  if (!identifier(input.templateId)) throw new Error('Supply an observed Canva template ID.');
  if (!Array.isArray(input.fields) || !input.fields.length || input.fields.length > 100) throw new Error('Supply 1..100 observed template field mappings.');
  if (!Array.isArray(input.rows) || !input.rows.length || input.rows.length > 200) throw new Error('Supply 1..200 rows.');
  if (input.titleColumn !== undefined && !key(input.titleColumn)) throw new Error('Invalid title column.');
  const names = new Set();
  for (const field of input.fields) {
    fields(field, ['name', 'type', 'column']);
    if (!key(field.name) || !key(field.column) || !['text', 'image'].includes(field.type) || names.has(field.name)) throw new Error('Mappings require unique observed names, text/image types and explicit columns.');
    names.add(field.name);
  }
  const planned = [], skipped = [];
  for (const [index, row] of input.rows.entries()) {
    if (!object(row) || Object.keys(row).length > 100 || Object.keys(row).some(name => !key(name))) throw new Error('Invalid row columns.');
    const entries = [];
    for (const field of input.fields) {
      const value = Object.hasOwn(row, field.column) ? row[field.column] : undefined;
      if (value === undefined || value === null || value === '') continue;
      if (field.type === 'image') {
        if (!identifier(value)) throw new Error('Image values must be observed Canva asset IDs; upload external images separately.');
        entries.push([field.name, { type: 'image', assetId: value }]);
      } else {
        if (!['string', 'number', 'boolean'].includes(typeof value) || (typeof value === 'number' && !Number.isFinite(value)) || String(value).length > 10000) throw new Error('Text values must be bounded scalars.');
        entries.push([field.name, { type: 'text', text: String(value) }]);
      }
    }
    if (!entries.length) { skipped.push({ row: index + 1, reason: 'no-mapped-values' }); continue; }
    const title = input.titleColumn && Object.hasOwn(row, input.titleColumn) ? row[input.titleColumn] : undefined;
    if (title !== undefined && title !== null && (typeof title !== 'string' || title.length > 255)) throw new Error('Titles must be strings of at most 255 characters.');
    planned.push({ row: index + 1, templateId: input.templateId, ...(title ? { title } : {}), data: Object.fromEntries(entries) });
  }
  return { schema: 'cotree.canva.bulk-plan.v1', execution: 'not-started', businessVerified: false, planned, skipped };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    let values;
    try { ({ values } = parseArgs({ options: { input: { type: 'string' }, output: { type: 'string' }, help: { type: 'boolean' } }, allowPositionals: false })); }
    catch { throw new Error('Invalid options. Use --help.'); }
    if (values.help) process.stdout.write('Offline: --input mapping.json [--output new-file]. Up to 200 rows / 100 fields / 1 MiB. No credentials or remote operations. Use references/bulk.md.\n');
    else {
      let input, fd;
      try { fd = openSync(values.input, 'r'); const info = fstatSync(fd); if (!info.isFile() || info.size > 1024 * 1024) throw new Error(); input = JSON.parse(readFileSync(fd, 'utf8')); }
      catch { throw new Error('Use a regular JSON input file of at most 1 MiB.'); }
      finally { if (fd !== undefined) closeSync(fd); }
      const result = JSON.stringify(planCanvaBulk(input), null, 2) + '\n';
      if (values.output) {
        try { writeFileSync(values.output, result, { flag: 'wx', mode: 0o600 }); } catch { throw new Error('Cannot save a new output file; existing files are preserved.'); }
        process.stdout.write(JSON.stringify({ output: values.output, execution: 'not-started' }) + '\n');
      } else process.stdout.write(result);
    }
  } catch (error) { process.stderr.write((error instanceof Error ? error.message : 'Bulk planning failed.') + '\n'); process.exitCode = 1; }
}
