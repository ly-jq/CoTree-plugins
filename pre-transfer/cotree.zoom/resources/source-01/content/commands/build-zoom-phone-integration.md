---
name: "import.codex.zoom.command.build-zoom-phone-integration"
description: "Implement a Zoom Phone integration around APIs, Smart Embed, calling flows, and event handling."
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

# Build Zoom Phone Integration

Use this command when the repo needs Zoom Phone APIs, embedded phone experiences, CTI-style workflows, or call-related automation.

## Preflight

1. Inspect the codebase for existing phone integration code, OAuth handling, embed surfaces, and event consumers.
2. Identify whether the workflow is Smart Embed, direct API usage, call automation, CRM integration, or another phone-specific path.
3. Confirm the runtime and UI surface that will own the phone workflow.
4. Check for the required auth and event configuration without printing secrets.

## Plan

Before making changes:

- state the Phone workflow being implemented
- list the files that will be changed
- state the auth path, event path, and user interaction surface
- state how the initial phone flow will be verified

## Commands

1. Add or correct the Zoom Phone integration at the appropriate UI or backend layer.
2. Reuse existing routing, event, and API abstractions where possible.
3. Keep the first pass focused on one concrete calling or phone-data workflow.
4. Add the minimum configuration, auth handling, and event logic required for a working path.
5. Avoid blending general meeting assumptions into phone-specific workflows.

## Verification

1. Re-read the phone integration code and supporting auth or event code that changed.
2. Run local build or tests where available.
3. Verify the API, embed, or event path shape.
4. State any remaining blocker such as missing account setup, OAuth scope gaps, or runtime prerequisites.

## Summary

```text
## Result
- Action: implemented or updated a Zoom Phone integration
- Status: success | partial | failed
- Details: files changed, auth path, event path, verification run
```

## Next Steps

- Exercise one real call-related workflow end to end.
- Add CRM or analytics follow-up only after the base integration works.
- If auth is incomplete, run `/setup-zoom-oauth`.
