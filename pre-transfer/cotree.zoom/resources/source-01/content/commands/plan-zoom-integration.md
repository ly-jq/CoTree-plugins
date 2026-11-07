---
name: "import.codex.zoom.command.plan-zoom-integration"
description: "Turn a Zoom product idea into a practical build plan with auth, architecture, milestones, and risk calls."
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

# Plan Zoom Integration

Use this command when the right Zoom surface is mostly clear and the next step is a concrete delivery plan.

## Preflight

1. Inspect the repository for current Zoom code, deployment shape, env templates, auth paths, and event or media handling.
2. Capture the target user flow, success criteria, and the concrete business outcome.
3. Identify the owning Zoom surface or surfaces and any external systems the integration must connect to.
4. Note hard constraints early: platform, OAuth app type, webhook reachability, SDK environment limits, or marketplace review assumptions.

## Plan

Before producing the build plan:

- state the Zoom surfaces in scope
- state the expected auth and event model
- state the major implementation phases
- state whether the plan is greenfield, retrofit, or repair on top of an existing integration

## Commands

1. Inventory the current repo and identify which parts can be reused versus what must be added.
2. Define the integration architecture: frontend, backend, auth owner, event flow, and any live media components.
3. Define the required Zoom app type, scopes, callback paths, and token lifecycle expectations.
4. Break the implementation into phases: smallest working path first, then reliability, observability, and polish.
5. Call out the highest-risk dependencies early instead of burying them under tasks.
6. End with the smallest deliverable that proves the architecture works.

## Verification

1. Confirm the plan includes architecture, auth, scopes, implementation phases, and top risks.
2. Verify the proposed sequence matches the repo’s current state and the user’s goal.
3. Distinguish confirmed repo facts from assumptions or unresolved questions.

## Summary

```text
## Result
- Action: produced a Zoom integration build plan
- Status: success | partial | failed
- Details: architecture, auth model, phases, risks, first milestone
```

## Next Steps

- Run the most relevant build or setup command for phase one.
- If the owning surface is still unclear, run `/plan-zoom-product`.
- If the repo already fails in one layer, run `/debug-zoom` before implementing further.
