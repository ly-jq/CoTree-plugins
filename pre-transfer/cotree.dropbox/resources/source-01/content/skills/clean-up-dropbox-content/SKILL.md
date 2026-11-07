---
name: "import.codex.dropbox.clean-up-dropbox-content"
description: "Clean up Dropbox content by identifying obsolete, duplicate, temporary, or unwanted files and deleting only after explicit review. Use when the user explicitly asks to delete, remove, or clean up Dropbox files or folders."
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

# Clean Up Dropbox Content

Use this skill for careful deletion workflows in Dropbox.

## Tools

- `search`
- `list_folder`
- `get_file_metadata`
- `list_shared_links`
- `copy`
- `delete`
- `check_job_status`

## Workflow

1. Confirm the cleanup goal and scope.
2. Use `search` or `list_folder` to identify candidate content.
3. Use `get_file_metadata` to verify each deletion candidate.
4. Use `list_shared_links` when deleting shared content could affect others.
5. If the user may need rollback context, explain that the current Dropbox MCP tools do not expose revision listing or restore operations.
6. If the user wants to preserve a copy first, confirm the exact destination, call `copy`, and use `check_job_status` for any asynchronous copy job until it completes successfully.
7. After any requested copy has completed successfully, present a deletion review list and ask for explicit confirmation.
8. Call `delete` only for the exact confirmed items.
9. Use `check_job_status` for any asynchronous copy or deletion job until it completes or must be reported as pending.
10. Report every copied, deleted, skipped, pending, or failed item.

## Confirmation Required

Before deleting anything, confirm:

- Exact paths or stable identifiers
- Whether each item is a file or folder
- Whether the item appears shared
- Why it is safe to delete
- Exact copy destination, if the user wants to preserve a copy first

## Output

Before deletion, present:

- Candidate path
- Type
- Modified time when available
- Sharing status when relevant
- Copy destination when preserving a copy first
- Reason it appears safe to delete

After deletion, present:

- Copied items when relevant
- Deleted items
- Pending items and job status when relevant
- Failed items and reason
- Items skipped because they were ambiguous or risky

## Safety

Never delete based only on a broad pattern like "old files" or "duplicates" without listing exact targets. Never delete a parent folder when the user confirmed only child files. If confidence is not high, stop and ask the user to choose.

## Good Triggers

- "Delete these Dropbox files."
- "Clean up duplicate PDFs in this folder."
- "Remove obsolete draft files."
- "Delete temporary exports from Dropbox."

## Do Not Use When

- The user wants to move content to an archive. Use `organize-dropbox-folder`.
- The user wants to recover content. Explain that recovery is unavailable until the Dropbox restore tool is exposed.
- The user only wants a list of cleanup candidates and no deletion. Use `find-dropbox-content` or `inspect-dropbox-file`.
