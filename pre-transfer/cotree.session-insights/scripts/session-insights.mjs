import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { writeNewProject } from './new-project.mjs';

const fields = ['inputTokens', 'outputTokens', 'totalTokens', 'reasoningTokens', 'cacheReadTokens', 'cacheWriteTokens'];
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const identity = value => typeof value === 'string' && value.trim().length > 0;
function timestamp(value, label) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) || !Number.isFinite(Date.parse(value))) throw new Error(`${label} must be a UTC ISO timestamp.`);
  const normalized = new Date(value).toISOString();
  if (normalized.slice(0, 19) !== value.slice(0, 19)) throw new Error(`${label} is not a valid calendar timestamp.`);
  return normalized;
}
function bucket() { return { responses: 0, responsesWithUsage: 0, tokens: Object.fromEntries(fields.map(f => [f, { value: null, observedResponses: 0 }])), pairedCacheRead: 0, pairedCacheInput: 0, cacheObservedResponses: 0 }; }
function addUsage(target, usage) {
  target.responses++;
  if (!record(usage)) return;
  const values = Object.fromEntries(fields.filter(f => Number.isSafeInteger(usage[f]) && usage[f] >= 0).map(f => [f, usage[f]]));
  if (Object.keys(values).length) target.responsesWithUsage++;
  if (values.totalTokens === undefined && values.inputTokens !== undefined && values.outputTokens !== undefined) values.totalTokens = values.inputTokens + values.outputTokens;
  for (const [field, value] of Object.entries(values)) { const item = target.tokens[field]; const sum = (item.value ?? 0) + value; if (!Number.isSafeInteger(sum)) throw new Error('Token total exceeds the safe integer range.'); item.value = sum; item.observedResponses++; }
  if (values.inputTokens !== undefined && values.cacheReadTokens !== undefined && values.cacheReadTokens <= values.inputTokens) { target.pairedCacheInput += values.inputTokens; target.pairedCacheRead += values.cacheReadTokens; target.cacheObservedResponses++; }
}
function finish(target) { return { ...target, cacheHitRatio: target.pairedCacheInput > 0 ? target.pairedCacheRead / target.pairedCacheInput : null, missingUsageResponses: target.responses - target.responsesWithUsage }; }

export function analyzeSessions(options) {
  if (Object.keys(options).some(key => !['database', 'since', 'until', 'workspace', 'maxEvents'].includes(key))) throw new Error('Unsupported report option.');
  if (!options.database) throw new Error('Select an explicit CoTree agent.db; no home-directory scan is performed.');
  const database = path.resolve(options.database), stat = lstatSync(database);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Expected a regular SQLite database.');
  const since = timestamp(options.since, 'since'), until = timestamp(options.until, 'until');
  if (since >= until) throw new Error('since must precede until; the end is exclusive.');
  const maxEvents = options.maxEvents ?? 250000;
  if (!Number.isSafeInteger(maxEvents) || maxEvents < 1 || maxEvents > 1000000) throw new Error('Invalid event limit.');
  if (options.workspace !== undefined && !identity(options.workspace)) throw new Error('workspace must be an exact stored path.');
  const db = new DatabaseSync(realpathSync(database), { readOnly: true, enableExtensions: false });
  try {
    db.exec('PRAGMA query_only=ON; PRAGMA trusted_schema=OFF; PRAGMA busy_timeout=3000; BEGIN');
    const requireColumns = (table, columns) => { const actual = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(r => r.name)); if (columns.some(c => !actual.has(c))) throw new Error(`Unsupported CoTree database: ${table} columns missing.`); };
    requireColumns('runs', ['id', 'workspace', 'parent_run_id', 'status', 'metadata_json']);
    requireColumns('events', ['id', 'run_id', 'seq', 'type', 'payload_json', 'created_at', 'schema_version']);
    // Current raw model/tool/skill receipts are v2. V3 owner-stream envelopes are separate projections.
    const conditions = 'e.schema_version=2 AND julianday(e.created_at)>=julianday(?) AND julianday(e.created_at)<julianday(?)', params = [since, until];
    const scope = options.workspace ? ' AND r.workspace=?' : ''; if (scope) params.push(options.workspace);
    const bounds = db.prepare(`SELECT count(*) AS count,coalesce(sum(length(CAST(e.payload_json AS BLOB))),0) AS bytes FROM events e LEFT JOIN runs r ON r.id=e.run_id WHERE ${conditions}${scope}`).get(...params);
    if (bounds.count > maxEvents) throw new Error('Event limit exceeded. Narrow the date or workspace range; no partial report was generated.');
    if (bounds.bytes > 64 * 1024 * 1024) throw new Error('Report payload limit exceeded. Narrow the range.');
    const rows = db.prepare(`SELECT e.id, e.run_id, e.seq, e.type, e.created_at, e.payload_json, r.workspace, r.parent_run_id, r.status, r.metadata_json FROM events e LEFT JOIN runs r ON r.id=e.run_id WHERE ${conditions}${scope} ORDER BY e.created_at,e.run_id,e.seq LIMIT ?`).all(...params, maxEvents + 1);
    if (rows.length > maxEvents) throw new Error('Event limit exceeded. Narrow the date or workspace range; no partial report was generated.');
    const overall = bucket(), runs = new Map(), projects = new Map(), skills = new Map(), tools = new Map(), diagnostics = [], days = new Set();
    let bytes = 0;
    for (const event of rows) {
      bytes += Buffer.byteLength(event.payload_json);
      if (bytes > 64 * 1024 * 1024) throw new Error('Report payload limit exceeded. Narrow the range.');
      if (!identity(event.id) || !identity(event.run_id) || !identity(event.workspace)) { diagnostics.push({ eventId: event.id, runId: event.run_id, reason: 'Missing run or workspace identity; excluded.' }); continue; }
      let payload, metadata;
      try { payload = JSON.parse(event.payload_json); metadata = JSON.parse(event.metadata_json); if (!record(payload) || !record(metadata)) throw new Error(); }
      catch { diagnostics.push({ eventId: event.id, runId: event.run_id, reason: 'Malformed event or run metadata; excluded.' }); continue; }
      if (!runs.has(event.run_id)) runs.set(event.run_id, { id: event.run_id, workspace: event.workspace, parentRunId: event.parent_run_id, sessionId: identity(metadata.sessionId) ? metadata.sessionId : null, status: event.status, ...bucket() });
      if (!projects.has(event.workspace)) projects.set(event.workspace, { workspace: event.workspace, ...bucket() });
      const run = runs.get(event.run_id), project = projects.get(event.workspace);
      days.add(new Date(event.created_at).toISOString().slice(0, 10));
      if (event.type === 'model_response' && payload.kind === undefined && record(payload.message) && payload.message.role === 'assistant') {
        for (const target of [overall, run, project]) addUsage(target, payload.usage);
        if (record(payload.usage) && fields.some(f => payload.usage[f] !== undefined && (!Number.isSafeInteger(payload.usage[f]) || payload.usage[f] < 0))) diagnostics.push({ eventId: event.id, runId: event.run_id, reason: 'Invalid token fields omitted.' });
      }
      if (event.type === 'skill_invoked') {
        if (identity(payload.name)) skills.set(payload.name, (skills.get(payload.name) ?? 0) + 1);
        else diagnostics.push({ eventId: event.id, runId: event.run_id, reason: 'Skill invocation has no name; omitted from skill grouping.' });
      }
      if (event.type === 'tool_result') {
        if (identity(payload.toolName) && typeof payload.ok === 'boolean') { const tool = tools.get(payload.toolName) ?? { name: payload.toolName, succeeded: 0, failed: 0 }; tool[payload.ok ? 'succeeded' : 'failed']++; tools.set(payload.toolName, tool); }
        else diagnostics.push({ eventId: event.id, runId: event.run_id, reason: 'Tool result lacks name or outcome; omitted from tool grouping.' });
      }
    }
    // Session ids are identities only. No title, prompt, message or tool arguments are exported.
    const sessionIds = new Set([...runs.values()].map(r => r.sessionId).filter(Boolean));
    const tables = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name));
    let userTurns = null;
    if (tables.has('chat_turns') && tables.has('chat_sessions')) {
      requireColumns('chat_turns', ['session_id', 'role', 'created_at']); requireColumns('chat_sessions', ['id', 'workspace']);
      const turns = db.prepare(`SELECT t.session_id,count(*) AS count FROM chat_turns t JOIN chat_sessions s ON s.id=t.session_id WHERE t.role='user' AND julianday(t.created_at)>=julianday(?) AND julianday(t.created_at)<julianday(?)${options.workspace ? ' AND s.workspace=?' : ''} GROUP BY t.session_id`).all(...params);
      userTurns = turns.reduce((sum, row) => { sessionIds.add(row.session_id); return sum + row.count; }, 0);
    }
    db.exec('COMMIT');
    const sorted = items => items.map(finish).sort((a, b) => (b.tokens.totalTokens.value ?? -1) - (a.tokens.totalTokens.value ?? -1));
    return { schemaVersion: 1, generatedAt: new Date().toISOString(), range: { since, until, endExclusive: true }, scope: { database: path.basename(database), workspace: options.workspace ?? null, databaseCount: 1 },
      overall: { ...finish(overall), runs: runs.size, sessions: sessionIds.size, runsWithoutSessionIdentity: [...runs.values()].filter(r => !r.sessionId).length, childRuns: [...runs.values()].filter(r => r.parentRunId).length, activeUtcDays: days.size, userTurns },
      byProject: sorted([...projects.values()]), byRun: sorted([...runs.values()]), bySkill: [...skills].map(([name, invocations]) => ({ name, invocations })).sort((a, b) => b.invocations - a.invocations), byTool: [...tools.values()], diagnostics,
      privacy: { messageContentsIncluded: false, credentialStoresRead: false, networkUsed: false },
      limitations: ['范围是一个明确选择的数据库及 UTC 事件窗口，仅计 v2 原始 Run 回执；v1 历史记录、v3 会话投影、其他设备 / 数据库和已清理事件不包含。', '缺失用量显示“未提供”，并保留每项覆盖的响应数。缓存和推理 token 是子项，不重复加入总量。', 'Run 状态是读取时的当前状态，不能证明目标完成。子 Run 只计自身事件，不向父 Run 重复累计。', '不推算账单、成本分摊、缓存中断、节省时间或交付成果；Skill 与工具结果只表示记录次数。'] };
  } finally { db.close(); }
}
export function writeSessionReport(report, output) {
  const template = readFileSync(new URL('../template/report.html', import.meta.url), 'utf8');
  const json = JSON.stringify(report).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
  const tokens = report.overall.tokens.totalTokens;
  const markdown = `# CoTree 会话记录\n\nUTC ${report.range.since} 至 ${report.range.until}（末端不含）。\n\n${report.overall.runs} 个 Run，${report.overall.sessions} 个已识别 Session；${report.overall.childRuns} 个子 Run。记录的 token 总数：${tokens.value ?? '未提供'}，覆盖 ${tokens.observedResponses}/${report.overall.responses} 条模型响应。\n\n## 范围与证据\n\n数据来自一个明确选择的本机数据库；只统计事件窗口。未包含对话正文、代码、工具输入或凭据。项目路径、Run / Session 标识、Skill 和工具名称包含在 HTML / JSON 中，分享前按需要收窄范围。\n\n## 可核实的产出\n\n本统计不证明功能交付、PR 成功或节省时间。按用户任务读取具体产物、Git SHA / PR 回执再补充；没有独立证据时保留为空。\n\n## 限制\n\n${report.limitations.map(v => '- ' + v).join('\n')}\n`;
  return writeNewProject(output, { 'report.json': JSON.stringify(report, null, 2) + '\n', 'report.html': template.replace('REPORT_DATA_PLACEHOLDER', json), 'receipt.md': markdown });
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const { values } = parseArgs({ options: { database: { type: 'string' }, since: { type: 'string' }, until: { type: 'string' }, workspace: { type: 'string' }, output: { type: 'string' }, help: { type: 'boolean' } } });
    const { output, help, ...options } = values;
    if (help) console.log('session-insights.mjs --database AGENT_DB --since UTC_ISO --until UTC_ISO [--workspace EXACT_STORED_PATH] --output NEW_DIRECTORY. Read-only snapshot; no transcript content, credentials or inferred billing. Requires Node 22.13+ with node:sqlite.');
    else { if (!output) throw new Error('output is required.'); const report = analyzeSessions(options); writeSessionReport(report, output); console.log(JSON.stringify({ output: path.resolve(output), runs: report.overall.runs, responses: report.overall.responses, diagnostics: report.diagnostics.length, published: false })); }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
