---
name: "import.codex.zoom.command.build-zoom-bot"
description: "Implement a Zoom meeting bot, recorder, or real-time media workflow in the current codebase."
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

# Build Zoom Bot

Use this command when the repo needs to join meetings programmatically, capture media, process transcripts, or automate meeting-time behavior.

## Preflight

1. Inspect the codebase for existing bot, worker, Meeting SDK, RTMS, or media-processing code.
2. Identify whether the bot is joining meetings, consuming live media, processing recordings, or combining multiple paths.
3. Confirm the execution environment and deployment model for the bot runtime.
4. Check for required credentials, meeting join inputs, and media dependencies without printing secrets.

## Plan

Before making changes:

- state the bot goal and the Zoom surfaces involved
- list the files that will be changed
- state the auth path, runtime responsibilities, and media or transcript outputs
- state how the first working bot path will be verified

## Commands

1. Add or correct the bot entry path, meeting join or attach flow, and downstream processing pipeline.
2. Keep the first pass narrow: one working automation path before optional orchestration or analytics layers.
3. Add the minimal server, worker, or scheduler wiring required for the workflow.
4. Reuse existing logging, queueing, and secrets patterns where possible.
5. Do not claim recording or transcript automation works until the path is checked end to end.

## Verification

1. Re-read the bot runtime, auth helpers, and processing code that changed.
2. Run local build, tests, or static validation where available.
3. Verify the join pipeline, media handling assumptions, or downstream artifact path.
4. State any remaining blocker such as runtime environment constraints, account requirements, or missing meeting inputs.

## Summary

```text
## Result
- Action: implemented or updated a Zoom bot workflow
- Status: success | partial | failed
- Details: runtime, files changed, auth path, verification run
```

## Next Steps

- Test with a real meeting in a controlled environment.
- Add storage, analytics, or downstream integrations only after the base bot loop works.
- If the requirement is post-meeting retrieval rather than live participation, consider REST APIs or recording workflows instead.
