---
name: "import.codex.circleci.circleci-cli"
description: "Operate and troubleshoot CircleCI using the CircleCI CLI. Use when users ask to authenticate CLI access, inspect pipeline/workflow/job status, validate configuration locally, rerun pipelines/jobs, trigger pipelines, or gather actionable diagnostics from CLI outputs."
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

# CircleCI CLI

## Overview

Use this skill when the fastest path is CircleCI CLI-driven operations rather than editing config first. Prioritize safe, read-first diagnostics, then run targeted mutating commands only after confirming scope.

## Inputs To Gather

- Repository path and target branch
- CircleCI project slug (if needed)
- Whether objective is inspect, rerun, trigger, or validate
- Required token/auth state and org permissions

## Workflow

1. Verify CLI and auth state.
   - Confirm `circleci` is installed and version is available.
   - Confirm token/auth before issuing remote CircleCI commands.
2. Run read-only diagnostics first.
   - Inspect available pipeline/project/trigger state and capture concrete identifiers.
   - Extract first failing scope and step details from supported command output before rerun/trigger actions.
3. Validate config locally when relevant.
   - Run config validation/processing commands before committing risky edits.
4. Run targeted mutation commands.
   - Rerun only required workflow/job scope.
   - Trigger pipelines with explicit parameters and branch context.
5. Report results and next action.
   - Provide exact command results, remaining blockers, and safest follow-up.

## Guardrails

- Prefer read-only commands before rerun/trigger/cancel operations.
- Confirm organization/project scope before mutating pipeline state.
- Never print raw secret values from environment variables or tokens.
- If permissions fail, report exact auth/scope gap and safest remediation.
- Respect installed CLI capabilities and avoid inventing commands.
- Do not use `circleci api`, `circleci workflow`, or other unavailable legacy commands unless `circleci help` confirms they exist.

## Installed CLI Compatibility

For newer `circleci` builds that expose domain subcommands (for example `pipeline`, `project`, `trigger`) but not `api`:

- Verify available commands first with `circleci help`.
- Use only discovered subcommands from help output.
- Prefer `circleci pipeline list|create|run` and `circleci trigger ...` for pipeline operations.
- For cloud job logs, use supported platform tools (CircleCI app/UI or connected CircleCI MCP tooling) if the CLI does not expose a logs command.

## Output Contract

Provide:

1. Commands run and purpose.
2. Key outputs (pipeline/workflow/job ids, status, failing step).
3. Actions taken (rerun/trigger/validate) and why.
4. Remaining blockers and next recommended CLI command.
