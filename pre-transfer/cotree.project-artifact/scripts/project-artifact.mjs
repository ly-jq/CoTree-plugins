import { createHash } from 'node:crypto';
import { closeSync, existsSync, lstatSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const hash = value => createHash('sha256').update(value).digest('hex');
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const text = (value, name, max = 12000) => { if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`${name} must be non-empty text (max ${max})`); return value; };
const date = (value, name) => { text(value, name, 40); if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value) || !Number.isFinite(Date.parse(value))) throw new Error(`${name} must be a UTC timestamp`); return value; };
const array = (value, name, max) => { if (!Array.isArray(value) || value.length > max) throw new Error(`${name} must be an array with at most ${max} items`); return value; };
export function validateArtifact(data) {
  if (!data || data.schemaVersion !== 1) throw new Error('schemaVersion must be 1');
  text(data.title, 'title', 200); text(data.summary, 'summary'); date(data.asOf, 'asOf');
  const ids = new Set();
  for (const source of array(data.sources, 'sources', 100)) {
    text(source.id, 'source.id', 80); if (ids.has(source.id)) throw new Error('Duplicate source id'); ids.add(source.id);
    text(source.label, 'source.label', 200); text(source.reference, 'source.reference', 2000); date(source.observedAt, 'source.observedAt');
    if (!['fresh', 'stale', 'unavailable'].includes(source.status)) throw new Error('Source status must be fresh, stale or unavailable');
    if (source.status !== 'fresh') text(source.reason, 'source.reason');
    if (source.reference.includes('://') && !source.reference.startsWith('https://')) throw new Error('Remote source links must use HTTPS');
    if (source.reference.startsWith('https://')) { const u = new URL(source.reference); if (u.username || u.password) throw new Error('Source links cannot contain credentials'); }
  }
  if (!ids.size) throw new Error('At least one attributed source is required');
  const rows = new Set();
  for (const row of array(data.workstreams, 'workstreams', 200)) {
    text(row.id, 'workstream.id', 80); if (rows.has(row.id)) throw new Error('Duplicate workstream id'); rows.add(row.id);
    text(row.title, 'workstream.title', 300); text(row.status, 'workstream.status', 120); text(row.evidence, 'workstream.evidence');
    if (!array(row.sourceIds, 'sourceIds', 100).length || row.sourceIds.some(id => !ids.has(id))) throw new Error('Workstream must reference existing sources');
    if (row.owner !== undefined) text(row.owner, 'owner', 200);
    if (row.next !== undefined) text(row.next, 'next');
    if (row.inference !== undefined) text(row.inference, 'inference');
  }
  for (const item of array(data.next, 'next', 30)) text(item, 'next item');
  for (const section of array(data.sections ?? [], 'sections', 8)) { text(section.title, 'section.title', 80); text(section.body, 'section.body', 30000); }
  return data;
}
export function renderArtifact(input) {
  const d = validateArtifact(input), state = JSON.stringify(d).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026');
  const panes = [
    ['概览', `<p class="summary">${escape(d.summary)}</p><h2>下一步</h2><ul>${d.next.map(t => `<li>${escape(t)}</li>`).join('')}</ul>`],
    ['工作流', `<div class="table"><table><thead><tr><th>事项</th><th>状态与证据</th><th>后续</th></tr></thead><tbody>${d.workstreams.map(r => `<tr><td><strong>${escape(r.id)} · ${escape(r.title)}</strong>${r.owner ? `<p>${escape(r.owner)}</p>` : ''}</td><td><span class="pill">${escape(r.status)}</span><p>${escape(r.evidence)}</p><small>来源：${r.sourceIds.map(escape).join('、')}</small>${r.inference ? `<p>推断依据：${escape(r.inference)}</p>` : ''}</td><td>${escape(r.next ?? '未提供后续行动')}</td></tr>`).join('')}</tbody></table></div>`],
    ...(d.sections ?? []).map(s => [s.title, `<p class="prose">${escape(s.body)}</p>`]),
    ['来源', d.sources.map(s => `<article><h2>${escape(s.label)} <span class="pill">${escape(s.status)}</span></h2><p>${s.reference.startsWith('https://') ? `<a href="${escape(s.reference)}" target="_blank" rel="noopener noreferrer">${escape(s.reference)}</a>` : escape(s.reference)}</p><small>${escape(s.id)} · 观察于 ${escape(s.observedAt)}</small>${s.reason ? `<p>${escape(s.reason)}</p>` : ''}</article>`).join('')]
  ];
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${escape(d.title)}</title><style>:root{color-scheme:light dark;font-family:system-ui,sans-serif;color:#182435;background:#f0f4f8}body{max-width:1120px;margin:auto;padding:32px}header{border-bottom:1px solid #cbd5e1;padding-bottom:20px}.eyebrow{letter-spacing:.12em;font-size:12px;color:#52647c}h1{font-size:clamp(25px,4vw,42px);margin:12px 0}.stamp,small{color:#52647c}nav{display:flex;gap:8px;flex-wrap:wrap;margin:24px 0}button{padding:10px 18px;border:1px solid #b9c7d8;border-radius:8px;background:transparent;color:inherit;cursor:pointer}button[aria-selected=true]{background:#234e80;color:#fff}section{padding:24px;background:#fff;border:1px solid #d9e2ed;border-radius:14px}.summary{font-size:20px;line-height:1.7}.prose,p{white-space:pre-wrap;line-height:1.65;overflow-wrap:anywhere}li{margin:12px 0}table{width:100%;border-collapse:collapse;min-width:540px}th,td{text-align:left;padding:16px;vertical-align:top;border-bottom:1px solid #dbe3ed}.table{overflow:auto}.pill{display:inline-block;padding:3px 9px;background:#e4edf8;border-radius:6px;font-size:13px}article+article{border-top:1px solid #dbe3ed;margin-top:24px}a{color:#195c9c;overflow-wrap:anywhere}footer{font-size:12px;color:#52647c;margin-top:20px}@media(max-width:600px){body{padding:18px}section{padding:16px}th,td{padding:10px}}@media(prefers-color-scheme:dark){:root{background:#141e2a;color:#e3edf9}section{background:#1c2a3b;border-color:#38506c}.stamp,small,footer,.eyebrow{color:#a9bbd1}.pill{background:#284264}a{color:#9bcbff}}</style></head><body><header><div class="eyebrow">COTREE · PROJECT ARTIFACT</div><h1>${escape(d.title)}</h1><div class="stamp">资料截至 ${escape(d.asOf)} · 来源缺失或过期会单独标注</div></header><nav role="tablist">${panes.map(([name], i) => `<button role="tab" id="tab-${i}" aria-controls="pane-${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${escape(name)}</button>`).join('')}</nav>${panes.map(([, body], i) => `<section role="tabpanel" id="pane-${i}" aria-labelledby="tab-${i}" ${i ? 'hidden' : ''}>${body}</section>`).join('')}<footer>由明确来源生成的状态快照；页面不会修改任务状态，也不自动发布。</footer><script type="application/json" id="artifact-state">${state}</script><script>const tabs=[...document.querySelectorAll('[role=tab]')];function select(i){tabs.forEach((b,j)=>{b.setAttribute('aria-selected',String(i===j));b.tabIndex=i===j?0:-1;document.getElementById('pane-'+j).hidden=i!==j;});}tabs.forEach((b,i)=>{b.onclick=()=>select(i);b.onkeydown=e=>{if(['ArrowRight','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;select(n);tabs[n].focus();}};});</script></body></html>\n`;
}
function noLinks(file) { for (let p = path.resolve(file);; p = path.dirname(p)) { if (existsSync(p) && lstatSync(p).isSymbolicLink()) throw new Error('Artifact path must not contain a symlink'); if (path.dirname(p) === p) break; } }
export function writeArtifact(input, output, expectedPreviousSha256) {
  const html = renderArtifact(input), file = path.resolve(output); if (!file.endsWith('.html')) throw new Error('Output must end with .html'); noLinks(file);
  const lock = `${file}.lock`, fd = openSync(lock, 'wx'); let temporary;
  try {
    let previous;
    if (existsSync(file)) { if (lstatSync(file).size > 5 * 1024 * 1024) throw new Error('Existing artifact exceeds 5 MiB'); previous = readFileSync(file); if (!expectedPreviousSha256 || hash(previous) !== expectedPreviousSha256) throw new Error('Existing artifact changed or expected previous SHA-256 is missing'); }
    else if (expectedPreviousSha256) throw new Error('Expected artifact is missing');
    if (Buffer.byteLength(html) > 5 * 1024 * 1024) throw new Error('Rendered artifact exceeds 5 MiB');
    const backup = previous ? `${file}.${hash(previous)}.bak` : null;
    if (previous && !existsSync(backup)) writeFileSync(backup, previous, { flag: 'wx' });
    temporary = `${file}.${process.pid}.tmp`; writeFileSync(temporary, html, { flag: 'wx' }); renameSync(temporary, file); temporary = undefined;
    return { output: file, sha256: hash(html), previousSha256: previous ? hash(previous) : null, backup, asOf: input.asOf, published: false };
  } finally { if (temporary && existsSync(temporary)) unlinkSync(temporary); closeSync(fd); unlinkSync(lock); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { const [action, input, output, previous] = process.argv.slice(2); if (action !== 'render' || !input || !output) throw new Error('Usage: project-artifact.mjs render data.json page.html [expected-previous-sha256]'); const raw = readFileSync(input); if (raw.length > 1024 * 1024) throw new Error('Input exceeds 1 MiB'); console.log(JSON.stringify(writeArtifact(JSON.parse(raw.toString('utf8')), output, previous), null, 2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
