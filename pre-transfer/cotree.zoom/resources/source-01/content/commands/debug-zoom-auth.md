---
name: "import.codex.zoom.command.debug-zoom-auth"
description: "Isolate and fix Zoom authentication failures across OAuth, SDK signatures, and token refresh paths."
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

# Debug Zoom Auth

Use this command when a Zoom login flow, token exchange, or signature flow is failing and you need a concrete failure diagnosis.

## Preflight

1. Capture the exact failing symptom: error text, failing endpoint, affected surface, and whether the failure happens at authorize, callback, token exchange, refresh, or SDK join time.
2. Inspect the repository for the auth implementation, env var usage, callback handling, and token lifecycle code.
3. Identify the auth model in use: user-level OAuth, server-to-server or service auth where applicable, or SDK signature and token flows.
4. Confirm the presence of required config values without printing secrets.
5. If the issue report lacks the concrete error, ask for it before making speculative auth changes.

## Plan

Before changing anything:

- name the most likely failing layer
- list the evidence that will be checked
- list the files and commands involved
- state whether the workflow is read-only diagnosis or fix plus verification

## Commands

1. Inspect env and source usage for mismatched client IDs, redirect URIs, scope lists, token endpoints, or signature inputs.
2. For OAuth failures, verify exact redirect URI matching, token exchange parameters, and refresh-token rotation behavior.
3. For SDK auth failures, verify the expected server-side signature or token generation path for the specific SDK.
4. If the failure is caused by client capability mismatch, say that directly instead of pretending it is a token bug.
6. Apply only the minimum correction required to fix the identified layer.

## Verification

1. Re-run the failing path or reconstruct the exact auth request shape.
2. Confirm the corrected file, env var name, redirect URI, or server URL now matches the intended configuration.
3. If the failure persists, tighten the diagnosis to the next concrete layer rather than broadening scope.
4. State whether the issue is fixed, partially fixed, or blocked by missing credentials or external platform behavior.

## Summary

```text
## Result
- Action: diagnosed or fixed a Zoom auth failure
- Status: success | partial | failed
- Details: failing layer, evidence checked, fix applied, remaining blocker
```

## Next Steps

- Re-run the failing flow with the corrected auth path.
- If the issue is webhook-related after auth succeeds, run `/debug-zoom-webhook`.
