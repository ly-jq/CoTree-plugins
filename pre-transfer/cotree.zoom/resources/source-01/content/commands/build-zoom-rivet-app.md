---
name: "import.codex.zoom.command.build-zoom-rivet-app"
description: "Implement a server-side Zoom integration with Rivet modules for auth, APIs, webhooks, and deployment-safe composition."
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

# Build Zoom Rivet App

Use this command when the repo should build a server-side Zoom integration around the Rivet SDK instead of hand-rolled API and webhook plumbing.

## Preflight

1. Inspect the codebase for existing Rivet usage, server entry points, OAuth handling, webhook receivers, and deployment configuration.
2. Confirm Rivet is the intended abstraction and not just a generic backend integration that should stay with direct API and webhook code.
3. Identify the required modules: app configuration, OAuth, API clients, webhook handlers, and business workflow handlers.
4. Check whether the required environment variables and deployment model are already represented without printing secrets.

## Plan

Before making changes:

- state the Rivet workflow being implemented
- list the files that will be changed
- state the auth path, webhook path, and module composition strategy
- state how the first working Rivet path will be verified

## Commands

1. Add or correct the Rivet-based module structure at the correct server layer.
2. Implement the smallest authenticated API path and webhook receiver before composing broader multi-module behavior.
3. Keep environment handling and deployment assumptions explicit, especially for Lambda-style or serverless receivers.
4. Reuse existing repo patterns for config, logging, and secret management where possible.
5. Avoid wrapping Rivet in unnecessary abstractions that make the auth and webhook paths harder to reason about.

## Verification

1. Re-read the Rivet module setup, auth handling, and webhook integration code after changes.
2. Run local build or tests where available.
3. Verify the module wiring, auth path, and first useful API or webhook flow.
4. State any remaining blocker such as framework drift, deployment mismatch, or missing app credentials.

## Summary

```text
## Result
- Action: implemented or updated a Zoom Rivet integration
- Status: success | partial | failed
- Details: files changed, module setup, auth path, verification run
```

## Next Steps

- Exercise one real authenticated API path and one webhook flow.
- Expand to multi-module workflows only after the base path works.
- If Rivet is adding more complexity than value, fall back to direct REST plus webhook implementation.
