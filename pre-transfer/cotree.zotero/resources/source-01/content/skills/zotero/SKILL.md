---
name: "import.codex.zotero.zotero"
description: "Use Zotero Desktop from Codex to enable/probe the local API, search a local Zotero library, list items/collections/tags, export BibTeX, insert citation keys into LaTeX or Markdown drafts, read indexed full text when requested, and import BibTeX/RIS records into Zotero through the connector server. Use when the user mentions Zotero, citations, references.bib, BibTeX export, local Zotero API, localhost:23119, or adding citations from a Zotero library."
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

# Zotero

Use this skill to operate a user's local Zotero Desktop library from Codex.

Core helper:

```bash
python3 <plugin-root>/skills/zotero/scripts/zotero.py <command>
```

Resolve `<plugin-root>` by going two directories up from this `SKILL.md` file.

The helper is stdlib-only and follows the repo convention of running plugin Python helpers with `python3` / `#!/usr/bin/env python3`; it does not require Codex-specific runtime discovery.

## Fast starts

Check readiness in one command:

```bash
python3 <plugin-root>/skills/zotero/scripts/zotero.py status --json
```

Enable the local API and restart Zotero if needed:

```bash
python3 <plugin-root>/skills/zotero/scripts/zotero.py enable --restart
```

Search and export citation data:

```bash
python3 <plugin-root>/skills/zotero/scripts/zotero.py search "transformer" --json
python3 <plugin-root>/skills/zotero/scripts/zotero.py export-bibtex --out references.bib
```

Insert a citation from Zotero into a draft and keep `references.bib` in sync:

```bash
python3 <plugin-root>/skills/zotero/scripts/zotero.py cite --query "Attention Is All You Need" --tex paper.tex --bib references.bib --marker '<cite>'
```

## Workflow

1. Start with `status --json`. Do not rediscover prefs, ports, or profile paths manually unless the helper fails.
2. If `local_api_enabled_pref` is false, run `enable --restart` when the user asked you to operate Zotero. This updates Zotero's local preference and restarts Zotero so port `23119` comes up.
3. Use read-only local API commands for normal work:
   - `inventory` for item/collection/tag summaries.
   - `search <query>` for papers/items.
   - `export-bibtex` or `sync-bib` for `.bib` files.
   - `cite` for inserting a citation into a draft.
4. Only retrieve attachment file URLs or full text when the user asks for PDFs, attachment paths, or full-text content.
5. Treat Zotero library writes as explicit write actions. Before `import-bibtex`, `import-ris`, or connector save commands, confirm the exact record/source and destination unless the user's prompt already explicitly asked to add/import it.

## Common commands

```bash
# Readiness and route map
python3 <plugin-root>/skills/zotero/scripts/zotero.py status --json
python3 <plugin-root>/skills/zotero/scripts/zotero.py probe --json

# Library inventory
python3 <plugin-root>/skills/zotero/scripts/zotero.py inventory
python3 <plugin-root>/skills/zotero/scripts/zotero.py collections
python3 <plugin-root>/skills/zotero/scripts/zotero.py tags

# Search and export
python3 <plugin-root>/skills/zotero/scripts/zotero.py search "BERT"
python3 <plugin-root>/skills/zotero/scripts/zotero.py export-bibtex --out references.bib
python3 <plugin-root>/skills/zotero/scripts/zotero.py export-bibtex --item-key PXW99EKT
python3 <plugin-root>/skills/zotero/scripts/zotero.py citations --style apa --json

# Draft editing
python3 <plugin-root>/skills/zotero/scripts/zotero.py cite --item-key PXW99EKT --tex paper.tex --bib references.bib --marker '<cite>'
python3 <plugin-root>/skills/zotero/scripts/zotero.py cite --query "BERT" --markdown notes.md --bib references.bib --marker '<cite>'

# Attachments and full text; use only on request
python3 <plugin-root>/skills/zotero/scripts/zotero.py children PXW99EKT --json
python3 <plugin-root>/skills/zotero/scripts/zotero.py fulltext 2JAZS9U8 --out attention-fulltext.txt
python3 <plugin-root>/skills/zotero/scripts/zotero.py file-url 2JAZS9U8

# Writes to Zotero; confirm first unless explicitly requested
python3 <plugin-root>/skills/zotero/scripts/zotero.py selected-target --json
python3 <plugin-root>/skills/zotero/scripts/zotero.py import-bibtex --file new-reference.bib --yes
python3 <plugin-root>/skills/zotero/scripts/zotero.py import-ris --file new-reference.ris --yes
```

## Output standards

- For inventory/search, return title, creators, year, Zotero item key, and BibTeX key when available.
- Explain the two-key distinction when relevant: Zotero item keys like `PXW99EKT` are not the same as exported BibTeX keys like `vaswani_attention_2023`.
- For `.bib` export, return the absolute output path and entry count.
- For draft citation insertion, report the edited file, inserted citation key, and updated `.bib` path.
- For blockers, name the exact gate: Zotero app missing, local API disabled, port closed, connector unavailable, no matching item, or write not confirmed.

## Route details

Read `references/local-api-routes.md` only when you need endpoint details beyond the helper commands.
