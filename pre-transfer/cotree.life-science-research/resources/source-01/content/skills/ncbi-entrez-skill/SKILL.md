---
name: "import.codex.life-science-research.ncbi-entrez-skill"
description: "Submit compact NCBI Entrez E-Utilities requests for PubMed, Gene, Protein, Nucleotide, PMC metadata, and GEO metadata workflows. Use when a user wants concise Entrez search, fetch, summary, or link results; save raw JSON or XML only on request."
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
- Use `scripts/ncbi_entrez.py` for all Entrez calls in this package.
- Use explicit `endpoint` values such as `esearch`, `esummary`, `efetch`, `elink`, or `einfo`.
- Search-style Entrez calls are better with `retmax=10` and `max_items=10`.
- GEO is nested under this skill. Use `db=gds` or `db=geoprofiles` for GEO metadata and load `references/geo.md` only when the user is specifically asking about GEO.
- BLAST workflows belong in `ncbi-blast-skill`. PMC Open Access workflows belong in `ncbi-pmc-skill`. Datasets v2 workflows belong in `ncbi-datasets-skill`.
- Re-run requests in long conversations instead of relying on older tool output.
- Treat displayed `...` in tool previews as UI truncation, not literal request content.

## Execution behavior
- Return concise markdown summaries from the script output by default.
- In final user-facing summaries, never display a bare PMID or DOI. Render every PMID as a Markdown link in the form `[PMID <PMID>](https://pubmed.ncbi.nlm.nih.gov/<PMID>/)` and every DOI as `[<DOI>](https://doi.org/<DOI>)`, including in tables, bullets, parentheticals, and source lists.
- Return raw JSON or XML only if the user explicitly asks for machine-readable output.
- Prefer targeted endpoint calls instead of broad unfiltered dumps.
- If the user needs the full raw response, set `save_raw=true` and report the saved file path.

## Input
- Read one JSON object from stdin.
- Required field: `endpoint`
- Optional fields: `params`, `record_path`, `response_format`, `max_items`, `max_depth`, `timeout_sec`, `save_raw`, `raw_output_path`
- Common Entrez patterns:
  - `{"endpoint":"esearch","params":{"db":"pubmed","term":"KRAS AND colorectal cancer","retmode":"json","retmax":10},"max_items":10}`
  - `{"endpoint":"esummary","params":{"db":"gene","id":"7157","retmode":"json"},"max_items":10}`
  - `{"endpoint":"efetch","params":{"db":"protein","id":"NP_000537.3","retmode":"xml"},"response_format":"xml","max_items":10}`
  - `{"endpoint":"elink","params":{"dbfrom":"gds","db":"pubmed","id":"200000001","retmode":"json"},"max_items":10}`

## Output
- Success returns `ok`, `source`, endpoint metadata, and either compact `records`, a compact `summary`, or `text_head`.
- Use `raw_output_path` when `save_raw=true`.
- Failure returns `ok=false` with `error.code` and `error.message`.

## Execution
```bash
echo '{"endpoint":"esearch","params":{"db":"gene","term":"TP53[gene] AND human[orgn]","retmode":"json","retmax":10},"max_items":10}' | python scripts/ncbi_entrez.py
```

## References
- Load `references/geo.md` only when the user specifically needs GEO query patterns.
- Keep the import package limited to this file, `references/geo.md`, and `scripts/ncbi_entrez.py`.
