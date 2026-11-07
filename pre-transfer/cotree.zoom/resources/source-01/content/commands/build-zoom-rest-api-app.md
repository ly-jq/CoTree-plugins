---
name: "import.codex.zoom.command.build-zoom-rest-api-app"
description: "Implement a Zoom REST API integration with the right resources, auth path, and verification loop."
disable-model-invocation: true
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

Resource root: resolve `..` from this file's directory to locate `content/`. Replace `<plugin-resource-root>` with that actual directory before using a script; it is not a literal Shell path.

This former slash command is an explicitly requested Elyra Skill. Bind <user-supplied-arguments> / <user-argument-N> from the actual request; ask only for required missing values. There is no import-time Shell or automatic slash-command expansion.

## 工作内容

# Build Zoom REST API App

Use this command when the repo should call Zoom REST endpoints directly for meetings, users, recordings, docs-adjacent workflows, or account resources.

## Preflight

1. Inspect the codebase for existing Zoom API usage, env vars, HTTP client wrappers, and server routes.
2. Confirm the requested workflow is actually a REST API problem and not better served by Meeting SDK, Video SDK, or Webhooks.
3. Identify the runtime that will own the Zoom API calls and token lifecycle.
4. Check whether the required OAuth values and scope configuration already exist without printing secrets.

## Plan

Before making changes:

- state the exact Zoom resource or endpoint family to implement
- list the files that will be created or edited
- state the auth model, token owner, and required scopes
- state how the new API flow will be verified

## Commands

1. Inspect the existing project structure and add the Zoom API integration at the narrowest appropriate layer.
2. Reuse existing HTTP client, config, and error-handling patterns where possible.
3. Add or correct Zoom OAuth token usage, API calls, request validation, and response shaping.
4. Keep secrets out of logs and avoid leaking access tokens in output.
5. Add minimal docs or examples only where they materially help the next developer use the integration.

## Verification

1. Re-read the edited files and confirm the endpoint, auth path, and error handling are coherent.
2. Run the relevant local tests or build if available.
3. If safe credentials already exist, exercise the narrowest live or mocked API path to confirm request shape.
4. State any remaining blocker such as missing scopes, callback setup, or account permissions.

## Summary

```text
## Result
- Action: implemented or updated a Zoom REST API integration
- Status: success | partial | failed
- Details: endpoints, files changed, auth path, verification run
```

## Next Steps

- Run one end-to-end request with real credentials if not already done.
- Add webhook handoff only if the use case actually needs it.
- If auth is incomplete, run `/setup-zoom-oauth` next.
