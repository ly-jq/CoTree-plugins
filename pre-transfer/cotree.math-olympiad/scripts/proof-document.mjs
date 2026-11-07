import { lstatSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

export function prepareDocument(bodyFile, output) {
  const stat = lstatSync(bodyFile);
  if (!stat.isFile() || stat.size > 2 * 1024 * 1024) throw new Error('Body must be a regular file of at most 2 MiB.');
  const body = readFileSync(bodyFile, 'utf8');
  if (!body.trim() || /\\(?:documentclass|begin\s*\{document\}|end\s*\{document\})/.test(body)) throw new Error('Supply a nonempty proof body without a document wrapper.');
  if (typeof output !== 'string' || path.extname(output).toLowerCase() !== '.tex') throw new Error('Choose a new .tex output file.');
  const document = String.raw`\documentclass[11pt]{article}
\usepackage[margin=1in]{geometry}
\usepackage{amsmath,amssymb,amsthm}
\newtheorem{theorem}{Theorem}
\newtheorem{lemma}{Lemma}
\newtheorem{claim}{Claim}
\begin{document}
` + body + '\n\\end{document}\n';
  writeFileSync(output, document, { flag: 'wx' });
  return { output: path.resolve(output), sourcePrepared: true, compiled: false, mathematicalVerificationPerformed: false };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const { values } = parseArgs({ options: { body: { type: 'string' }, output: { type: 'string' } } });
    if (!values.body || !values.output) throw new Error('Use --body BODY.tex --output NEW_DOCUMENT.tex.');
    console.log(JSON.stringify(prepareDocument(values.body, values.output), null, 2));
  } catch (error) { console.error(error.code ? `File operation failed (${error.code}).` : error.message); process.exitCode = 1; }
}
