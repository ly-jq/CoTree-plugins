---
name: "import.codex.dropbox.collect-files-with-request"
description: "Create, inspect, and manage Dropbox file requests for collecting uploads from other people. Use when the user asks to collect files, request uploads, create an upload portal, check a file request, or list existing file requests."
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

# Collect Files With Request

Use this skill to help users collect files from others through Dropbox file requests.

## Tools

- `create_file_request`
- `get_file_request`
- `list_file_requests`
- `create_folder`
- `get_file_metadata`
- `list_folder`

## Workflow

1. Determine whether the user wants to create a new file request, inspect one request, or list existing requests.
2. For a new request, identify the destination folder.
3. Do not use a team root, such as `/`, or the user's personal root, such as `/FirstName LastName`, as the destination. Dropbox requires the file request destination to be a child folder under that folder, such as `/FirstName LastName/Invoices`.
4. If the requested destination is a team root or the user's personal root, ask the user to confirm a child folder under that folder.
5. If the destination folder does not exist and the user wants it created, use `create_folder` only after explicit confirmation.
6. Before calling `create_file_request`, confirm the title, destination folder, deadline if applicable, and whether the request should be open or closed if that option is available.
7. Use `get_file_request` for a known raw request ID.
8. Use `list_file_requests` when the user asks for existing requests or cannot identify one.
9. After creating or finding a request, explain the request URL and where uploaded files will land.

## Confirmation Required

Before creating a file request, confirm:

- Request title
- Destination folder, confirmed to be a child folder under any requested team root or the user's personal root
- Deadline, if requested
- Any access or open/closed setting supported by the tool

Before creating a destination folder, confirm:

- Exact folder path
- Whether parent folders already exist
- That the folder is not a team root, such as `/`, or the user's personal root

## Output

Return:

- File request title
- Request URL or identifier
- Destination folder
- Status
- Deadline, if any
- Any action the user still needs to take

## Safety

Do not create folders or file requests without explicit confirmation. Do not assume uploaded files are private or reviewed; describe the destination and access implications clearly. Dropbox does not allow file requests at a team root, such as `/`, or the user's personal root; ask the user to confirm a child folder under that folder and do not retry with a guessed folder.

## Good Triggers

- "Create a Dropbox file request for vendor invoices."
- "Make an upload link for candidates to submit portfolios."
- "Show my open file requests."
- "Check the status of this file request."

## Do Not Use When

- The user wants to share existing content. Use `share-dropbox-content`.
- The user wants to organize existing files. Use `organize-dropbox-folder`.
- The user wants to recover deleted files. Explain that recovery is unavailable until the Dropbox restore tool is exposed.
