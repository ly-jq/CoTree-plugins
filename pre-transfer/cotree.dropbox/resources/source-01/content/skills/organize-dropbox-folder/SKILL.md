---
name: "import.codex.dropbox.organize-dropbox-folder"
description: "Organize Dropbox files and folders by creating folders, copying content, or moving content into a cleaner structure. Use when the user asks to organize, archive, consolidate, restructure, copy, or move Dropbox content."
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

# Organize Dropbox Folder

Use this skill to safely organize Dropbox content through folder creation, copying, and moving.

## Tools

- `list_folder`
- `search`
- `get_file_metadata`
- `create_folder`
- `copy`
- `move`
- `check_job_status`

## Workflow

1. Understand the desired organization goal and target scope.
2. Use `list_folder` or `search` to inventory the relevant content.
3. Use `get_file_metadata` for items that may be moved or copied.
4. Draft a proposed change plan before any mutation.
5. If needed, create destination folders with `create_folder` after confirmation.
6. Use `copy` when preserving the original location matters or when the user says copy/duplicate.
7. Use `move` only when the user explicitly wants content relocated or archived.
8. Use `check_job_status` for any asynchronous copy or move job until it completes or must be reported as pending.
9. After changes, summarize all created, copied, moved, and pending paths.

## Confirmation Required

Before any mutation, confirm:

- Source paths
- Destination paths
- Whether the operation is copy or move
- Whether destination folders should be created
- Expected result after the operation

## Output

Before mutation, present a plan:

- Folders to create
- Files or folders to copy
- Files or folders to move
- Items that need clarification

After mutation, report:

- Successfully created folders
- Successfully copied items
- Successfully moved items
- Pending jobs and current status when relevant
- Any failures or skipped items

## Safety

Prefer copy over move when the user intent is ambiguous. Do not move shared folders or high-level team folders without extra confirmation. Do not delete anything; use `clean-up-dropbox-content` only when deletion is explicitly requested.

## Good Triggers

- "Organize these files into folders by client."
- "Archive last year's project folder."
- "Copy these assets into the launch folder."
- "Move all final PDFs into the Final folder."

## Do Not Use When

- The user only wants to search or inspect content. Use `find-dropbox-content` or `inspect-dropbox-file`.
- The user asks to delete content. Use `clean-up-dropbox-content`.
- The user asks to restore content. Explain that recovery is unavailable until the Dropbox restore tool is exposed.
