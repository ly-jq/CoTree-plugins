---
name: "import.codex.zoom.scribe"
description: "Use when using Scribe."
disable-model-invocation: false
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

Resource root: resolve `../..` from this file's directory to locate `content/`. Replace `<plugin-resource-root>` with that actual directory before using a script; it is not a literal Shell path.

## 工作内容

# Zoom AI Services Scribe

Use this skill for Zoom Scribe transcription pipelines over uploaded or stored media. If the user needs live meeting media, compare against RTMS or Meeting SDK bot workflows first.

## Workflow

1. Confirm the media source, size, language, expected latency, and whether fast mode or batch mode fits.
2. Set up Build-platform credentials and JWT handling separately from application transcription logic.
3. Design ingestion, chunking, retries, webhook callbacks, and persistence before connecting downstream AI workflows.
4. Implement a minimal transcription request and response parser, then add batching and operational monitoring.
5. Debug by checking credential audience, processing mode, media format, file size, backend timeout, and webhook delivery.

## References

- Full preserved guide: [references/full-guide.md](references/full-guide.md)
- Auth and processing modes: [concepts/auth-and-processing-modes.md](concepts/auth-and-processing-modes.md)
- High-level scenarios: [scenarios/high-level-scenarios.md](scenarios/high-level-scenarios.md)
- Fast mode Node example: [examples/fast-mode-node.md](examples/fast-mode-node.md)
- Batch webhook pipeline: [examples/batch-webhook-pipeline.md](examples/batch-webhook-pipeline.md)
- API reference: [references/api-reference.md](references/api-reference.md)
- Common drift and breaks: [troubleshooting/common-drift-and-breaks.md](troubleshooting/common-drift-and-breaks.md)
