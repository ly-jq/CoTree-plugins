---
name: "import.codex.life-science-research.ncbi-clinicaltables-skill"
description: "Submit compact Clinical Tables NCBI Gene requests for human gene lookup, pagination, and field selection. Use when a user wants concise autocomplete-style human gene search results"
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
- Use `scripts/ncbi_gene_clinicaltables.py` for all Clinical Tables gene searches.
- The script accepts `max_items`; for search pages, start with `count=10` and `max_items=10`.
- Use `params` for endpoint options like `df`, `ef`, `sf`, `q`, `offset`, and `count`.
- Prefer `ncbi-entrez-skill` when the user wants general Entrez Gene records rather than autocomplete/search rows.
- Page with `offset` instead of asking for large pulls.
- Re-run requests in long conversations instead of relying on older tool output.
- Treat displayed `...` in tool previews as UI truncation, not literal request content.
- If the user asks for the full payload, set `save_raw=true` and report the saved file path instead of pasting large response arrays into chat.

## Execution behavior
- Return concise markdown summaries from the script JSON by default.
- Return the JSON verbatim only if the user explicitly asks for machine-readable output.
- Use `terms` for the primary search text.
- Keep `count` modest and page with `offset` instead of pulling large result sets at once.

## Input
- Read one JSON object from stdin.
- Required field: `terms`
- Optional fields: `params`, `max_items`, `max_depth`, `timeout_sec`, `save_raw`, `raw_output_path`
- Common NCBI Gene patterns:
  - `{"terms":"TP53","params":{"df":"GeneID,Symbol,description"}}`
  - `{"terms":"BRCA","params":{"count":10,"df":"chromosome,GeneID,Symbol,description,type_of_gene"},"max_items":10}`
  - `{"terms":"kinase","params":{"count":10,"offset":10,"df":"GeneID,Symbol,description"},"max_items":10}`

## Output
- Success returns `ok`, `source`, `terms`, `total`, `codes`, `display_rows`, `extra_fields`, and truncation metadata.
- Use `raw_output_path` when `save_raw=true`.
- Failure returns `ok=false` with `error.code` and `error.message`.

## Execution
```bash
echo '{"terms":"TP53","params":{"count":10,"df":"GeneID,Symbol,description"},"max_items":10}' | python scripts/ncbi_gene_clinicaltables.py
```

## References
- No additional runtime references are required; keep the import package limited to this file and `scripts/ncbi_gene_clinicaltables.py`.
