---
name: "import.codex.notion.notion-meeting-intelligence"
description: "Prepare meeting materials with Notion context and supplemental research; use when gathering context, drafting agendas/pre-reads, and tailoring materials to attendees."
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

# Meeting Intelligence

Prep meetings by pulling Notion context, tailoring agendas/pre-reads, and enriching with supplemental research.

## Quick start
1) Confirm meeting goal, attendees, date/time, and decisions needed.
2) Gather context: search with `Notion:search`, then fetch with `Notion:fetch` (prior notes, specs, OKRs, decisions).
3) Pick the right template via `reference/template-selection-guide.md` (status, decision, planning, retro, 1:1, brainstorming).
4) Draft agenda/pre-read in Notion with `Notion:notion-create-pages`, embedding source links and owner/timeboxes.
5) Enrich with supplemental research (industry insights, benchmarks, risks) and update the page with `Notion:notion-update-page` as plans change.

## Tool-call guardrails
- Notion tool availability can vary by workspace. If a Notion MCP call returns `Tool <name> not found`, treat that tool as unavailable for the rest of the current task. Do not retry it with different arguments or call it again later; use `Notion:search` and `Notion:fetch` where sufficient.
- Use one literal search query per `Notion:search` call and include `filters: {}` when no narrower filter is needed.
- Only fetch Notion page, database, or data-source URLs/IDs; external connected-source search results are not valid `Notion:fetch` inputs.
- Create meeting pages with an explicit `parent` and a `pages` array.
- Query databases with `Notion:notion-query-data-sources` under a top-level `data` object, using fetched `collection://...` URLs as table names.
- When editing a page, fetch its current content first and use `Notion:notion-update-page` with supported commands such as `update_content` or `update_properties`; on the current deployed surface, use `properties: {}` for `update_content` and `content_updates: []` for `update_properties`. Do not invent insertion-only commands.

## Workflow
### 0) If Notion tools are unavailable, pause and ask the user to connect the Notion app:
1. Enable the bundled Notion app for this plugin or session.
2. Complete the Notion auth flow if prompted.
3. Start a new session if the tools still do not appear.

After the app is connected, finish your answer and tell the user to retry so they can continue with Step 1.

### 1) Gather inputs
- Ask for objective, desired outcomes/decisions, attendees, duration, date/time, and prior materials.
- Search Notion for relevant docs, past notes, specs, and action items (`Notion:search`), then fetch key pages (`Notion:fetch`).
- Capture blockers/risks and open questions up front.

### 2) Choose format
- Status/update → status template.
- Decision/approval → decision template.
- Planning (sprint/project) → planning template.
- Retro/feedback → retrospective template.
- 1:1 → one-on-one template.
- Ideation → brainstorming template.
- Use `reference/template-selection-guide.md` to confirm.

### 3) Build the agenda/pre-read
- Start from the chosen template in `reference/` and adapt sections (context, goals, agenda, owner/time per item, decisions, risks, prep asks).
- Include links to pulled Notion pages and any required pre-reading.
- Assign owners for each agenda item; call out timeboxes and expected outputs.

### 4) Enrich with research
- Add concise supplemental research where helpful: market/industry facts, benchmarks, risks, best practices.
- Keep claims cited with source links; separate fact from opinion.

### 5) Finalize and share
- Add next steps and owners for follow-ups.
- If tasks arise, create/link tasks in the relevant Notion database.
- Update the page via `Notion:notion-update-page` when details change; keep a brief changelog if multiple edits.

## References and examples
- `reference/` — template picker and meeting templates (e.g., `template-selection-guide.md`, `status-update-template.md`, `decision-meeting-template.md`, `sprint-planning-template.md`, `one-on-one-template.md`, `retrospective-template.md`, `brainstorming-template.md`).
- `examples/` — end-to-end meeting preps (e.g., `executive-review.md`, `project-decision.md`, `sprint-planning.md`, `customer-meeting.md`).
