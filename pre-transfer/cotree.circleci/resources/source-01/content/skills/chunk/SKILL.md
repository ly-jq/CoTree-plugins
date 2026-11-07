---
name: "import.codex.circleci.chunk"
description: "Use CircleCI Chunk for AI-assisted CI/CD work through either the Chunk web UI or the chunk-cli. Trigger this skill when users ask to set up Chunk, troubleshoot or fix failing builds with Chunk, configure Chunk environments, schedule/proactively run Chunk tasks, or use chunk-cli commands such as init, validate, build-prompt, auth, sandbox, task, and skill install."
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

# Chunk

## Overview

Use this skill to choose the best Chunk workflow (UI or CLI), then execute it with clear prechecks and safe defaults. Keep responses action-oriented and grounded in verified commands and setup requirements.

## Workflow

1. Classify the request path.
- Use UI path for org setup, model-provider onboarding, fix buttons, or environment selection in the CircleCI app.
- Use CLI path for terminal-based project setup, validation hooks, prompt/context generation, sandbox operations, or scripted task execution.
- Use mixed path when users want UI setup plus CLI execution in the same flow.
2. Gather minimum context.
- Confirm repository/project, branch, and whether GitHub integration is in place.
- Confirm whether the user is using CircleCI-managed model provider or bring-your-own keys.
- For CLI operations, confirm local OS compatibility and required tokens/auth.
3. Execute using the matching reference.
- For UI/setup flows, load [chunk-ui.md](references/chunk-ui.md).
- For CLI flows, load [chunk-cli.md](references/chunk-cli.md).
4. Close with verification.
- State what was configured or run, what remains blocked, and the next safest command or UI action.

## Guardrails

- Treat Chunk features as beta unless the user confirms otherwise.
- Never expose or log secret values (API keys, tokens, bearer credentials).
- Do not invent `chunk` subcommands or flags; stick to documented command families.
- If sandbox features are requested, call out private preview status and any access gate.
- If a task depends on org-level prerequisites (GitHub App install, org toggles, contexts), verify those first.

## Reference Map

- [chunk-ui.md](references/chunk-ui.md): CircleCI app setup, provider onboarding, fix buttons, environment file/setup, and operational troubleshooting.
- [chunk-cli.md](references/chunk-cli.md): Installation, command map, quick-start flows, auth/env variables, and platform constraints.

## Output Contract

Provide:

1. Path chosen (UI, CLI, or mixed) and why.
2. Steps executed with exact command/UI actions.
3. Required prerequisites not yet met.
4. Concrete next action to finish the user’s goal.
