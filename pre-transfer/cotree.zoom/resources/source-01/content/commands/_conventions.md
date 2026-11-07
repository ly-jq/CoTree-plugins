---
name: "import.codex.zoom.command._conventions"
description: "Explicit zoom command: _conventions"
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

# Command Conventions

Every slash command in this plugin follows a consistent structure so Codex produces reliable, verifiable Zoom workflow results. Every non-underscore file in `commands/` must include all required sections below.

## Required Sections

### 1. Preflight

Check prerequisites before doing any work:

- Inspect the current repo for the relevant Zoom surface, framework, and existing integration code.
- Confirm required local tools are available before relying on them.
- Note missing credentials, env vars, callback routes, or endpoint URLs before attempting setup or debugging.
- Flag dirty working tree or risky production-impacting changes when they matter to the requested workflow.

Preflight failures should produce clear next actions. Do not silently skip them.

### 2. Plan

State what will happen before execution:

- List the files, commands, and external checks the workflow will use.
- Call out any destructive or production-impacting step and require explicit user confirmation.
- If there are multiple viable paths, state which one was chosen and why.

### 3. Commands

The operational core. Follow these conventions:

- Prefer read-first inspection before making code or config changes.
- Never print secret values. Show env var names, scope names, file paths, and metadata only.
- Use structured output when available.
- Prefer the narrowest Zoom surface that actually solves the task.
- Do not claim OAuth, webhook, or SDK setup succeeded without checking the relevant evidence.

### 4. Verification

After execution, confirm the outcome:

- Re-read the changed files or live state.
- Verify the exact auth, signature, endpoint, or config path that was modified.
- Surface errors, warnings, and unresolved blockers explicitly.

### 5. Summary

Present a concise result block:

```text
## Result
- Action: what was done
- Status: success | partial | failed
- Details: key files, env vars, endpoints, or findings
```

### 6. Next Steps

Suggest the logical follow-up:

- setup flows -> test auth or live API connectivity
- debug flows -> rerun the failing path with the fix applied
- review flows -> apply the recommended fixes or narrow the scope

## File Naming

- Command files live in `commands/` and end in `.md`.
- Files prefixed with `_` are conventions or meta docs, not user-facing commands.

## Frontmatter

Every command file must include YAML frontmatter with at least a `description` field.
