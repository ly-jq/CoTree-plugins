---
name: "import.codex.vercel.vercel-cli"
description: "Vercel CLI expert guidance. Use when deploying, managing environment variables, linking projects, viewing logs, querying metrics, managing domains, or interacting with the Vercel platform from the command line."
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

# Vercel CLI Skill

The Vercel CLI (`vercel` or `vc`) deploys, manages, and develops projects on the Vercel platform from the command line. Use `vercel <command> -h` for full flag details on any command.

## Critical: Project Linking

Commands must be run from the directory containing the `.vercel` folder (or a subdirectory of it). How `.vercel` gets set up depends on your project structure:

- **`.vercel/project.json`**: Created by `vercel link`. Links a single project. Fine for single-project repos, and can work in monorepos if there's only one project.
- **`.vercel/repo.json`**: Created by `vercel link --repo`. Links a repo that may contain multiple projects. Always a good idea when any project has a non-root directory (e.g., `apps/web`).

Running from a project subdirectory (e.g., `apps/web/`) skips the "which project?" prompt since it's unambiguous.

**When something goes wrong, check how things are linked first** — look at what's in `.vercel/` and whether it's `project.json` or `repo.json`. Also verify you're on the right team with `vercel whoami` — linking while on the wrong team is a common mistake.

## Quick Start

```bash
npm i -g vercel
vercel login
vercel link              # single project
# OR
vercel link --repo       # monorepo
vercel pull
vercel dev        # local development
vercel deploy     # preview deployment
vercel --prod     # production deployment
```

## Decision Tree

Use this to route to the correct reference file:

- **Deploy** → `references/deployment.md`
- **Local development** → `references/local-development.md`
- **Environment variables** → `references/environment-variables.md`
- **CI/CD automation** → `references/ci-automation.md`
- **Domains or DNS** → `references/domains-and-dns.md`
- **Projects or teams** → `references/projects-and-teams.md`
- **Logs, metrics, debugging, or accessing preview deploys** → `references/monitoring-and-debugging.md`
- **Blob storage** → `references/storage.md`
- **Integrations (databases, storage, etc.)** → `references/integrations.md`
- **Access a preview deployment** → use `vercel curl` (see `references/monitoring-and-debugging.md`)
- **CLI doesn't have a command for it** → use `vercel api` as a fallback (see `references/advanced.md`)
- **Node.js backends (Express, Hono, etc.)** → `references/node-backends.md`
- **Monorepos (Turborepo, Nx, workspaces)** → `references/monorepos.md`
- **Bun runtime** → `references/bun.md`
- **Feature flags** → `references/flags.md`
- **Advanced (API, webhooks)** → `references/advanced.md`
- **Global flags** → `references/global-options.md`
- **First-time setup** → `references/getting-started.md`

## Anti-Patterns

- **Wrong link type in monorepos with multiple projects**: `vercel link` creates `project.json`, which only tracks one project. Use `vercel link --repo` instead. When things break, check `.vercel/` first.
- **Letting commands auto-link in monorepos**: Many commands implicitly run `vercel link` if `.vercel/` doesn't exist. This creates `project.json`, which may be wrong. Run `vercel link` (or `--repo`) explicitly first.
- **Linking while on the wrong team**: Use `vercel whoami` to check, `vercel teams switch` to change.
- **Forgetting `--yes` in CI**: Required to skip interactive prompts.
- **Using `vercel deploy` after `vercel build` without `--prebuilt`**: The build output is ignored.
- **Hardcoding tokens in flags**: Use `VERCEL_TOKEN` env var instead of `--token`.
- **Disabling deployment protection**: Use `vercel curl` instead to access preview deploys.

## Related Skills in This Plugin

- **Log drains and observability vendor setup** → `⤳ skill: observability`
- **Feature flag configuration and adapter patterns** → `⤳ skill: vercel-flags`
