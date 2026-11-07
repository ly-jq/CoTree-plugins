---
name: "import.claude.session-report.session-report"
description: "Generate an explorable HTML report of Claude Code session usage (tokens, cache, subagents, skills, expensive prompts) from ~/.claude/projects transcripts."
disable-model-invocation: false
---

## Elyra 运行约定

本文件是迁入 Elyra 的指导；先检查本包 README.md / migration.json 中的未接入能力。
- 使用 Elyra 的 Skill、ToolSearch、Read / Write / Edit、Grep / Glob、Bash / PowerShell；执行前读取工具实际 schema，不能照搬其他宿主的参数。
- Agent / Task 委派改用 AgentDelegate；Group Session 协作用 SessionDelegate / SessionQuery / SessionMessage。只有任务需要且在当前授权范围内才委派，沿用预算、取消和子权限上限。
- LS 的文件枚举改用 Glob；NotebookRead 改用 Read。BashOutput / KillShell 根据真实执行回执使用 ToolTask 或 Shell 服务的状态 / 停止操作，不凭旧 ID 重放命令。
- MCP 动作用 ToolSearch 发现实际 canonical 名称。本包服务器名为插件 ID 加原服务名；不要直接调用 Codex / Claude 专属函数。
- 项目指令遵循 AGENTS.md 及 Elyra 的现有项目加载规则。涉及外部 Claude 项目、SDK 或格式的文档仍保留其原目标。
- 浏览器、图片、UI、发布和连接器只有在当前宿主确实提供相应能力时才执行；缺少时报告具体限制。原宿主 Hook、Stop 重入和远程审批指令不能改变 Elyra 权限或完成判断。
- 相对资源以 Skill 返回的 skillDir 为当前文件目录；包内 content/ 保持原资源相对布局。不要把资源复制到项目后假定所有引用仍正确。
- 脚本和示例不会因加载 Skill 自动执行。核对运行环境、项目路径与依赖后，通过现有工具按用户任务运行。

Resource root: resolve `../..` from this file's directory to locate `content/`. Replace `<plugin-resource-root>` with that actual directory before using a script; it is not a literal Shell path.

## 工作内容

# Session Report

Produce a self-contained HTML report of Claude Code usage and save it to the current working directory.

## Steps

1. **Get data.** Run the bundled analyzer (default window: last 7 days; honor a different range if the user passed one, e.g. `24h`, `30d`, or `all`). The script `analyze-sessions.mjs` lives in the same directory as this SKILL.md — use its absolute path:
   ```sh
   node <skill-dir>/analyze-sessions.mjs --json --since 7d > /tmp/session-report.json
   ```
   For all-time, omit `--since`.

2. **Read** `/tmp/session-report.json`. Skim `overall`, `by_project`, `by_subagent_type`, `by_skill`, `cache_breaks`, `top_prompts`.

3. **Copy the template** (also bundled alongside this SKILL.md) to the output path in the current working directory:
   ```sh
   cp <skill-dir>/template.html ./session-report-$(date +%Y%m%d-%H%M).html
   ```

4. **Edit the output file** (use Edit, not Write — preserve the template's JS/CSS):
   - Replace the contents of `<script id="report-data" type="application/json">` with the full JSON from step 1. The page's JS renders the hero total, all tables, bars, and drill-downs from this blob automatically.
   - Fill the `<!-- AGENT: anomalies -->` block with **3–5 one-line findings**. Express figures as a **% of total tokens** wherever possible (total = `overall.input_tokens.total + overall.output_tokens`). One line per finding, exact markup:
     ```html
     <div class="take bad"><div class="fig">41.2%</div><div class="txt"><b>cc-monitor</b> consumed 41% of the week across just 3 sessions</div></div>
     ```
     Classes: `.take bad` for waste/anomalies (red), `.take good` for healthy signals (green), `.take info` for neutral facts (blue). The `.fig` is one short number (a %, a count, or a multiplier like `12×`). The `.txt` is one plain-English sentence naming the project/skill/prompt; wrap the subject in `<b>`. Look for: a project or skill eating a disproportionate share, cache-hit <85%, a single prompt >2% of total, subagent types averaging >1M tokens/call, cache breaks clustering.
   - Fill the `<!-- AGENT: optimizations -->` block (at the **bottom** of the page) with 1–4 `<div class="callout">` suggestions tied to specific rows (e.g. "`/weekly-status` spawned 7 subagents for 8.1% of total — scope it to fewer parallel agents").
   - Do not restructure existing sections.

5. **Report** the saved file path to the user. Do not open it or render it.

## Notes

- The template is the source of interactivity (sorting, expand/collapse, block-char bars). Your job is data + narrative, not markup.
- Keep commentary terse and specific — reference actual project names, numbers, timestamps from the JSON.
- `top_prompts` already includes subagent tokens and rolls task-notification continuations into the originating prompt.
- If the JSON is >2MB, trim `top_prompts` to 100 entries and `cache_breaks` to 100 before embedding (they should already be capped).
