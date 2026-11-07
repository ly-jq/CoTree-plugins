---
name: "import.codex.zoom.command.debug-zoom"
description: "Triage a broken Zoom integration when the failing layer is not yet obvious."
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

# Debug Zoom

Use this command when something in a Zoom integration is broken but the failure has not yet been narrowed to auth, webhooks, SDK behavior, or RTMS.

## Preflight

1. Capture the exact symptom: error text, failing endpoint, platform, runtime, and whether the failure is deterministic or intermittent.
2. Inspect the repository for the relevant Zoom integration code, env usage, event handlers, or SDK setup.
3. Note what still works versus what fails so the broken layer can be isolated.
4. If the report lacks the concrete error or failing path, ask for that evidence before making speculative changes.

## Plan

Before changing anything:

- state the most likely failing layer
- list the evidence that will be checked first
- list the repo files or runtime paths involved
- state whether the goal is diagnosis only or diagnosis plus a minimal fix

## Commands

1. Inventory the active Zoom surfaces in the failing workflow.
2. Narrow the problem to one layer: auth, REST request construction, webhook verification, WebSocket lifecycle, SDK initialization, or RTMS stream handling.
3. Inspect the smallest relevant code path and supporting configuration first.
4. Apply the minimum correction needed if the failure is clear.
5. If the layer cannot be fixed yet, produce ranked hypotheses instead of broad speculation.
6. Route to narrower follow-up commands when appropriate, such as `/debug-zoom-auth` or `/debug-zoom-webhook`.

## Verification

1. Re-run or reconstruct the failing path after any fix.
2. Confirm the diagnosis is tied to concrete repo evidence or exact runtime behavior.
3. State whether the issue is fixed, partially fixed, or blocked by missing credentials, account setup, or external platform behavior.

## Summary

```text
## Result
- Action: triaged a broken Zoom integration
- Status: success | partial | failed
- Details: failing layer, evidence checked, fix applied or ranked hypotheses
```

## Next Steps

- Use the narrower debug or setup command for the confirmed failing layer.
- If the architecture itself is wrong, run `/plan-zoom-product` or `/plan-zoom-integration`.
- If the repo is healthy but the client integration path is wrong, switch to the matching build command.
