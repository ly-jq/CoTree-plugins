---
name: "import.codex.zoom.build-zoom-rest-api-app"
description: "Use when calling REST APIs."
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

# Build Zoom REST API App

Use this skill when the task needs deterministic Zoom API calls or resource management from application code.

## Workflow

1. Define the resource and actor: user, meeting, webinar, recording, docs, chat, phone, account, or admin-level workflow.
2. Select the endpoint and required scopes from the reference files before coding.
3. Confirm auth fit: user-level OAuth for user-owned resources, account-level OAuth for admin workflows, and only use server-to-server OAuth where the target API documents support for it.
4. Implement narrow API wrappers with explicit pagination, retry, idempotency, and rate-limit handling.
5. Treat webhook processing as a separate event-ingestion path with signature verification and replay protection.
6. Debug by checking token audience, missing scopes, resource ownership, account settings, API enablement, and rate-limit headers.

## References

- Full preserved guide: [references/full-guide.md](references/full-guide.md)
- API architecture: [concepts/api-architecture.md](concepts/api-architecture.md)
- Authentication flows: [concepts/authentication-flows.md](concepts/authentication-flows.md)
- Rate limits: [references/rate-limits.md](references/rate-limits.md)
- Meetings: [references/meetings.md](references/meetings.md)
- Recordings: [references/recordings.md](references/recordings.md)
- Users: [references/users.md](references/users.md)
- Token and scope playbook: [troubleshooting/token-scope-playbook.md](troubleshooting/token-scope-playbook.md)
