---
name: "import.codex.vercel.command.env"
description: "Manage Vercel environment variables. Commands include list, pull, add, remove, and diff. Use to sync environment variables between Vercel and your local development environment."
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

# Vercel Environment Variables

Manage environment variables for the current Vercel project with safety rails to prevent secret leakage.

> **🔒 Never-Echo-Secrets Rule**: Environment variable **values** must never appear in command output, summaries, or conversation text. Only show variable **names**, **environments**, and **metadata** (created date, type). This rule applies to all subcommands.

## Preflight

1. **CLI available?** — Confirm `vercel` is on PATH.
   - If missing: `npm i -g vercel` (or `pnpm add -g vercel` / `bun add -g vercel`).
2. **Project linked?** — Check for `.vercel/project.json` in the current directory or nearest parent.
   - If not found: run `vercel link` interactively, then re-run `/env`.
3. **Detect environment files** — Check for `.env`, `.env.local`, `.env.production.local`, `.env.development.local` in the project root. Note which exist for the diff subcommand.

## Plan

Based on "<user-supplied-arguments>", determine the action:

| Argument | Action | Destructive? |
|----------|--------|-------------|
| `list` / `ls` / _(none)_ | List env var names per environment | No |
| `pull` | Download env vars to local `.env.local` | No (overwrites local file) |
| `add <NAME>` | Add a new env var | Yes (if production) |
| `rm <NAME>` / `remove <NAME>` | Remove an env var | **Yes** |
| `diff` | Compare local vs Vercel key names | No |

For any operation that mutates **production** environment variables (`add` or `rm` targeting production):

> ⚠️ **Production environment mutation requested.**
> This will change environment variables on your live production deployment.
> **Ask the user for explicit confirmation before proceeding.** Do not mutate production env vars without a clear "yes."

## Commands

### "list" or "ls" or no arguments

<!-- Sourced from env-vars skill: vercel env CLI > List Environment Variables -->
```bash
# List all environment variables
vercel env ls

# Filter by environment
vercel env ls production
```

Present results as a table of variable **names only** grouped by environment. **Never print values.**

| Name | Production | Preview | Development |
|------|-----------|---------|-------------|
| DATABASE_URL | ✓ | ✓ | ✓ |
| API_KEY | ✓ | ✓ | — |

### "pull"

<!-- Sourced from env-vars skill: vercel env CLI > Pull Environment Variables -->
```bash
# Pull all env vars for the current environment into .env.local
vercel env pull .env.local

# Pull for a specific environment
vercel env pull .env.local --environment=production
vercel env pull .env.local --environment=preview
vercel env pull .env.local --environment=development

# Overwrite existing file without prompting
vercel env pull .env.local --yes

# Pull to a custom file
vercel env pull .env.production.local --environment=production
```

After pulling, remind the user:

> Ensure `.env*.local` is in your `.gitignore` to avoid committing secrets.

### "add \<NAME\>"

1. Ask the user which environments to target: production, preview, development (can select multiple).
2. If **production** is selected, require explicit confirmation (see Plan section).
3. Run the add command:

<!-- Sourced from env-vars skill: vercel env CLI > Add Environment Variables -->
```bash
# Interactive — prompts for value and environments
vercel env add MY_SECRET

# Non-interactive
echo "secret-value" | vercel env add MY_SECRET production

# Add to multiple environments
echo "secret-value" | vercel env add MY_SECRET production preview development

# Add a sensitive variable (encrypted, not shown in logs)
vercel env add MY_SECRET --sensitive
```

The CLI will prompt for the value interactively — **do not pass the value as a CLI argument or echo it**.

### "rm \<NAME\>" or "remove \<NAME\>"

1. If the variable exists in **production**, require explicit confirmation.
2. Run the remove command:

<!-- Sourced from env-vars skill: vercel env CLI > Remove Environment Variables -->
```bash
# Remove from specific environment
vercel env rm MY_SECRET production

# Remove from all environments
vercel env rm MY_SECRET
```

Confirm the target environment(s) with the user before executing.

### "diff"

Compare local environment file key names against Vercel-configured key names. **Only compare names — never read or display values.**

1. Read local env file keys (from `.env.local` or `.env` — whichever exists):

```bash
grep -v '^#' .env.local | grep '=' | cut -d'=' -f1 | sort
```

2. Fetch Vercel env var names:

```bash
vercel env ls
```

Parse the output to extract variable names for the target environment (default: development).

3. Present the diff:

```
## Env Diff — Local vs Vercel (development)

### In local but NOT on Vercel:
- EXTRA_LOCAL_VAR
- DEBUG_MODE

### On Vercel but NOT in local:
- ANALYTICS_KEY
- SENTRY_DSN

### In both:
- DATABASE_URL
- API_KEY
- NEXT_PUBLIC_APP_URL
```

If all keys match, report: "Local and Vercel environment keys are in sync."

## Environment-Specific Configuration Reference

<!-- Sourced from env-vars skill: Environment-Specific Configuration -->
### Vercel Dashboard vs .env Files

| Use Case | Where to Set |
|----------|-------------|
| Secrets (API keys, tokens) | Vercel Dashboard (`https://vercel.com/{team}/{project}/settings/environment-variables`) or `vercel env add` |
| Public config (site URL, feature flags) | `.env` or `.env.[environment]` files |
| Local-only overrides | `.env.local` |
| CI/CD secrets | Vercel Dashboard (`https://vercel.com/{team}/{project}/settings/environment-variables`) with environment scoping |

### Environment Scoping on Vercel

Variables set in the Vercel Dashboard at `https://vercel.com/{team}/{project}/settings/environment-variables` can be scoped to:

- **Production** — only `vercel.app` production deployments
- **Preview** — branch/PR deployments
- **Development** — `vercel dev` and `vercel env pull`

A variable can be assigned to one, two, or all three environments.

### Git Branch Overrides

Preview environment variables can be scoped to specific Git branches:

```bash
# Add a variable only for the "staging" branch
echo "staging-value" | vercel env add DATABASE_URL preview --git-branch=staging
```

## Common Gotchas

<!-- Sourced from env-vars skill: Gotchas -->
### `vercel env pull` Overwrites Custom Variables

`vercel env pull .env.local` **replaces the entire file** — any manually added variables (custom secrets, local overrides, debug flags) are lost. Always back up or re-add custom vars after pulling:

```bash
# Save custom vars before pulling
grep -v '^#' .env.local | grep -v '^VERCEL_\|^POSTGRES_\|^NEXT_PUBLIC_' > .env.custom.bak
vercel env pull .env.local --yes
cat .env.custom.bak >> .env.local  # Re-append custom vars
```

Or maintain custom vars in a separate `.env.development.local` file (loaded after `.env.local` by Next.js).

### Scripts Don't Auto-Load `.env.local`

Only Next.js auto-loads `.env.local`. Standalone scripts (`drizzle-kit`, `tsx`, custom Node scripts) need explicit loading:

```bash
# Use dotenv-cli
npm install -D dotenv-cli
npx dotenv -e .env.local -- npx drizzle-kit push
npx dotenv -e .env.local -- npx tsx scripts/seed.ts

# Or source manually
source <(grep -v '^#' .env.local | sed 's/^/export /') && node scripts/migrate.js
```

## Verification

After any mutation (`add` or `rm`), verify the change took effect:

```bash
vercel env ls
```

Re-list environment variables and confirm:

- For `add`: the new variable name appears in the expected environment(s).
- For `rm`: the variable name no longer appears in the target environment(s).

If verification fails (variable still present after remove, or missing after add), report the discrepancy and suggest retrying.

## Summary

Present a structured result block:

```
## Env Result
- **Action**: list | pull | add | remove | diff
- **Status**: success | failed
- **Variable**: <NAME> (for add/remove)
- **Environments**: production, preview, development (as applicable)
- **Details**: <key outcome>
```

For `diff`, include counts:

```
- **Local only**: N keys
- **Vercel only**: N keys
- **Shared**: N keys
```

## Next Steps

Based on the action performed:

- **After list** → "Run `/env pull` to sync to local, or `/env diff` to compare local vs Vercel."
- **After pull** → "Restart your dev server to pick up the new variables. Run `/env diff` to verify sync."
- **After add** → "Run `/deploy` to make the new variable available in your next deployment. For production, the variable is available immediately on the next request."
- **After remove** → "The variable is removed. If your app depends on it, update your code or add a replacement. Consider redeploying with `/deploy`."
- **After diff** → "Add missing variables with `/env add <NAME>`, or pull from Vercel with `/env pull` to sync."
