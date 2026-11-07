---
name: "import.codex.creative-production.intake"
description: "Use when Creative Production is explicitly invoked or mentioned without a concrete request, when the user asks what Creative Production can do, or when the user wants help getting started without enough context to choose a workflow."
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

# Intake

Open the Creative Production app in its zero state.

This skill owns the no-brief entry point. It does not generate images, choose a production mode, or ask structured questions.

## Workflow

1. Call `creative_production_board` exactly once with:

```json
{
  "action": "open",
  "title": "Creative Production",
  "summary": "Start with an idea"
}
```

   Preserve the returned `boardId`; it is the only target for later actions.
2. Let the app show its starter grid.
3. Do not ask a chat question before the app appears.
4. Do not call any structured intake tool.
5. When the user selects a starter, let the app open an editable follow-up prompt. Opening the prompt must not create a placeholder.
6. After submission, hand off to `produce` with the existing `boardId`. Call `begin_generation` only when generation actually starts, then call `complete_generation` for each generated file. Never call `open` again for that workflow.

## Exit

Stop after the zero-state app is visible. The next user turn or starter follow-up owns the concrete creative request and updates this same board.
