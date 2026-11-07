---
name: "import.codex.vercel.command._conventions"
description: "Explicit vercel command: _conventions"
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

Every slash command in this plugin follows a consistent structure so that the AI agent produces reliable, verifiable results. When authoring or updating a command file, include **all** of the sections below.

## Required Sections

### 1. Preflight

Check prerequisites before doing any work:

- **Project linked?** — Verify `.vercel/project.json` exists. If not, guide the user through `vercel link`.
- **CLI available?** — Confirm `vercel` CLI is on PATH.
- **Repo state** — Note uncommitted changes, dirty working tree, or detached HEAD when relevant.
- **Scope** — Detect monorepo (e.g., `turbo.json` or `pnpm-workspace.yaml`) and confirm which package is targeted.

Preflight failures should produce clear, actionable guidance — never silently skip.

### 2. Plan

Before executing, state what will happen:

- List the commands or MCP calls that will run.
- Flag destructive or production-impacting operations and require explicit user confirmation.
- If multiple strategies exist (MCP-first vs CLI-fallback), state which path was chosen and why.

### 3. Commands

The operational core. Follow these conventions:

- **MCP-first, CLI-fallback** — Prefer the Vercel MCP server for reads; use CLI for writes or when MCP lacks coverage.
- **Structured output** — Request `--format=json` where available; parse and present results in a readable summary.
- **No secrets in output** — Never echo environment variable values. Show names and metadata only.
- **Confirmation for destructive ops** — Production deploys, env removal, cache purge, and domain changes require an explicit "yes" from the user.

### 4. Verification

After execution, confirm the outcome:

- Re-read state (e.g., `vercel ls`, `vercel env ls`) to confirm the operation took effect.
- Compare before/after where possible (e.g., deployment count, env var count).
- Surface errors or warnings from command output.

### 5. Summary

Present a concise result block:

```
## Result
- **Action**: what was done
- **Status**: success | partial | failed
- **Details**: key output (URL, counts, config changes)
```

### 6. Next Steps

Suggest logical follow-ups:

- After deploy → check logs, inspect build, verify preview URL.
- After env change → pull to local, redeploy if production.
- After status → fix any flagged issues, run deploy if stale.

## File Naming

- Command files live in `commands/` and end in `.md`.
- Files prefixed with `_` (like this one) are meta-documents, not slash commands. They are excluded from `plugin.json` enumeration and not presented as user-invocable commands.

## Frontmatter

Every command file must include YAML frontmatter with at least a `description` field:

```yaml
---
description: One-line summary of what the command does.
---
```

## Validation

`scripts/validate.ts` enforces these conventions. Every non-underscore command file is checked for the required sections: Preflight, Plan, Commands, Verification, Summary, Next Steps.
