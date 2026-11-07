import { createHash } from 'node:crypto';
import { lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function file(base, relative) {
  if (typeof relative !== 'string' || !relative || path.isAbsolute(relative)) throw new Error('Case files must use relative paths');
  const resolved = path.resolve(base, relative), rel = path.relative(base, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('Case path leaves evidence directory');
  const stat = lstatSync(resolved), real = path.relative(base, realpathSync(resolved));
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 8388608 || real.startsWith('..') || path.isAbsolute(real)) throw new Error('Case file must be regular, inside evidence directory, and at most 8 MiB');
  return readFileSync(resolved);
}
export function compareEvidence(inputFile) {
  const input = realpathSync(inputFile), base = path.dirname(input);
  const bytes = file(base, path.basename(input));
  const document = JSON.parse(bytes);
  if (typeof document.system !== 'string' || !document.system.trim() || !Array.isArray(document.cases) || !document.cases.length || document.cases.length > 200) throw new Error('Provide a system and 1-200 observed comparison cases');
  const ids = new Set();
  const cases = document.cases.map(c => {
    if (typeof c.id !== 'string' || !c.id.trim() || ids.has(c.id)) throw new Error('Case identifiers must be explicit and unique'); ids.add(c.id);
    if (c.mask || c.tolerance || c.approvedDifference) throw new Error('This exact comparator does not silently apply masks, tolerance or approvals; review differences separately');
    let a, b;
    try { a = file(base, c.legacy); b = file(base, c.modern); } catch(error) { if (['ENOENT', 'EACCES'].includes(error.code)) return { id: c.id, status: 'missing-evidence', reason: 'A declared output is absent or unreadable', next: 'Run the corresponding implementation and supply its observed output' }; throw error; }
    return { id: c.id, status: !a.length && !b.length ? 'empty-evidence' : a.equals(b) ? 'equal' : 'different', legacy: { bytes: a.length, sha256: sha(a) }, modern: { bytes: b.length, sha256: sha(b) } };
  });
  return { schemaVersion: 1, system: document.system, generatedAt: new Date().toISOString(), inputSha256: sha(bytes), cases, scope: 'Exact comparison of supplied output files only; no tests executed and no semantic completion judgment' };
}
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
export function renderReport(report) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Migration evidence</title><style>body{font:16px system-ui;max-width:1100px;margin:40px auto;padding:20px}td,th{padding:12px;text-align:left;border-bottom:1px solid #ccc}table{width:100%;border-collapse:collapse}code{overflow-wrap:anywhere}</style><h1>${escape(report.system)}</h1><p>${escape(report.scope)}</p><table><tr><th>Case</th><th>Observed comparison</th><th>Evidence</th></tr>${report.cases.map(c => `<tr><td>${escape(c.id)}</td><td>${escape(c.status)}</td><td>${c.reason ? escape(`${c.reason}. ${c.next}`) : `<code>${escape(c.legacy.sha256)}<br>${escape(c.modern.sha256)}</code>`}</td></tr>`).join('')}</table></html>`;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const [input, output] = process.argv.slice(2); if (!input || !output || process.argv.length !== 4) throw new Error('Usage: node modernization-evidence.mjs cases.json NEW_OUTPUT_DIRECTORY');
    const result = compareEvidence(input); mkdirSync(output); writeFileSync(path.join(output, 'comparison.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' }); writeFileSync(path.join(output, 'report.html'), renderReport(result), { flag: 'wx' }); console.log(JSON.stringify(result));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
