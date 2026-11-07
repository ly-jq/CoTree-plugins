---
name: "import.codex.zoom.command.build-zoom-scribe-app"
description: "Implement a Zoom Scribe transcription pipeline for uploaded or stored media with the right processing mode and callback flow."
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

# Build Zoom Scribe App

Use this command when the repo needs a Zoom Scribe transcription workflow for uploaded or stored media rather than live in-meeting media.

## Preflight

1. Inspect the codebase for existing ingestion, storage, queueing, webhook, or transcript-processing code.
2. Confirm the media source, expected latency, language requirements, and whether fast mode or batch mode fits the workflow.
3. Identify the runtime that will own Build-platform credentials, request submission, and callback or polling behavior.
4. Check for required credentials, storage paths, and callback endpoints without printing secrets.

## Plan

Before making changes:

- state the media source and chosen Scribe processing mode
- list the files that will be changed
- state the auth path, ingestion path, and transcript output destination
- state how the first transcription flow will be verified

## Commands

1. Add or correct the transcription request path in the backend or worker layer.
2. Keep Build-platform auth handling separate from transcript business logic.
3. Add the minimum ingest, submit, parse, and persist flow required for a working transcription pipeline.
4. If batch mode is used, wire the callback or job-status path explicitly.
5. Reuse existing queueing, storage, and observability patterns where possible.
6. Avoid presenting live meeting media workflows as Scribe if the use case really belongs on RTMS or a bot pipeline.

## Verification

1. Re-read the auth handling, submission path, and transcript parsing code after changes.
2. Run local build or tests where available.
3. Verify the chosen processing mode and transcript output path are coherent.
4. State any remaining blocker such as credential audience, media format, callback path, or size constraints.

## Summary

```text
## Result
- Action: implemented or updated a Zoom Scribe transcription workflow
- Status: success | partial | failed
- Details: processing mode, files changed, auth path, verification run
```

## Next Steps

- Test the pipeline with one real media file in a controlled environment.
- Add retries, batching, or downstream AI processing only after the base path works.
- If the workflow needs live media instead of stored files, switch to `/build-zoom-rtms-app` or `/build-zoom-bot`.
