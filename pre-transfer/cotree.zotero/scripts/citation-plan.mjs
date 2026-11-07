import { createHash } from 'node:crypto';
import { openSync, fstatSync, readFileSync, closeSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
const hash = text => createHash('sha256').update(text).digest('hex');

// Parse entry boundaries without evaluating TeX or resolving BibTeX macros.
export function bibEntries(text) {
  if (typeof text !== 'string' || Buffer.byteLength(text) > 2 * 1024 * 1024) throw new Error('Use BibTeX text up to 2 MiB.');
  const entries = []; let i = 0;
  while (i < text.length) {
    if (/\s|\uFEFF/.test(text[i])) { i++; continue; }
    if (text[i] === '%') { const end = text.indexOf('\n', i); i = end < 0 ? text.length : end + 1; continue; }
    const head = /^@([A-Za-z]+)\s*([{(])/.exec(text.slice(i));
    if (!head) throw new Error('Unsupported text outside a BibTeX entry.');
    const start = i, type = head[1].toLowerCase(), brace = head[2] === '{'; i += head[0].length;
    const bodyStart = i; let depth = brace ? 1 : 0, quoted = false, closed = false;
    for (; i < text.length; i++) {
      const char = text[i];
      if (char === '\\') { i++; continue; }
      if (char === '"' && depth === (brace ? 1 : 0)) { quoted = !quoted; continue; }
      if (char === '%' && !quoted) { const end = text.indexOf('\n', i); i = end < 0 ? text.length : end; continue; }
      if (char === '{') depth++;
      if (char === '}') { depth--; if (depth < 0) throw new Error('Unbalanced BibTeX braces.'); }
      if (!quoted && (brace && char === '}' && depth === 0 || !brace && char === ')' && depth === 0)) { closed = true; break; }
    }
    if (!closed || quoted) throw new Error('Incomplete BibTeX entry.');
    const body = text.slice(bodyStart, i), special = ['comment', 'string', 'preamble'].includes(type);
    const key = special ? null : /^\s*([A-Za-z0-9_:.+/-]{1,128})\s*,/.exec(body)?.[1];
    if (!special && !key) throw new Error('Unsupported or unsafe citation key.');
    entries.push({ key, type, text: text.slice(start, ++i) });
  }
  const keys = entries.filter(e => e.key).map(e => e.key);
  if (new Set(keys).size !== keys.length) throw new Error('Duplicate citation keys; resolve the bibliography conflict first.');
  return entries;
}
export function createCitationPlan(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => !['draft', 'bibliography', 'entry', 'marker', 'format'].includes(k))) throw new Error('Unexpected citation plan fields.');
  for (const name of ['draft', 'bibliography', 'entry']) if (typeof input[name] !== 'string' || Buffer.byteLength(input[name]) > 2 * 1024 * 1024) throw new Error('Supply bounded draft, bibliography and exported entry strings.');
  if (!['latex', 'markdown'].includes(input.format)) throw new Error('Use latex or markdown format.');
  if (typeof input.marker !== 'string' || !input.marker || input.marker.length > 200 || input.draft.split(input.marker).length !== 2) throw new Error('The exact citation marker must occur once in the draft.');
  const added = bibEntries(input.entry), existing = bibEntries(input.bibliography);
  if (added.length !== 1 || !added[0].key) throw new Error('Export exactly one concrete bibliographic entry; resolve ambiguity first.');
  const key = added[0].key, prior = existing.find(e => e.key === key);
  if (prior && prior.text !== added[0].text) throw new Error('Citation key already exists with different content; resolve it before editing the draft.');
  const citation = input.format === 'latex' ? `\\cite{${key}}` : `[@${key}]`;
  return { execution: 'not-applied', businessVerified: false, citationKey: key, citation,
    sourceHashes: { draft: hash(input.draft), bibliography: hash(input.bibliography) },
    draft: input.draft.replace(input.marker, () => citation),
    bibliography: prior ? input.bibliography : input.bibliography + (input.bibliography ? '\n\n' : '') + added[0].text + '\n',
    bibliographyAction: prior ? 'unchanged' : 'append-entry' };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    let values;
    try { ({ values } = parseArgs({ options: { input: { type: 'string' }, output: { type: 'string' }, help: { type: 'boolean' } }, allowPositionals: false })); } catch { throw new Error('Invalid command; use --help.'); }
    if (values.help) process.stdout.write('Offline: --input request.json --output new-plan.json. Produces a citation plan; does not edit the draft/library or access the network. See references/citations.md.\n');
    else {
      let fd, input;
      try { fd = openSync(values.input, 'r'); const info = fstatSync(fd); if (!info.isFile() || info.size > 8 * 1024 * 1024) throw new Error(); input = JSON.parse(readFileSync(fd, 'utf8')); } catch { throw new Error('Use a regular input JSON file up to 8 MiB.'); } finally { if (fd !== undefined) closeSync(fd); }
      const result = createCitationPlan(input);
      try { writeFileSync(values.output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); } catch { throw new Error('Cannot save new citation plan; existing files are preserved.'); }
      process.stdout.write(JSON.stringify({ output: values.output, execution: 'not-applied', citationKey: result.citationKey }) + '\n');
    }
  } catch (error) { process.stderr.write((error instanceof Error ? error.message : 'Citation planning failed.') + '\n'); process.exitCode = 1; }
}
