import { readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const escape = value => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export function chartPage(spec) {
  if (!spec || typeof spec !== "object" || !["bar", "line"].includes(spec.type) || typeof spec.title !== "string" || !spec.title.trim() || spec.title.length > 200 || typeof spec.source !== "string" || spec.source.length > 2000 || typeof spec.unit !== "string" || spec.unit.length > 40) throw new Error("Expected title, source, unit and type (bar or line)");
  if (!Array.isArray(spec.rows) || !spec.rows.length || spec.rows.length > 1000) throw new Error("Expected 1–1000 rows");
  const rows = spec.rows.map(row => {
    if (!row || typeof row.label !== "string" || !row.label.trim() || row.label.length > 120 || (row.value !== null && (typeof row.value !== "number" || !Number.isFinite(row.value) || Math.abs(row.value) > 1e12))) throw new Error("Rows require label and finite number or null; absolute values cannot exceed 1e12");
    return { label: row.label, value: row.value };
  });
  const data = JSON.stringify({ type: spec.type, unit: spec.unit, rows }).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>${escape(spec.title)}</title>
<style>*{box-sizing:border-box}body{margin:0;background:#f2f5f4;color:#18382f;font:16px/1.6 system-ui,sans-serif}main{max-width:1000px;margin:auto;padding:40px 24px}header small{letter-spacing:.12em;font-weight:700}h1{font-size:clamp(26px,5vw,40px);line-height:1.2;margin:12px 0}p{overflow-wrap:anywhere}.panel{background:white;border:1px solid #b4c9c1;border-radius:14px;padding:24px;margin-top:24px}label{display:block}input,button{font:inherit;padding:10px;border:1px solid #647a70;border-radius:6px;max-width:100%}button{cursor:pointer;margin-left:8px}input:focus-visible,button:focus-visible{outline:3px solid #a67a05;outline-offset:3px}svg{width:100%;height:auto;display:block}.grid{stroke:#b4c9c1}.mark{fill:#087f68}.line{fill:none;stroke:#087f68;stroke-width:3}svg text{fill:currentColor;font:12px system-ui}table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}td,th{text-align:left;border-bottom:1px solid #b4c9c1;padding:10px;overflow-wrap:anywhere}td:last-child,th:last-child{text-align:right;width:100px;white-space:nowrap}caption{text-align:left;font-weight:700;margin:12px 0}.table{max-height:480px;overflow:auto}footer{margin-top:24px;color:#426454}@media(prefers-color-scheme:dark){body{background:#101f1b;color:#e5f4ed}.panel{background:#172c24;border-color:#52695f}.mark{fill:#79d7b3}.line{stroke:#79d7b3}footer{color:#b3cfc1}}@media(max-width:500px){main{padding:24px 12px}.panel{padding:14px}button{margin:10px 0 0}}@media print{body{background:white;color:black}label,button{display:none}.panel{break-inside:avoid}.table{max-height:none;overflow:visible}footer{color:black}}</style>
<main><header><small>COTREE · DATA VIEW</small><h1>${escape(spec.title)}</h1><p>${escape(spec.source)}</p></header><section class="panel"><label>筛选名称 <input id="query" type="search" maxlength="200" autocomplete="off"></label><button id="reset" type="button">重置筛选</button><p id="status" role="status" aria-live="polite"></p><svg role="img" aria-labelledby="chart-title chart-description" viewBox="0 0 800 360"><title id="chart-title">${escape(spec.title)}</title><desc id="chart-description">完整数值见下方表格；空值不按零处理。折线按输入顺序连接，空值保留缺口。</desc><g id="marks"></g></svg><div class="table" tabindex="0" aria-label="数据表格，可滚动"><table><caption>数据明细 · ${escape(spec.unit)}</caption><thead><tr><th scope="col">名称</th><th scope="col">数值</th></tr></thead><tbody id="rows"></tbody></table></div></section><footer>离线快照 · 筛选仅作用于当前数据 · 图中最多展示 60 行，完整筛选结果在表格中。分享前核对数据权限。</footer></main>
<script>const spec=${data};
const query=document.getElementById('query'),marks=document.getElementById('marks'),body=document.getElementById('rows'),svg=document.querySelector('svg');
function node(tag,attrs,text){const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));if(text!==undefined)n.textContent=text;marks.append(n);return n}
function render(){const q=query.value.toLocaleLowerCase(),rows=spec.rows.filter(row=>row.label.toLocaleLowerCase().includes(q));body.replaceChildren();for(const row of rows){const tr=document.createElement('tr'),label=document.createElement('th'),value=document.createElement('td');label.scope='row';label.textContent=row.label;value.textContent=row.value===null?'缺失':row.value.toLocaleString();tr.append(label,value);body.append(tr)}
marks.replaceChildren();const width=Math.max(320,Math.round(svg.getBoundingClientRect().width));svg.setAttribute('viewBox','0 0 '+width+' 360');const shown=rows.slice(0,60),values=shown.flatMap(row=>row.value===null?[]:[row.value]);let lo=Math.min(0,...values),hi=Math.max(0,...values);if(lo===hi)hi=lo+1;const y=v=>300-(v-lo)/(hi-lo)*260;node('line',{x1:75,x2:width-20,y1:y(0),y2:y(0),class:'grid'});node('text',{x:4,y:40},hi.toLocaleString());node('text',{x:4,y:300},lo.toLocaleString());const step=(width-100)/Math.max(1,shown.length);let previous=null;
shown.forEach((row,i)=>{const x=80+step*(i+.5);if(row.value===null){previous=null;return}const py=y(row.value);if(spec.type==='bar'){const bar=node('rect',{x:x-step*.35,y:Math.min(y(0),py),width:step*.7,height:Math.max(1,Math.abs(y(0)-py)),class:'mark'});const t=document.createElementNS('http://www.w3.org/2000/svg','title');t.textContent=row.label+': '+row.value+' '+spec.unit;bar.append(t)}else{if(previous)node('line',{x1:previous[0],y1:previous[1],x2:x,y2:py,class:'line'});node('circle',{cx:x,cy:py,r:4,class:'mark'});previous=[x,py]}const limit=Math.max(3,Math.min(12,Math.floor(step/8)));if(shown.length<=8)node('text',{x,y:330,'text-anchor':'middle'},row.label.length>limit?row.label.slice(0,limit-1)+'…':row.label)});
document.getElementById('status').textContent='显示 '+rows.length+' / '+spec.rows.length+' 行 · 单位：'+spec.unit+(rows.length>60?' · 图表仅前 60 行':'');}
function fromHash(){query.value=(new URLSearchParams(location.hash.slice(1)).get('q')||'').slice(0,200);render()}
query.addEventListener('input',()=>{const state=new URLSearchParams();if(query.value)state.set('q',query.value);history.replaceState(null,'',location.pathname+location.search+(state.size?'#'+state.toString():''));render()});document.getElementById('reset').addEventListener('click',()=>{query.value='';query.dispatchEvent(new Event('input'));query.focus()});window.addEventListener('hashchange',fromHash);new ResizeObserver(render).observe(svg);fromHash();</script></html>`;
}
export function main(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    if (!["--input", "--output"].includes(args[index]) || !args[index + 1] || options[args[index]]) throw new Error("Usage: --input chart.json --output new-chart.html");
    options[args[index]] = args[index + 1];
  }
  if (!options["--input"] || !options["--output"]) throw new Error("Input and output required");
  if (statSync(options["--input"]).size > 1_000_000) throw new Error("Input exceeds 1 MB");
  const html = chartPage(JSON.parse(readFileSync(options["--input"], "utf8")));
  writeFileSync(options["--output"], html, { encoding: "utf8", flag: "wx" });
  return { output: path.resolve(options["--output"]), rowsValidated: true, offline: true, rendered: false };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { process.stdout.write(JSON.stringify(main(process.argv.slice(2))) + "\n"); }
  catch (error) { process.stderr.write(error.message + "\n"); process.exitCode = 1; }
}
