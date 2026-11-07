---
name: "import.codex.dropbox.inspect-dropbox-file"
description: "Inspect a Dropbox file or folder by checking metadata, shared links, and file content when needed. Use when the user asks what a file is, whether it is shared, when it changed, what access links exist, or asks to read/analyze a Dropbox file."
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

# Inspect Dropbox File

Use this skill to understand a Dropbox file or folder before summarizing, comparing, sharing, restoring, or organizing it.

## Tools

- `get_file_metadata`
- `fetch`
- `list_shared_links`
- `get_shared_link_metadata`
- `search`
- `list_folder`

## Workflow

1. Identify the target file or folder from the user request.
2. If the target is ambiguous, use `search` or `list_folder` to find likely matches.
3. Call `get_file_metadata` for the chosen item.
4. If the user asks about content, summary, extraction, or analysis, use `fetch` for files.
5. If the user asks about version history or rollback options, explain that the current Dropbox MCP tools do not expose revision listing or restore operations.
6. If the user asks about sharing or access, use `list_shared_links`; continue while the response indicates has_more or returns a cursor before claiming the shared-link listing is complete.
7. If the user provides a Dropbox shared link or asks about a specific link, use `get_shared_link_metadata`.

## Output

Summarize only the details relevant to the user request. Include:

- Name and path
- File or folder type
- Size and modified time when available
- Sharing/link status when relevant, including whether shared-link pagination is complete
- Version-history limitation when relevant
- Fetched content summary when relevant
- Recommended next action, if the user asked for one

## Safety

This is a read-only workflow. Do not create links, change sharing, copy, move, delete, or restore content. If the user asks for a mutation, explain the intended action and switch to the relevant Dropbox skill.

## Good Triggers

- "What is this Dropbox file?"
- "Summarize this file."
- "Check whether this folder is shared."
- "Show me the revision history."
- "When was this document last updated?"

## Do Not Use When

- The user only wants to search or browse. Use `find-dropbox-content`.
- The user wants to create a shared link or inspect shared-link state. Use `share-dropbox-content`.
- The user wants to add viewers or share directly with named recipients. Explain that recipient-sharing is unavailable until the required MCP tools are exposed.
- The user wants to restore a revision. Explain that recovery is unavailable until the Dropbox restore tool is exposed.
