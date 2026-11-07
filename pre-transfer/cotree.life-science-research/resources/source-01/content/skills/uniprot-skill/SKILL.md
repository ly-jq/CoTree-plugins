---
name: "import.codex.life-science-research.uniprot-skill"
description: "Submit compact UniProt REST API requests for UniProtKB, UniRef, UniParc, and FASTA stream endpoints. Use when a user wants concise UniProt summaries; save raw JSON or FASTA only on request."
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
- Use `scripts/rest_request.py` for all UniProt API calls.
- Use `base_url=https://rest.uniprot.org`.
- The script accepts `max_items`; for search endpoints, start with API `size=10` and `max_items=10`.
- Single accession or cluster lookups usually do not need `max_items`.
- Re-run requests in long conversations instead of relying on older tool output.
- Treat displayed `...` in tool previews as UI truncation, not part of the real request.
- If the user asks for full JSON or FASTA, set `save_raw=true` and report the saved file path instead of pasting the payload into chat.

## Execution behavior
- Return concise markdown summaries from the script JSON by default.
- Return the script JSON verbatim only if the user explicitly asks for machine-readable output.
- Prefer these paths: `uniprotkb/search`, `uniprotkb/<accession>`, `uniref/<cluster>`, `uniparc/search`, and `uniprotkb/stream`.
- For `stream`, use `response_format=text` so the script returns only a short `text_head` unless raw output is requested.

## Input
- Read one JSON object from stdin.
- Required fields: `base_url`, `path`
- Optional fields: `method`, `params`, `headers`, `json_body`, `form_body`, `record_path`, `response_format`, `max_items`, `max_depth`, `timeout_sec`, `save_raw`, `raw_output_path`
- Common UniProt patterns:
  - `{"base_url":"https://rest.uniprot.org","path":"uniprotkb/search","params":{"query":"gene:TP53 AND organism_id:9606","fields":"accession,gene_names","size":10,"format":"json"},"record_path":"results","max_items":10}`
  - `{"base_url":"https://rest.uniprot.org","path":"uniprotkb/P04637","params":{"format":"json"}}`
  - `{"base_url":"https://rest.uniprot.org","path":"uniprotkb/stream","params":{"query":"organism_id:562","format":"fasta","size":2},"response_format":"text"}`

## Output
- Success returns `ok`, `source`, `path`, `method`, `status_code`, `warnings`, and either compact `records`, a compact `summary`, or `text_head`.
- Use `raw_output_path` when `save_raw=true`.
- Failure returns `ok=false` with `error.code` and `error.message`.

## Execution
```bash
echo '{"base_url":"https://rest.uniprot.org","path":"uniprotkb/search","params":{"query":"gene:TP53 AND organism_id:9606","fields":"accession,gene_names","size":10,"format":"json"},"record_path":"results","max_items":10}' | python scripts/rest_request.py
```

## References
- No additional runtime references are required; keep the import package limited to this file and `scripts/rest_request.py`.
