---
name: "import.codex.vercel.next-forge"
description: "next-forge expert guidance — production-grade Turborepo monorepo SaaS starter by Vercel. Use when working in a next-forge project, scaffolding with `npx next-forge init`, or editing @repo/* workspace packages."
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

# next-forge

next-forge is a production-grade Turborepo template for building Next.js SaaS applications. It provides a monorepo structure with multiple apps, shared packages, and integrations for authentication, database, payments, email, CMS, analytics, observability, security, and more.

## Quick Start

Initialize a new project:

```bash
npx next-forge@latest init
```

The CLI prompts for a project name and package manager (bun, npm, yarn, or pnpm). After installation:

1. Set the `DATABASE_URL` in `packages/database/.env` pointing to a PostgreSQL database (Neon recommended).
2. Run database migrations: `bun run migrate`
3. Add any optional integration keys to the appropriate `.env.local` files.
4. Start development: `bun run dev`

All integrations besides the database are optional. Missing environment variables gracefully disable features rather than causing errors.

## Architecture Overview

The monorepo contains apps and packages. Apps are deployable applications. Packages are shared libraries imported as `@repo/<package-name>`.

**Apps** (in `/apps/`):

| App | Port | Purpose |
|-----|------|---------|
| `app` | 3000 | Main authenticated SaaS application |
| `web` | 3001 | Marketing website with CMS and SEO |
| `api` | 3002 | Serverless API for webhooks, cron jobs |
| `email` | 3003 | React Email preview server |
| `docs` | 3004 | Documentation site (Mintlify) |
| `storybook` | 6006 | Design system component workshop |
| `studio` | 3005 | Prisma Studio for database editing |

**Core Packages**: `auth`, `database`, `payments`, `email`, `cms`, `design-system`, `analytics`, `observability`, `security`, `storage`, `seo`, `feature-flags`, `internationalization`, `webhooks`, `cron`, `notifications`, `collaboration`, `ai`, `rate-limit`, `next-config`, `typescript-config`.

For detailed structure, see `references/architecture.md`.

## Key Concepts

### Environment Variables

Environment variable files live alongside apps and packages:

- `apps/app/.env.local` — Main app keys (Clerk, Stripe, etc.)
- `apps/web/.env.local` — Marketing site keys
- `apps/api/.env.local` — API keys
- `packages/database/.env` — `DATABASE_URL` (required)
- `packages/cms/.env.local` — BaseHub token
- `packages/internationalization/.env.local` — Languine project ID

Each package has a `keys.ts` file that validates environment variables with Zod via `@t3-oss/env-nextjs`. Type safety is enforced at build time.

### Inter-App URLs

Local URLs are pre-configured:

- `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- `NEXT_PUBLIC_WEB_URL=http://localhost:3001`
- `NEXT_PUBLIC_API_URL=http://localhost:3002`
- `NEXT_PUBLIC_DOCS_URL=http://localhost:3004`

Update these to production domains when deploying (e.g., `app.yourdomain.com`, `www.yourdomain.com`).

### Server Components First

`page.tsx` and `layout.tsx` files are always server components. Client interactivity goes in separate files with `'use client'`. Access databases, secrets, and server-only APIs directly in server components and server actions.

### Graceful Degradation

All integrations beyond the database are optional. Clients use optional chaining (e.g., `stripe?.prices.list()`, `resend?.emails.send()`). If the corresponding environment variable is not set, the feature is silently disabled.

## Common Tasks

### Running Development

```bash
bun run dev                  # All apps
bun dev --filter app         # Single app (port 3000)
bun dev --filter web         # Marketing site (port 3001)
```

### Database Migrations

After changing `packages/database/prisma/schema.prisma`:

```bash
bun run migrate
```

This runs Prisma format, generate, and db push in sequence.

### Adding shadcn/ui Components

```bash
npx shadcn@latest add [component] -c packages/design-system
```

Update existing components:

```bash
bun run bump-ui
```

### Adding a New Package

Create a new directory in `/packages/` with a `package.json` using the `@repo/<name>` naming convention. Add it as a dependency in consuming apps.

### Linting and Formatting

```bash
bun run lint                 # Check code style (Ultracite/Biome)
bun run format               # Fix code style
```

### Testing

```bash
bun run test                 # Run tests across monorepo
```

### Building

```bash
bun run build                # Build all apps and packages
bun run analyze              # Bundle analysis
```

### Deployment

Deploy to Vercel by creating separate projects for `app`, `web`, and `api` — each pointing to its respective root directory under `/apps/`. Add environment variables per project or use Vercel Team Environment Variables.

For detailed setup and customization instructions, see:

- `references/setup.md` — Installation, prerequisites, environment variables, database and Stripe CLI setup
- `references/packages.md` — Detailed documentation for every package
- `references/customization.md` — Swapping providers, extending features, deployment configuration
- `references/architecture.md` — Full monorepo structure, Turborepo pipeline, scripts
