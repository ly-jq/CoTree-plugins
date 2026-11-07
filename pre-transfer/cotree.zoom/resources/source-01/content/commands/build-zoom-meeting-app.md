---
name: "import.codex.zoom.command.build-zoom-meeting-app"
description: "Implement an embedded or managed Zoom meeting flow in the current codebase with the right SDK and auth path."
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

# Build Zoom Meeting App

Use this command when the repo needs to embed or launch real Zoom meetings with the Meeting SDK or adjacent server-side join flow.

## Preflight

1. Inspect the codebase for existing Zoom meeting code, frontend framework, backend support, and auth handling.
2. Confirm the requested experience is a real Zoom meeting and not a custom video experience that belongs on Video SDK.
3. Identify the target platform: web, mobile, desktop, or multi-platform.
4. Check whether the codebase already has the required server-side token or signature path without printing secrets.

## Plan

Before making changes:

- state the target platform and Meeting SDK surface
- list the files that will be changed
- state the join or start flow, auth path, and required backend pieces
- state how the meeting flow will be verified locally

## Commands

1. Inspect current app structure and place the meeting integration in the correct UI and server layers.
2. Add or correct Meeting SDK initialization, join or start flow, and backend auth support.
3. Keep the implementation aligned with the target platform’s established patterns instead of forcing a generic abstraction.
4. Add only the minimum UI, env wiring, and server code needed for a working meeting flow.
5. Keep secrets, tokens, and meeting credentials out of output and logs.

## Verification

1. Re-read the meeting client code and any server auth helpers that changed.
2. Run the relevant local build or tests.
3. Verify the UI path reaches the expected join or start call shape.
4. State any remaining blocker such as missing credentials, callback setup, domain config, or SDK prerequisites.

## Summary

```text
## Result
- Action: implemented or updated a Zoom meeting app flow
- Status: success | partial | failed
- Details: platform, files changed, auth path, verification run
```

## Next Steps

- Test the join or start flow with a real meeting.
- Add webhook or bot-side follow-up only if the product needs it.
- If the requirement is actually custom media control, switch to `/build-zoom-video-sdk-app`.
