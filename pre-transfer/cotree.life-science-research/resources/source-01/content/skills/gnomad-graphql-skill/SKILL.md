---
name: "import.codex.life-science-research.gnomad-graphql-skill"
description: "Submit compact gnomAD GraphQL requests for frequency, gene constraint, and variant context queries. Use when a user wants concise gnomAD summaries"
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
- Use `scripts/gnomad_graphql.py` for all gnomAD GraphQL work.
- For nested GraphQL results, start with `max_items=3` to `5`.
- Keep selection sets narrow and page or filter at the query level instead of asking for broad dumps.
- Use `query_path` for long GraphQL documents instead of pasting large inline queries.
- Re-run requests in long conversations instead of relying on earlier tool output.
- Treat displayed `...` in tool previews as UI truncation, not part of the real query.

## Execution behavior
- Return concise markdown summaries from the script JSON by default.
- Return raw JSON only if the user explicitly asks for machine-readable output.
- Prefer targeted queries for variant frequency, gene constraint, or transcript consequence context.
- If the user needs the full payload, set `save_raw=true` and report the saved file path.

## Input
- Read one JSON object from stdin.
- Required field: `query` or `query_path`
- Optional fields: `variables`, `max_items`, `max_depth`, `timeout_sec`, `save_raw`, `raw_output_path`
- Common gnomAD patterns:
  - `{"query":"query { meta { clinvar_release_date } }"}`
  - `{"query":"query Variant($variantId: String!, $dataset: DatasetId!) { variant(variantId: $variantId, dataset: $dataset) { variantId genome { ac an af } } }","variables":{"variantId":"1-55516888-G-GA","dataset":"gnomad_r4"},"max_items":3}`

## Output
- Success returns `ok`, `source`, `top_keys`, a compact `summary`, and `raw_output_path` when `save_raw=true`.
- Failure returns `ok=false` with `error.code` such as `invalid_json`, `invalid_input`, `network_error`, `invalid_response`, or `graphql_error`.

## Execution
```bash
echo '{"query":"query { meta { clinvar_release_date } }"}' | python scripts/gnomad_graphql.py
```

## References
- No additional runtime references are required; keep the import package limited to this file and `scripts/gnomad_graphql.py`.
