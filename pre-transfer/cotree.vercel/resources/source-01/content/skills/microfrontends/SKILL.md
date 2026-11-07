---
name: "import.codex.vercel.microfrontends"
description: "Guide for building, configuring, and deploying microfrontends on Vercel. Use this skill when the user mentions microfrontends, multi-zones, splitting an app across teams, independent deployments, cross-app routing, incremental migration, composing multiple frontends under one domain, microfrontends.json, @vercel/microfrontends, the microfrontends local proxy, or path-based routing between Vercel projects. Also use when the user asks about shared layouts across projects, navigation between microfrontends, fallback environments, asset prefixes, or feature flag controlled routing."
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

# Vercel Microfrontends
Split a large application into independently deployable units that render as one cohesive app. Vercel handles routing on its global network using `microfrontends.json`.

**Core concepts:** default app (has `microfrontends.json`, serves unmatched requests) · child apps (have `routing` path patterns) · asset prefix (prevents static-asset collisions) · independent deployments.

**Frameworks:** Next.js (App Router + Pages Router), SvelteKit, React Router, Vite — all via `@vercel/microfrontends`.

**CLI (`vercel microfrontends` / `vercel mf`):**
- `create-group` — create a new group; interactive by default, or fully non-interactive with `--non-interactive` (options: `--name`, `--project` (repeatable), `--default-app`, `--default-route`, `--project-default-route` (repeatable, format: `<project>=<route>`, required for each non-default project in non-interactive mode), `--yes` to skip confirmation prompt); note: `--non-interactive` is blocked if adding the projects would exceed the free tier limit — the user must confirm billing changes interactively
- `add-to-group` — add the current project to an existing group; requires interactive terminal (options: `--group`, `--default-route`)
- `remove-from-group` — remove the current project from its group; requires interactive terminal (option: `--yes` skips project-link prompt only)
- `delete-group` — delete a group and all its settings, irreversible; requires interactive terminal (option: `--group` to pre-select group)
- `inspect-group` — retrieve group metadata (project names, frameworks, git repos, root dirs); useful for automating setup (options: `--group`, `--format=json`, `--config-file-name`)
- `pull` — pull remote `microfrontends.json` for local development (option: `--dpl`)
- `microfrontends proxy` — local dev proxy · `microfrontends port` — print auto-assigned port

## Finding Detailed Information

This skill includes detailed reference docs in the `references/` directory. **Do not read all references upfront.** Instead, search or grep the relevant file when the user asks about a specific topic:

| Topic | Reference file |
|---|---|
| Getting started, quickstart, framework setup, `microfrontends.json` schema, fields, naming, examples | `references/configuration.md` |
| Path expressions, asset prefixes, flag-controlled routing, middleware | `references/path-routing.md` |
| Local proxy setup, polyrepo config, Turborepo, ports, deployment protection | `references/local-development.md` |
| Inspecting groups (`inspect-group`), adding/removing projects, fallback environments, navigation, observability | `references/managing-microfrontends.md` |
| Testing utilities (`validateMiddlewareConfig`, `validateRouting`, etc.), debug headers, common issues | `references/troubleshooting.md` |
| Deployment protection, Vercel Firewall, WAF rules for microfrontends | `references/security.md` |

When the user asks about a specific topic, use grep or search over the relevant reference file to find the answer without loading all references into context.
