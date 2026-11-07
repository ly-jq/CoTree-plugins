---
name: "import.codex.zoom.command.build-zoom-rtms-app"
description: "Implement a Zoom RTMS workflow for live media, transcript, or event-stream processing with the right stream lifecycle and backend handling."
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

# Build Zoom RTMS App

Use this command when the repo needs Zoom RTMS for live meeting or contact-center media streams, transcript processing, or backend event-stream consumption.

## Preflight

1. Inspect the codebase for existing RTMS, WebSocket, bot, worker, or stream-processing code.
2. Confirm the use case actually belongs on RTMS rather than a visible Meeting SDK bot or a post-meeting retrieval workflow.
3. Identify the stream source: meeting media, transcript stream, contact-center voice stream, or another documented RTMS surface.
4. Confirm the owning backend runtime, downstream pipeline, and required credentials without printing secrets.

## Plan

Before making changes:

- state the RTMS source surface and the downstream processing goal
- list the files that will be created or edited
- state the auth path, stream lifecycle responsibilities, and output artifacts
- state how the first working RTMS path will be verified

## Commands

1. Add or correct the RTMS connection lifecycle: connect, validate, subscribe, heartbeat, reconnect, and shutdown.
2. Keep the implementation in the backend or worker layer that owns stream processing, not in an unrelated UI surface.
3. Add the minimum parsing and buffering needed for the requested media or transcript type.
4. Wire the stream output into the existing processing pipeline, queue, or storage layer using repo-native patterns.
5. Keep RTMS-specific concerns separate from visible participant-bot logic unless the workflow explicitly needs both.
6. Avoid claiming live stream support works until the connection lifecycle and payload handling path are both checked.

## Verification

1. Re-read the stream connection code, auth handling, and downstream processing code that changed.
2. Run local build or tests where available.
3. Verify the connection lifecycle and payload handling path are coherent for the intended media type.
4. State any remaining blocker such as missing account prerequisites, stream authorization, network reachability, or downstream decoder work.

## Summary

```text
## Result
- Action: implemented or updated a Zoom RTMS workflow
- Status: success | partial | failed
- Details: source surface, files changed, auth path, verification run
```

## Next Steps

- Test the RTMS path against a real stream source in a controlled environment.
- Add richer downstream AI, analytics, or storage steps only after the base stream loop works.
- If the workflow actually needs a visible participant or meeting controls, compare against `/build-zoom-bot` or Meeting SDK before expanding scope.
