---
name: "import.codex.zoom.build-zoom-team-chat-app"
description: "Use when building Team Chat."
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

# Build Zoom Team Chat App

Use this skill when the target surface is Zoom Team Chat. First decide whether the integration is user-scoped messaging, a chatbot, an interactive message-card workflow, or a webhook-driven automation.

## Workflow

1. Choose the API surface: Team Chat API for user-scoped actions, Chatbot API for bot identity and chatbot workflows.
2. Confirm app type, scopes, role enablement, and whether the account has Zoom for Developers enabled.
3. Model message structure before coding: plain messages, rich cards, buttons, dropdowns, forms, slash commands, and threaded replies.
4. Implement OAuth and token refresh separately from message sending, with clear storage boundaries.
5. Add webhook handlers for interactivity and lifecycle events with signature verification and retry-safe processing.
6. Debug by checking JID formats, channel membership, bot installation, scopes, role settings, and message-card payload shape.

## References

- Full preserved guide: [references/full-guide.md](references/full-guide.md)
- API selection: [concepts/api-selection.md](concepts/api-selection.md)
- Message structure: [concepts/message-structure.md](concepts/message-structure.md)
- Message cards: [references/message-cards.md](references/message-cards.md)
- Scopes: [references/scopes.md](references/scopes.md)
- Chatbot setup: [examples/chatbot-setup.md](examples/chatbot-setup.md)
- Common issues: [troubleshooting/common-issues.md](troubleshooting/common-issues.md)
