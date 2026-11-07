---
name: "import.codex.zoom.command.zoom-integration-doctor"
description: "Run a read-first audit of a Zoom integration and report the most important architecture, auth, eventing, and SDK risks."
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

# Zoom Integration Doctor

Use this command for a broad diagnostic pass when a repo already contains Zoom integration code and you want a prioritized assessment before making changes.

## Preflight

1. Inventory the repository for Zoom-related files, env vars, SDK packages, and webhook routes.
2. Identify which Zoom surfaces are in play: REST API, Meeting SDK, Video SDK, Webhooks, WebSockets, Phone, or Contact Center.
3. Confirm whether the user wants a read-only audit or is also authorizing fixes in the same pass.
4. Check for dirty working tree and call it out if changes could complicate attribution.

## Plan

Before doing the audit:

- list the surfaces that will be reviewed
- state whether the audit is read-only or includes fixes
- state the ranking criteria: correctness, auth safety, architectural fit, and maintainability

## Commands

1. Inventory the active Zoom surfaces and determine whether the product choice matches the use case.
2. Review auth handling for app model, scopes, secret storage, redirect handling, and token lifecycle.
3. Review eventing for webhook signature handling, retries, or WebSocket suitability.
4. Review SDK usage for version drift, wrong surface choice, or incorrect server-side dependencies.
5. Review integration boundaries for unnecessary coupling, unclear ownership, and avoidable auth complexity.
6. Report findings ordered by severity. Do not bury the top risks under implementation detail.
7. Only make code changes if the user explicitly wants fixes applied in the same run.

## Verification

1. Confirm every reported finding points to concrete file or config evidence.
2. If fixes were applied, re-read the edited files and summarize the before or after state.
3. Distinguish confirmed issues from assumptions or missing evidence.

## Summary

```text
## Result
- Action: completed a Zoom integration audit
- Status: success | partial | failed
- Details: surfaces reviewed, top risks, fixes applied if any
```

## Next Steps

- Apply the highest-severity fixes first.
- Use the narrower setup or debug commands for the affected layer.
- Re-run the doctor after major auth or eventing changes to confirm the risk list shrank.
