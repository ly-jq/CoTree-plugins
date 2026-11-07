---
name: "import.codex.zoom.command.plan-zoom-product"
description: "Choose the right Zoom product surface for a use case and explain the tradeoffs clearly."
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

# Plan Zoom Product

Use this command when the repo or product idea needs the right Zoom surface selected before implementation begins.

## Preflight

1. Inspect the repository for any existing Zoom integration code, SDK packages, API routes, or webhooks.
2. Capture the user goal in concrete terms: automation, embedded meetings, custom video, in-client app behavior, event delivery, live media, or AI tooling.
3. Identify hard constraints that affect product choice: target platform, required UX, hosting model, latency, account model, and whether the app runs inside or outside Zoom.
4. If the repo already uses one Zoom surface, note it before recommending a different one.

## Plan

Before recommending anything:

- list the candidate Zoom surfaces that fit the problem
- state the primary decision criteria
- state whether the output is read-only guidance or includes follow-on implementation
- state which path will be recommended unless the repo evidence contradicts it

## Commands

1. Inventory existing Zoom-related code with `rg` over known Zoom SDK names, API clients, and webhook handlers.
2. Classify the problem into the smallest correct Zoom surface: REST API, Webhooks, WebSockets, Meeting SDK, Video SDK, Zoom Apps SDK, RTMS, Phone, Contact Center, Virtual Agent, or a hybrid.
3. Recommend one primary surface and only the minimum supporting pieces required.
4. Explain why adjacent alternatives are worse for this exact case.
5. Keep the answer tied to the current repo and delivery goal rather than giving a generic product catalog.

## Verification

1. Confirm the recommendation matches the user’s actual product goal and the repo’s current shape.
2. Call out any missing evidence or assumptions that could change the decision.
3. Verify the recommendation includes the owning auth model and any mandatory supporting components.

## Summary

```text
## Result
- Action: selected the right Zoom product surface
- Status: success | partial | failed
- Details: recommended surface, supporting pieces, tradeoffs, assumptions
```

## Next Steps

- If the surface is chosen, run the matching build or setup command next.
- If the product still spans multiple Zoom surfaces, run `/plan-zoom-integration`.
- If the decision depends on missing constraints, gather those before implementing.
