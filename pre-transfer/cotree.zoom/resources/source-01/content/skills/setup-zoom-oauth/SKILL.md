---
name: "import.codex.zoom.setup-zoom-oauth"
description: "Use when setting up OAuth."
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

# /setup-zoom-oauth

Use this skill when auth is the blocker or when auth choices will shape the entire integration.

## Scope

- App type selection
- OAuth grant selection
- Scope planning
- Token exchange and refresh
- Auth debugging and environment assumptions

## Workflow

1. Determine the app model and who is authorizing whom.
2. Choose the correct grant flow.
3. Identify minimum scopes for the user flow.
4. Define token storage and refresh behavior.
5. Route into the deepest relevant reference docs only after the above is clear.

## Primary References

- [oauth](../oauth/SKILL.md)
- [general](../general/SKILL.md)
- [rest-api](../rest-api/SKILL.md)

## Common Mistakes

- Picking a grant before clarifying the actor and tenant model
- Asking for broad scopes before confirming the exact workflow
- Forgetting refresh-token behavior and token lifecycle handling
- Reusing an old refresh token after a successful refresh instead of storing the newly returned one
- Treating auth failures as API failures without checking app configuration first
