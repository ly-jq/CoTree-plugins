---
name: "import.codex.dropbox.find-dropbox-content"
description: "Find Dropbox files and folders relevant to a user request. Use when the user asks to search Dropbox, find a document, locate recent files, browse a folder, identify likely source files, or narrow down where content lives before reading, sharing, organizing, or restoring it."
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

# Find Dropbox Content

Use this skill to locate relevant Dropbox files and folders without changing anything.

## Tools

- `search`
- `list_folder`
- `get_file_metadata`

## Workflow

1. Clarify the search target only if the user request is too broad to act on.
2. Use `search` for broad keyword, title, file type, or natural-language searches.
3. When `search` returns a cursor and more results are needed, continue with `search` using the cursor only.
4. Use `list_folder` with `recursive=false` when the user names a folder or wants to browse a location.
5. When `list_folder` returns a cursor and more folder results are needed, continue with `list_folder` using the cursor only.
6. Use `get_file_metadata` for strong candidates before presenting a final recommendation.

## Output

Return the best matches first. For each result, include:

- Name
- Object type: file or folder
- Path or stable identifier
- Modified time when available
- Why it matched the request
- Any ambiguity or confidence caveat

## Safety

Do not create, copy, move, delete, restore, download, or share content. If the user asks to take one of those actions after finding content, switch to the relevant Dropbox skill.

## Good Triggers

- "Find the Q4 planning deck in Dropbox."
- "Search Dropbox for onboarding docs."
- "What files are in this folder?"
- "Find recent PDFs about the launch plan."
- "Where is the customer contract?"

## Do Not Use When

- The user already provided an exact file and wants its content inspected. Use `inspect-dropbox-file`.
- The user explicitly asks to create a shared link. Use `share-dropbox-content`.
- The user asks to add viewers or share directly with named recipients. Explain that recipient-sharing is unavailable until the required MCP tools are exposed.
- The user asks to restore or recover content. Explain that recovery is unavailable until the Dropbox restore tool is exposed.
