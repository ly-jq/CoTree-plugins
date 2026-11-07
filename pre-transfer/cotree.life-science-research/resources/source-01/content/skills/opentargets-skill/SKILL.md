---
name: "import.codex.life-science-research.opentargets-skill"
description: "Submit compact Open Targets Platform GraphQL requests for target, disease, drug, variant, study, and search data, including associated-disease datasource heatmap matrices. Use when a user wants concise Open Targets summaries or per-datasource evidence context"
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

## Operating rules
- Use `scripts/opentargets_graphql.py` for all Open Targets GraphQL work.
- Use `scripts/opentargets_disease_heatmap.py` when the user wants the associated-disease bubble grid or a disease-by-datasource evidence matrix.
- The script accepts `max_items`; for nested GraphQL results, start with `max_items=3` to `5`.
- Keep GraphQL selection sets narrow and page connection-style fields conservatively.
- Use `query_path` for long GraphQL documents instead of pasting large inline query strings.
- Re-run requests in long conversations instead of relying on earlier tool output.
- Treat displayed `...` in tool previews as UI truncation, not part of the real query.

## Execution behavior
- Return concise markdown summaries from the script JSON by default.
- Return the JSON verbatim only if the user explicitly asks for machine-readable output.
- Prefer targeted GraphQL queries that select only the fields needed for the user task.
- Use schema introspection only when necessary; do not dump large schema payloads into chat.
- For the associated-disease heatmap, treat `datasourceScores` as evidence-source breadth/context. Do not treat heatmap breadth alone as proof of causal target assignment, mechanism, or direction of effect.

## Input
- Read one JSON object from stdin.
- Required field: `query` or `query_path`
- Optional fields: `variables`, `max_items`, `max_depth`, `timeout_sec`, `save_raw`, `raw_output_path`
- Common Open Targets patterns:
  - `{"query":"query { __typename }"}`
  - `{"query":"query searchAny($q: String!) { search(queryString: $q) { total hits { entity score object { ... on Target { id approvedSymbol } } } } }","variables":{"q":"MST1"},"max_items":3}`

## Output
- Success returns `ok`, `source`, `top_keys`, a compact `summary`, and `raw_output_path` when `save_raw=true`.
- Failure returns `ok=false` with `error.code` such as `invalid_json`, `invalid_input`, `network_error`, `invalid_response`, or `graphql_error`.

## Execution
```bash
echo '{"query":"query { __typename }"}' | python scripts/opentargets_graphql.py
```

Associated-disease heatmap helper:

```bash
echo '{
  "ensembl_id":"ENSG00000186868",
  "page_size":50,
  "max_pages":4,
  "disease_name_filter":"alzh"
}' | python scripts/opentargets_disease_heatmap.py
```

The helper paginates `associatedDiseases`, collects `datasourceScores`, and returns:

- `matrix.columns`: datasource IDs plus display labels
- `matrix.rows`: diseases with `datasource_scores`
- `summary.rows_preview`: top datasource signals per disease

Use the disease-name filter as a client-side substring filter similar to the UI. If you later need the overall association score column, inspect the GraphQL row type first before adding candidate fields such as `score` or `associationScore`.

## References
- No additional runtime references are required; keep the import package limited to this file and the bundled scripts in `scripts/`.
