---
name: "import.codex.notion.notion-research-documentation"
description: "Research across Notion and synthesize into structured documentation; use when gathering info from multiple Notion sources to produce briefs, comparisons, or reports with citations."
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

# Research & Documentation

Pull relevant Notion pages, synthesize findings, and publish clear briefs or reports (with citations and links to sources).

## Quick start
1) Find sources with `Notion:search` using targeted queries; confirm scope with the user.
2) Fetch pages via `Notion:fetch`; note key sections and capture citations (`reference/citations.md`).
3) Choose output format (brief, summary, comparison, comprehensive report) using `reference/format-selection-guide.md`.
4) Draft in Notion with `Notion:notion-create-pages` using the matching template (quick, summary, comparison, comprehensive).
5) Link sources and add a references/citations section; update as new info arrives with `Notion:notion-update-page`.

## Tool-call guardrails
- Notion tool availability can vary by workspace. If a Notion MCP call returns `Tool <name> not found`, treat that tool as unavailable for the rest of the current task. Do not retry it with different arguments or call it again later; use `Notion:search` and `Notion:fetch` where sufficient.
- Use one literal search query per `Notion:search` call and include `filters: {}` when no narrower filter is needed.
- Only fetch Notion page, database, or data-source URLs/IDs. Search results can include external connected-source URLs, which are not valid `Notion:fetch` inputs.
- Create output pages with an explicit `parent` and a `pages` array.
- When updating an existing report, fetch it first and use `Notion:notion-update-page` with `update_content`, `properties: {}`, and search-and-replace pairs. For property-only updates, use `update_properties` with `content_updates: []`. The current deployed schema expects both top-level fields even when one is unused. Do not invent insertion-only commands.

## Workflow
### 0) If Notion tools are unavailable, pause and ask the user to connect the Notion app:
1. Enable the bundled Notion app for this plugin or session.
2. Complete the Notion auth flow if prompted.
3. Start a new session if the tools still do not appear.

After the app is connected, finish your answer and tell the user to retry so they can continue with Step 1.

### 1) Gather sources
- Search first (`Notion:search`); refine queries, and ask the user to confirm if multiple results appear.
- Fetch relevant pages (`Notion:fetch`), skim for facts, metrics, claims, constraints, and dates.
- Track each source URL/ID for later citation; prefer direct quotes for critical facts.

### 2) Select the format
- Quick readout → quick brief.
- Single-topic dive → research summary.
- Option tradeoffs → comparison.
- Deep dive / exec-ready → comprehensive report.
- See `reference/format-selection-guide.md` for when to pick each.

### 3) Synthesize
- Outline before writing; group findings by themes/questions.
- Note evidence with source IDs; flag gaps or contradictions.
- Keep user goal in view (decision, summary, plan, recommendation).

### 4) Create the doc
- Pick the matching template in `reference/` (brief, summary, comparison, comprehensive) and adapt it.
- Create the page with `Notion:notion-create-pages`; include title, summary, key findings, supporting evidence, and recommendations/next steps when relevant.
- Add citations inline and a references section; link back to source pages.

### 5) Finalize & handoff
- Add highlights, risks, and open questions.
- If the user needs follow-ups, create tasks or a checklist in the page; link any task database entries if applicable.
- Share a short changelog or status using `Notion:notion-update-page` when updating.

## References and examples
- `reference/` — search tactics, format selection, templates, and citation rules (e.g., `advanced-search.md`, `format-selection-guide.md`, `research-summary-template.md`, `comparison-template.md`, `citations.md`).
- `examples/` — end-to-end walkthroughs (e.g., `competitor-analysis.md`, `technical-investigation.md`, `market-research.md`, `trip-planning.md`).
