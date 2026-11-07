---
name: "import.codex.zoom.command.setup-zoom-websockets"
description: "Implement or correct a Zoom WebSocket event stream with connection lifecycle, auth handling, and reconnect behavior."
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

# Setup Zoom WebSockets

Use this command when the integration needs persistent Zoom event delivery instead of standard webhook callbacks.

## Preflight

1. Inspect the repository for existing WebSocket clients, event consumers, connection-state handling, and auth configuration.
2. Confirm WebSockets are justified by latency, delivery model, firewall constraints, or connection semantics.
3. Identify the event types and app configuration required for the stream.
4. Confirm the owning backend or service that will manage connect, heartbeat, reconnect, and shutdown behavior.

## Plan

Before making changes:

- state the WebSocket event stream being implemented
- list the files that will be changed
- state the auth path and connection lifecycle responsibilities
- state how the connection path will be verified

## Commands

1. Add or correct the WebSocket connection setup at the appropriate service layer.
2. Implement authentication, heartbeat, reconnect, backoff, and shutdown handling explicitly.
3. Normalize streamed events into the repo’s existing internal event contract where possible.
4. Add observability for connection state, reconnects, and dropped or delayed events.
5. Keep the first pass focused on one working event stream before layering in broader orchestration.
6. Avoid claiming the stream works until the connection lifecycle and event handling path are both checked.

## Verification

1. Re-read the connection manager, auth code, and event handler logic after changes.
2. Run local build or tests where available.
3. Verify the connect path, reconnect strategy, and event normalization path.
4. State any remaining blocker such as app subscription setup, token path, or network constraints.

## Summary

```text
## Result
- Action: implemented or updated a Zoom WebSocket event stream
- Status: success | partial | failed
- Details: connection path, auth model, event handling, verification run
```

## Next Steps

- Test the stream against real events in a controlled environment.
- If the connection path is healthy but event handling fails, narrow the downstream layer next.
- If HTTP callbacks would be simpler and sufficient, switch to `/setup-zoom-webhooks`.
