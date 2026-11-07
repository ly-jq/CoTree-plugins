---
name: "import.codex.vercel.routing-middleware"
description: "Vercel Routing Middleware guidance — request interception before cache, rewrites, redirects, personalization. Works with any framework. Supports Edge, Node.js, and Bun runtimes. Use when intercepting requests at the platform level."
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

# Vercel Routing Middleware

You are an expert in Vercel Routing Middleware — the platform-level request interception layer.

## What It Is

Routing Middleware runs **before the cache** on every request matching its config. It is a **Vercel platform** feature (not framework-specific) that works with Next.js, SvelteKit, Astro, Nuxt, or any deployed framework. Built on Fluid Compute.

- **File**: `middleware.ts` or `middleware.js` at the project root
- **Default export required** (function name can be anything)
- **Runtimes**: Edge (default), Node.js (`runtime: 'nodejs'`), Bun (Node.js + `bunVersion` in vercel.json)

## CRITICAL: Middleware Disambiguation

There are THREE "middleware" concepts in the Vercel ecosystem:

| Concept | File | Runtime | Scope | When to Use |
|---------|------|---------|-------|-------------|
| **Vercel Routing Middleware** | `middleware.ts` (root) | Edge/Node/Bun | Any framework, platform-level | Request interception before cache: rewrites, redirects, geo, A/B |
| **Next.js 16 Proxy** | `proxy.ts` (root, or `src/proxy.ts` if using `--src-dir`) | Node.js only | Next.js 16+ only | Network-boundary proxy needing full Node APIs. NOT for auth. |
| **Edge Functions** | Any function file | V8 isolates | General-purpose | Standalone edge compute endpoints, not an interception layer |

**Why the rename in Next.js 16**: `middleware.ts` → `proxy.ts` clarifies it sits at the network boundary (not general-purpose middleware). Partly motivated by CVE-2025-29927 (middleware auth bypass via `x-middleware-subrequest` header). The exported function must also be renamed from `middleware` to `proxy`. Migration codemod: `npx @next/codemod@latest middleware-to-proxy`

**Deprecation**: Next.js 16 still accepts `middleware.ts` but treats it as deprecated and logs a warning. It will be removed in a future version.

## Bun Runtime

To run Routing Middleware (and all Vercel Functions) on Bun, add `bunVersion` to `vercel.json`:

```json
{
  "bunVersion": "1.x"
}
```

Set the middleware runtime to `nodejs` — Bun replaces the Node.js runtime transparently:

```ts
export const config = {
  runtime: 'nodejs', // Bun swaps in when bunVersion is set
};
```

Bun reduces average latency by ~28% in CPU-bound workloads. Currently in Public Beta — supports Next.js, Express, Hono, and Nitro.

## Basic Example

```ts
// middleware.ts (project root)
import { geolocation, rewrite } from '@vercel/functions';

export default function middleware(request: Request) {
  const { country } = geolocation(request);
  const url = new URL(request.url);
  url.pathname = country === 'US' ? '/us' + url.pathname : '/intl' + url.pathname;
  return rewrite(url);
}

export const config = {
  runtime: 'edge', // 'edge' (default) | 'nodejs'
};
```

## Helper Methods (`@vercel/functions`)

For non-Next.js frameworks, import from `@vercel/functions`:

| Helper | Purpose |
|--------|---------|
| `next()` | Continue middleware chain (optionally modify headers) |
| `rewrite(url)` | Transparently serve content from a different URL |
| `geolocation(request)` | Get `city`, `country`, `latitude`, `longitude`, `region` |
| `ipAddress(request)` | Get client IP address |
| `waitUntil(promise)` | Keep function running after response is sent |

For Next.js, equivalent helpers are on `NextResponse` (`next()`, `rewrite()`, `redirect()`) and `NextRequest` (`request.geo`, `request.ip`).

## Matcher Configuration

Middleware runs on **every route** by default. Use `config.matcher` to scope it:

```ts
// Single path
export const config = { matcher: '/dashboard/:path*' };

// Multiple paths
export const config = { matcher: ['/dashboard/:path*', '/api/:path*'] };

// Regex: exclude static files
export const config = {
  matcher: ['/((?!_next/static|favicon.ico).*)'],
};
```

**Tip**: Using `matcher` is preferred — unmatched paths skip middleware invocation entirely (saves compute).

## Common Patterns

### IP-Based Header Injection

```ts
import { ipAddress, next } from '@vercel/functions';

export default function middleware(request: Request) {
  return next({ headers: { 'x-real-ip': ipAddress(request) || 'unknown' } });
}
```

### A/B Testing via Edge Config

```ts
import { get } from '@vercel/edge-config';
import { rewrite } from '@vercel/functions';

export default async function middleware(request: Request) {
  const variant = await get('experiment-homepage'); // <1ms read
  const url = new URL(request.url);
  url.pathname = variant === 'B' ? '/home-b' : '/home-a';
  return rewrite(url);
}
```

### Background Processing

```ts
import type { RequestContext } from '@vercel/functions';

export default function middleware(request: Request, context: RequestContext) {
  context.waitUntil(
    fetch('https://analytics.example.com/log', { method: 'POST', body: request.url })
  );
  return new Response('OK');
}
```

## Request Limits

| Limit | Value |
|-------|-------|
| Max URL length | 14 KB |
| Max request body | 4 MB |
| Max request headers | 64 headers / 16 KB total |

## Three CDN Routing Mechanisms

Vercel's CDN supports three routing mechanisms, evaluated in this order:

| Order | Mechanism | Scope | Deploy Required | How to Configure |
|-------|-----------|-------|-----------------|------------------|
| 1 | **Bulk Redirects** | Up to 1M static path→path redirects | No (runtime via Dashboard/API/CLI) | Dashboard, CSV upload, REST API |
| 2 | **Project-Level Routes** | Headers, rewrites, redirects | No (instant publish) | Dashboard, API, CLI, Vercel SDK |
| 3 | **Deployment Config Routes** | Full routing rules | Yes (deploy) | `vercel.json`, `vercel.ts`, `next.config.ts` |

**Project-level routes** (added March 2026) let you update routing rules — response headers, rewrites to external APIs — without triggering a new deployment. They run after bulk redirects and before deployment config routes. Available on all plans.

### Project-Level Routes — Configuration Methods

Project-level routes take effect instantly (no deploy required). Four ways to manage them:

| Method | How |
|--------|-----|
| **Dashboard** | Project → CDN → Routing tab. Live map of global traffic, cache management, and route editor in one view. |
| **REST API** | `GET/POST/PATCH/DELETE /v1/projects/{projectId}/routes` — 8 dedicated endpoints for CRUD on project routes. |
| **Vercel CLI** | Managed via `vercel.ts` / `@vercel/config` commands (`compile`, `validate`, `generate`). |
| **Vercel SDK** | `@vercel/config` helpers: `routes.redirect()`, `routes.rewrite()`, `routes.header()`, plus `has`/`missing` conditions and transforms. |

Use project-level routes for operational changes (CORS headers, API proxy rewrites, A/B redirects) that shouldn't require a full redeploy.

## Programmatic Configuration with `vercel.ts`

Instead of static `vercel.json`, you can use `vercel.ts` (or `.js`, `.mjs`, `.cjs`, `.mts`) with the `@vercel/config` package for type-safe, dynamic routing configuration:

```ts
// vercel.ts
import { defineConfig } from '@vercel/config';

export default defineConfig({
  rewrites: [
    { source: '/api/:path*', destination: 'https://backend.example.com/:path*' },
  ],
  headers: [
    { source: '/(.*)', headers: [{ key: 'X-Frame-Options', value: 'DENY' }] },
  ],
});
```

CLI commands:
- `npx @vercel/config compile` — compile to JSON (stdout)
- `npx @vercel/config validate` — validate and show summary
- `npx @vercel/config generate` — generate `vercel.json` locally for development

**Constraint**: Only one config file per project — `vercel.json` or `vercel.ts`, not both.

## When to Use

- Geo-personalization of static pages (runs before cache)
- A/B testing rewrites with Edge Config
- Custom redirects based on request properties
- Header injection (CSP, CORS, custom headers)
- Lightweight auth checks (defense-in-depth only — not sole auth layer)
- Project-level routes for headers/rewrites without redeploying

## When NOT to Use

- Need full Node.js APIs in Next.js → use `proxy.ts`
- General compute at the edge → use Edge Functions
- Heavy business logic or database queries → use server-side framework features
- Auth as sole protection → use Layouts, Server Components, or Route Handlers
- Thousands of static redirects → use Bulk Redirects (up to 1M per project)

## References

- 📖 docs: https://vercel.com/docs/routing-middleware
- 📖 API reference: https://vercel.com/docs/routing-middleware/api
- 📖 getting started: https://vercel.com/docs/routing-middleware/getting-started
