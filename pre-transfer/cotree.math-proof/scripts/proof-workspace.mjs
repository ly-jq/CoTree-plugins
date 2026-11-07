import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { writeNewProject } from './new-project.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function read(file) {
  const stat = lstatSync(file);
  if (!stat.isFile() || stat.size > 2 * 1024 * 1024) throw new Error('Expected a regular file of at most 2 MiB.');
  return readFileSync(file);
}
function child(root, relative) {
  if (typeof relative !== 'string' || !relative || path.isAbsolute(relative) || relative.includes(':') || relative.split(/[\\/]/).some(p => !p || p === '.' || p === '..')) throw new Error('Evidence path must stay inside the proof folder.');
  let target = root;
  for (const part of relative.split(/[\\/]/)) {
    target = path.join(target, part);
    if (lstatSync(target).isSymbolicLink()) throw new Error('Linked proof resources are not supported.');
  }
  return target;
}
function directory(value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Select a proof folder.');
  const root = path.resolve(value), stat = lstatSync(root);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Expected a real proof directory.');
  return root;
}
export function createProofFolder(problemFile, output) {
  const problem = read(problemFile);
  if (!problem.toString('utf8').trim()) throw new Error('The problem statement is empty.');
  const files = {
    'problem.md': problem,
    'notes.md': '# Proof notes\n\nRecord checked lemmas, counterexamples, assumptions and the next open step here. This file is a mathematical work product, not CoTree execution state.\n',
    'claims.json': JSON.stringify({ schemaVersion: 1, claims: [] }, null, 2) + '\n',
    'README.md': '# Proof workspace\n\nproblem.md preserves the supplied bytes. Keep proofs self-contained in proof.md; do not claim unfinished work is proved. claims.json is an optional evidence index, not a proof checker or session controller. CoTree owns task state, cancellation and resumption.\n\nClaims: id, statement, assessment (open / established / refuted), dependsOn (IDs), evidence ([{path, sha256}]). Assessments are author assertions. Recompute evidence digests only after reading changed files. Keep prior results when exploring a stronger claim.\n'
  };
  return { ...writeNewProject(output, files), problemSha256: hash(problem), mathematicalVerificationPerformed: false };
}
export function inspectProofFolder(folder, problemFile) {
  const root = directory(folder), original = read(child(root, 'problem.md'));
  if (problemFile && !original.equals(read(problemFile))) throw new Error('The supplied problem differs byte-for-byte; choose another folder or review the change explicitly.');
  const files = ['notes.md', 'claims.json', 'proof.md'].flatMap(name => existsSync(path.join(root, name)) ? [{ path: name, sha256: hash(read(child(root, name))) }] : []);
  return { root, problemSha256: hash(original), files, missingArtifacts: ['notes.md', 'claims.json', 'proof.md'].filter(name => !files.some(file => file.path === name)), mathematicalVerificationPerformed: false, modifiedFiles: false };
}
export function auditClaims(folder) {
  const root = directory(folder), data = JSON.parse(read(child(root, 'claims.json')).toString('utf8'));
  if (!object(data) || data.schemaVersion !== 1 || !Array.isArray(data.claims) || data.claims.length > 1000) throw new Error('Expected schemaVersion 1 and at most 1000 claims.');
  const claims = new Map(), diagnostics = [];
  for (const item of data.claims) {
    if (!object(item) || typeof item.id !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(item.id) || claims.has(item.id)) throw new Error('Each claim needs a unique stable ID.');
    if (typeof item.statement !== 'string' || !item.statement.trim() || !['open', 'established', 'refuted'].includes(item.assessment) || !Array.isArray(item.dependsOn) || item.dependsOn.some(id => typeof id !== 'string') || !Array.isArray(item.evidence)) throw new Error('Invalid claim statement, assessment, dependencies or evidence.');
    claims.set(item.id, item);
  }
  for (const item of claims.values()) {
    if (item.assessment !== 'open' && !item.evidence.length) diagnostics.push({ id: item.id, reason: 'missing-evidence' });
    for (const id of item.dependsOn) {
      if (!claims.has(id)) diagnostics.push({ id: item.id, reason: 'missing-dependency', dependency: id });
      else if (item.assessment === 'established' && claims.get(id).assessment !== 'established') diagnostics.push({ id: item.id, reason: 'unestablished-dependency', dependency: id });
    }
    for (const ref of item.evidence) {
      if (!object(ref) || typeof ref.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(ref.sha256)) throw new Error('Each evidence reference needs a SHA-256 digest.');
      try { if (hash(read(child(root, ref.path))) !== ref.sha256) diagnostics.push({ id: item.id, reason: 'changed-evidence', path: ref.path }); }
      catch (error) { if (error.code === 'ENOENT') diagnostics.push({ id: item.id, reason: 'missing-evidence-file', path: ref.path }); else throw error; }
    }
  }
  const active = new Set(), visited = new Set();
  function visit(id) {
    if (active.has(id)) { diagnostics.push({ id, reason: 'cyclic-dependency' }); return; }
    if (visited.has(id) || !claims.has(id)) return;
    active.add(id); for (const dep of claims.get(id).dependsOn) visit(dep); active.delete(id); visited.add(id);
  }
  for (const id of claims.keys()) visit(id);
  return { claims: claims.size, diagnostics, referencesConsistent: diagnostics.length === 0, mathematicalVerificationPerformed: false, modifiedFiles: false };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const { values } = parseArgs({ options: { action: { type: 'string' }, problem: { type: 'string' }, output: { type: 'string' } } });
    if (!values.output || !['create', 'inspect', 'audit'].includes(values.action)) throw new Error('Use --action create|inspect|audit --output FOLDER [--problem FILE].');
    if (values.action === 'create' && !values.problem) throw new Error('Creating a folder requires --problem FILE.');
    const result = values.action === 'create' ? createProofFolder(values.problem, values.output) : values.action === 'inspect' ? inspectProofFolder(values.output, values.problem) : auditClaims(values.output);
    console.log(JSON.stringify(result, null, 2)); if (result.referencesConsistent === false) process.exitCode = 2;
  } catch (error) { console.error(error.code ? `File operation failed (${error.code}).` : error instanceof SyntaxError ? 'Invalid claims JSON.' : error.message); process.exitCode = 1; }
}
