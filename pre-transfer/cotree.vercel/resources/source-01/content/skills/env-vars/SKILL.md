---
name: "import.codex.vercel.env-vars"
description: "Vercel environment variable expert guidance. Use when working with .env files, vercel env commands, OIDC tokens, or managing environment-specific configuration."
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

# Vercel Environment Variables

You are an expert in Vercel environment variable management — `.env` file conventions, the `vercel env` CLI, OIDC token lifecycle, and environment-specific configuration.

## .env File Hierarchy

Vercel and Next.js load environment variables in a specific order. Later files override earlier ones:

| File | Purpose | Git-tracked? |
|------|---------|-------------|
| `.env` | Default values for all environments | Yes |
| `.env.local` | Local overrides and secrets | **No** (gitignored) |
| `.env.development` | Development-specific defaults | Yes |
| `.env.development.local` | Local dev overrides | **No** |
| `.env.production` | Production-specific defaults | Yes |
| `.env.production.local` | Local prod overrides | **No** |
| `.env.test` | Test-specific defaults | Yes |
| `.env.test.local` | Local test overrides | **No** |

### Load Order (Next.js)

1. `.env` (lowest priority)
2. `.env.[environment]` (development, production, or test)
3. `.env.local` (skipped in test environment)
4. `.env.[environment].local` (highest priority, skipped in test)

### Critical Rules

- **Never commit secrets** to `.env`, `.env.development`, or `.env.production` — use `.local` variants or Vercel environment variables
- `.env.local` is always gitignored by Next.js — this is where `vercel env pull` writes secrets
- Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser bundle — never put secrets in `NEXT_PUBLIC_` vars
- All other variables are server-only (API routes, Server Components, middleware)

## vercel env CLI

### Pull Environment Variables

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

### Add Environment Variables

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

### List Environment Variables

```bash
# List all environment variables
vercel env ls

# Filter by environment
vercel env ls production
```

### Remove Environment Variables

```bash
# Remove from specific environment
vercel env rm MY_SECRET production

# Remove from all environments
vercel env rm MY_SECRET
```

## Bootstrap Flow (Fresh Clone / New Machine)

Use this sequence when setting up a project from scratch:

```bash
# 1) Link first so pulls target the correct Vercel project
vercel link --yes --project <name-or-id> --scope <team>

# 2) Pull env vars into .env.local
vercel env pull .env.local --yes

# 3) Verify required keys from .env.example exist in .env.local
while IFS='=' read -r key _; do
  [[ -z "$key" || "$key" == \#* ]] && continue
  grep -q "^${key}=" .env.local || echo "Missing in .env.local: $key"
done < .env.example
```

### Temporary Path: Run With Vercel Envs Without Writing a File

If you need Vercel environment variables immediately but do not want to write `.env.local` yet:

```bash
vercel env run -- npm run dev
```

This is useful for quick validation during bootstrap, but still pull `.env.local` for a normal local workflow.

### Re-pull After Secret or Provisioning Changes

After creating/updating secrets (`vercel env add`, dashboard changes) or provisioning integrations that add env vars (for example Neon/Upstash), re-run:

```bash
vercel env pull .env.local --yes
```

## OIDC Token Lifecycle

Vercel uses **OIDC (OpenID Connect)** tokens for secure, keyless authentication between your app and Vercel services (AI Gateway, storage, etc.).

### How It Works

1. **On Vercel deployments**: `VERCEL_OIDC_TOKEN` is automatically injected as a short-lived JWT and auto-refreshed — zero configuration needed
2. **Local development**: `vercel env pull .env.local` provisions a `VERCEL_OIDC_TOKEN` valid for ~12 hours
3. **Token expiry**: When the local OIDC token expires, re-run `vercel env pull .env.local --yes` to get a fresh one. Consider re-pulling at the start of each dev session to avoid mid-session auth failures

### Common OIDC Patterns

```ts
// The @vercel/oidc package reads VERCEL_OIDC_TOKEN automatically
import { getVercelOidcToken } from '@vercel/oidc'

// AI Gateway uses OIDC by default — no manual token handling needed
import { gateway } from 'ai'
const result = await generateText({
  model: gateway('openai/gpt-5.2'),
  prompt: 'Hello',
})
```

### Troubleshooting OIDC

| Symptom | Cause | Fix |
|---------|-------|-----|
| `VERCEL_OIDC_TOKEN` missing locally | Haven't pulled env vars | `vercel env pull .env.local` |
| Auth errors after ~12h locally | Token expired | `vercel env pull .env.local --yes` |
| Works on Vercel, fails locally | Token not in `.env.local` | `vercel env pull .env.local` |
| `AI_GATEWAY_API_KEY` vs OIDC | Both set, key takes priority | Remove `AI_GATEWAY_API_KEY` to use OIDC |

## Environment-Specific Configuration

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

## Gotchas

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

## Best Practices

1. **Use `vercel env pull` as part of your setup workflow** — document it in your README
2. **Never hardcode secrets** — always use environment variables
3. **Scope narrowly** — don't give preview deployments production database access
4. **Rotate OIDC tokens regularly in local dev** — re-pull when you see auth errors
5. **Use `.env.example`** — commit a template with empty values so teammates know which vars are needed
6. **Prefix client-side vars with `NEXT_PUBLIC_`** — and never put secrets in them
7. **Keep custom vars in `.env.development.local`** — protects them from `vercel env pull` overwrites

## Official Documentation

- [Environment Variables](https://vercel.com/docs/environment-variables)
- [Vercel CLI: env](https://vercel.com/docs/cli/env)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
