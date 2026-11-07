---
name: "import.codex.dropbox.share-dropbox-content"
description: "Share Dropbox files or folders by creating shared links, inspecting existing shared links, or explaining current shared-link state. Use only when the user explicitly asks to create a shared link, check access, or inspect a Dropbox shared link."
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

# Share Dropbox Content

Use this skill to create or inspect Dropbox shared links and explain shared-link state.

## Tools

- `create_shared_link`
- `list_shared_links`
- `get_shared_link_metadata`
- `get_file_metadata`
- `search`
- `list_folder`

## Workflow

1. Identify the target file or folder.
2. If the target is ambiguous, use `search` or `list_folder` and ask the user to choose.
3. Use `get_file_metadata` to confirm the exact target.
4. Use `list_shared_links` when checking current sharing state or before creating a new link if existing links matter; continue while the response indicates has_more or returns a cursor before treating the existing-link state as complete.
5. Use `get_shared_link_metadata` when the user provides or asks about a specific shared link.
6. Before calling `create_shared_link`, summarize the exact sharing plan and ask for explicit confirmation.
7. After sharing, report the resulting URL, effective access settings, and any warnings or partial failures.
8. If the user asks to add viewers, add recipients, or share directly with named people, explain that recipient-sharing is unavailable until those MCP tools are available. Offer to create a shared link instead when appropriate.

## Confirmation Required

Before creating a shared link, confirm:

- Exact target file or folder
- Link/access settings requested by the user
- Expiration, password, or download settings when supported

## Output

After a successful action, include:

- Shared link URL
- Whether the link was newly created or reused
- Effective access settings
- Any warning that existing link settings differ from requested settings
- Whether shared-link pagination was complete when existing links were checked

## Safety

Never create a link automatically after finding, downloading, or creating content. Do not claim access was granted to named recipients or viewers; recipient-sharing tools are not available.

## Good Triggers

- "Create a share link for this Dropbox folder."
- "Create a link to this file."
- "Check who can access this Dropbox link."
- "Send me a share link for the launch deck."

## Do Not Use When

- The user only wants to find a file. Use `find-dropbox-content`.
- The user only wants metadata or content summary. Use `inspect-dropbox-file`.
- The user wants to collect uploads from others. Use `collect-files-with-request`.
- The user wants to add viewers or share directly with named recipients. Explain that recipient-sharing is unavailable until the required MCP tools are exposed.
