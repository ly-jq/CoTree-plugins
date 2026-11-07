---
name: "import.codex.zoom.command.setup-zoom-webhooks"
description: "Implement or correct a Zoom webhook receiver with endpoint validation, signature verification, and reliable delivery handling."
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

# Setup Zoom Webhooks

Use this command when the integration receives Zoom events over HTTP and needs a correct webhook receiver path.

## Preflight

1. Inspect the repository for existing webhook routes, signature verification helpers, queueing, and downstream event handlers.
2. Identify the event types and the Zoom app or account scope that owns the subscription.
3. Confirm the public endpoint shape, validation requirements, and webhook secret env var names without printing secrets.
4. If the repo actually needs low-latency persistent delivery instead of HTTP callbacks, say so before proceeding and compare against WebSockets.

## Plan

Before making changes:

- state the event types and endpoint path being implemented
- list the files that will be changed
- state the validation, signature, and retry-handling approach
- state how the webhook flow will be verified

## Commands

1. Add or correct the webhook receiver route at the appropriate backend layer.
2. Implement endpoint validation and signature verification before business logic.
3. Keep handlers idempotent and preserve delivery metadata needed for replay protection or debugging.
4. Separate ingestion from slow downstream work when reliability matters.
5. Reuse existing logging, queue, and secret-management patterns where possible.
6. Avoid claiming the webhook path works until validation and signature handling are both checked.

## Verification

1. Re-read the webhook route, validation logic, and signature helper after changes.
2. Run local build or tests where available.
3. Verify the endpoint validation path and the signed-event path independently.
4. State any remaining blocker such as public reachability, missing app configuration, or subscription settings.

## Summary

```text
## Result
- Action: implemented or updated a Zoom webhook receiver
- Status: success | partial | failed
- Details: route, event types, signature path, verification run
```

## Next Steps

- Send or replay one real event through the receiver.
- If delivery reaches the route but fails later, run `/debug-zoom-webhook`.
- If auth or app setup is missing, run `/setup-zoom-oauth`.
