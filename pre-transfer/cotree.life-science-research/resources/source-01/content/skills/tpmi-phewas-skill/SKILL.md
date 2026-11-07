---
name: "import.codex.life-science-research.tpmi-phewas-skill"
description: "Fetch compact TPMI PheWAS summaries for single variants by accepting rsID, GRCh37, or GRCh38 input and resolving to the required GRCh38 query. Use when a user wants concise TPMI association results for one variant"
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
- Use `scripts/tpmi_phewas.py` for all TPMI PheWAS lookups.
- Accept exactly one of `rsid`, `grch37`, `grch38`, or `variant`; resolve to the canonical GRCh38 `chr:pos-ref-alt` query before calling TPMI.
- The script accepts `max_results`; start with `max_results=10` and only increase it if the first slice is insufficient.
- Re-run the lookup in long conversations instead of relying on older tool output.
- Treat displayed `...` in tool previews as UI truncation, not literal request content.
- If the user needs the full association payload, set `save_raw=true` and report `raw_output_path` instead of pasting large arrays into chat.

## Execution behavior
- Return concise markdown summaries from the script JSON by default.
- Return the JSON verbatim only if the user explicitly asks for machine-readable output.
- Surface the canonical queried variant, total association count, and whether the results were truncated.
- Increase `max_results` gradually instead of asking for large association dumps in one call.

## Input
- Read one JSON object from stdin, or a single JSON string containing the variant.
- Required input: exactly one of `rsid`, `grch37`, `grch38`, or `variant`
- Optional fields: `max_results`, `save_raw`, `raw_output_path`, `timeout_sec`
- Common patterns:
  - `{"grch38":"6:160540105-T-C","max_results":10}`
  - `{"grch37":"6:162447146-T-C","max_results":10}`
  - `{"rsid":"rs9273363","max_results":10}`
  - `{"variant":"6:160540105:T:C","max_results":25,"save_raw":true}`

## Output
- Success returns `ok`, `source`, `input`, `query_variant`, `max_results_applied`, `association_count`, `association_count_total`, `truncated`, `associations`, `variant`, `variant_url`, `raw_output_path`, and `warnings`.
- Use `raw_output_path` when `save_raw=true`.
- Failure returns `ok=false` with `error.code` and `error.message`.

## Execution
```bash
echo '{"grch38":"6:160540105-T-C","max_results":10}' | python scripts/tpmi_phewas.py
```

## References
- No additional runtime references are required; keep the import package limited to this file and `scripts/tpmi_phewas.py`.
