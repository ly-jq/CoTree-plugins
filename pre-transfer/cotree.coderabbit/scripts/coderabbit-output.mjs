import { lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const severities = ['critical', 'major', 'minor', 'trivial', 'info', 'none'];
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
// This parser does not start reviews, access credentials, execute suggestions or certify code.
export function summarizeReview(text, exitCode) {
  if (typeof text !== 'string' || Buffer.byteLength(text) > 8 * 1024 * 1024) throw new Error('Review output must be UTF-8 text of at most 8 MiB.');
  if (!Number.isInteger(exitCode) || exitCode < 0 || exitCode > 255) throw new Error('Supply the observed process exit code, 0..255.');
  const findings = [], diagnostics = [], errors = [], completions = [];
  let actionRequired = false, contextSeen = false, records = 0;
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    if (++records > 20000) throw new Error('Review output exceeds 20000 records.');
    let event;
    try { event = JSON.parse(line); } catch { diagnostics.push({ line: index + 1, reason: 'invalid-json' }); continue; }
    if (!object(event) || typeof event.type !== 'string') { diagnostics.push({ line: index + 1, reason: 'missing-event-type' }); continue; }
    if (completions.length) diagnostics.push({ line: index + 1, reason: 'record-after-completion' });
    if (event.type === 'review_context') contextSeen = true;
    else if (event.type === 'finding') {
      const finding = {};
      for (const field of ['fileName', 'title', 'comment', 'codegenInstructions']) if (typeof event[field] === 'string') finding[field] = event[field];
      if (typeof event.fileName !== 'string' || !event.fileName.trim()) diagnostics.push({ line: index + 1, reason: 'missing-finding-file' });
      if (severities.includes(event.severity)) finding.severity = event.severity;
      else diagnostics.push({ line: index + 1, reason: 'unsupported-finding-severity' });
      for (const field of ['startLine', 'endLine']) if (event[field] !== undefined) {
        if (Number.isInteger(event[field]) && event[field] > 0) finding[field] = event[field];
        else diagnostics.push({ line: index + 1, reason: `invalid-${field}` });
      }
      if (finding.endLine && finding.startLine && finding.endLine < finding.startLine) diagnostics.push({ line: index + 1, reason: 'reversed-line-range' });
      // Preserve suggestions as untrusted data, never turn them into executable commands.
      if (event.suggestions !== undefined) finding.suggestions = event.suggestions;
      findings.push(finding);
    } else if (event.type === 'error') {
      errors.push({ line: index + 1, ...(typeof event.errorType === 'string' ? { errorType: event.errorType } : {}) });
    } else if (event.type === 'action_required') actionRequired = true;
    else if (event.type === 'complete') completions.push(event);
    else if (!['status', 'heartbeat'].includes(event.type)) diagnostics.push({ line: index + 1, reason: 'unsupported-event-type' });
  }
  const complete = completions[0];
  if (!contextSeen) diagnostics.push({ reason: 'missing-review-context' });
  if (completions.length !== 1) diagnostics.push({ reason: completions.length ? 'multiple-completions' : 'missing-completion' });
  if (complete) {
    if (!['review_completed', 'review_skipped'].includes(complete.status)) diagnostics.push({ reason: 'unsupported-completion-status' });
    if (complete.outcome !== undefined && !['completed', 'completed_with_warnings', 'failed'].includes(complete.outcome)) diagnostics.push({ reason: 'unsupported-completion-outcome' });
    if (!Number.isInteger(complete.findings) || complete.findings !== findings.length) diagnostics.push({ reason: 'finding-count-mismatch' });
    if (complete.unreviewedFileCount !== undefined && (!Number.isInteger(complete.unreviewedFileCount) || complete.unreviewedFileCount < 0)) diagnostics.push({ reason: 'invalid-unreviewed-count' });
    if (complete.status === 'review_skipped' && (findings.length || complete.outcome === 'failed' || complete.unreviewedFileCount > 0)) diagnostics.push({ reason: 'inconsistent-skip' });
    if (complete.reused !== undefined && typeof complete.reused !== 'boolean') diagnostics.push({ reason: 'invalid-reuse-flag' });
  }
  const incomplete = exitCode !== 0 || errors.length > 0 || diagnostics.length > 0 || actionRequired || complete?.outcome === 'failed' || complete?.unreviewedFileCount > 0;
  const status = actionRequired ? 'action-required' : incomplete ? 'incomplete' : complete.status === 'review_skipped' ? 'skipped' : 'completed';
  return { status, exitCode, findings: findings.sort((a, b) => (a.severity ? severities.indexOf(a.severity) : 6) - (b.severity ? severities.indexOf(b.severity) : 6)),
    diagnostics, errors, ...(complete?.outcome ? { outcome: complete.outcome } : {}),
    reused: complete?.reused === true, localSaveFailed: complete?.persistence?.status === 'failed',
    zeroIssuesObserved: status === 'completed' && findings.length === 0, codeCorrectnessCertified: false, networkExecuted: false };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const { values } = parseArgs({ options: { input: { type: 'string' }, 'exit-code': { type: 'string' } } });
    if (!values.input || !/^\d{1,3}$/.test(values['exit-code'] ?? '')) throw new Error('Use --input review.ndjson --exit-code OBSERVED_EXIT_CODE.');
    const stat = lstatSync(values.input);
    if (!stat.isFile() || stat.size > 8 * 1024 * 1024) throw new Error('Input must be a regular file of at most 8 MiB.');
    const result = summarizeReview(readFileSync(values.input, 'utf8'), Number(values['exit-code']));
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    if (['incomplete', 'action-required'].includes(result.status)) process.exitCode = 2;
  } catch (error) { console.error(error.code ? `File operation failed (${error.code}).` : error.message); process.exitCode = 1; }
}
