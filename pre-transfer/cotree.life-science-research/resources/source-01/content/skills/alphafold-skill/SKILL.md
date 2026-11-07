---
name: "import.codex.life-science-research.alphafold-skill"
description: "Submit compact AlphaFold Protein Structure Database API requests for prediction, UniProt summary, sequence summary, and annotation lookups. Use when a user wants AlphaFold metadata or concise structure summaries"
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
- Use `scripts/rest_request.py` for all AlphaFold API calls.
- Use `base_url=https://alphafold.ebi.ac.uk/api`.
- The script accepts `max_items`, but set it explicitly only when trimming array-heavy responses; single-entry lookups usually do not need it.
- For `sequence/summary` or `annotations`, start around `max_items=3` to `5`.
- Re-run the request if the conversation is long instead of trusting older tool output.
- Treat displayed `...` in tool previews as UI truncation, not part of the real request.
- If the user asks for full JSON, set `save_raw=true` and report the saved file path instead of pasting the payload into chat.

## Execution behavior
- Return concise markdown summaries from the script JSON by default.
- Return the script JSON verbatim only if the user explicitly asks for machine-readable output.
- Prefer these paths: `prediction/<qualifier>`, `uniprot/summary/<qualifier>.json`, `sequence/summary`, and `annotations/<qualifier>.json`.
- Keep sequence-style inputs compact and prefer rerunning instead of copying prior output back into context.

## Input
- Read one JSON object from stdin.
- Required fields: `base_url`, `path`
- Optional fields: `method`, `params`, `headers`, `json_body`, `form_body`, `record_path`, `response_format`, `max_items`, `max_depth`, `timeout_sec`, `save_raw`, `raw_output_path`
- Common AlphaFold patterns:
  - `{"base_url":"https://alphafold.ebi.ac.uk/api","path":"prediction/Q5VSL9"}`
  - `{"base_url":"https://alphafold.ebi.ac.uk/api","path":"uniprot/summary/Q5VSL9.json"}`
  - `{"base_url":"https://alphafold.ebi.ac.uk/api","path":"annotations/Q5VSL9.json","params":{"type":"MUTAGEN"},"max_items":3}`

## Output
- Success returns `ok`, `source`, `path`, `method`, `status_code`, `warnings`, and either compact `records` or a compact `summary`.
- Use `raw_output_path` when `save_raw=true`.
- Failure returns `ok=false` with `error.code` such as `invalid_json`, `invalid_input`, `network_error`, or `invalid_response`.

## Execution
```bash
echo '{"base_url":"https://alphafold.ebi.ac.uk/api","path":"prediction/Q5VSL9"}' | python scripts/rest_request.py
```

## References
- No additional runtime references are required; keep the import package limited to this file and `scripts/rest_request.py`.
