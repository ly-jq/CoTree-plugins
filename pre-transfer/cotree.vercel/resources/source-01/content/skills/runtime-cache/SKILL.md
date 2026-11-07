---
name: "import.codex.vercel.runtime-cache"
description: "Vercel Runtime Cache API guidance — ephemeral per-region key-value cache with tag-based invalidation. Shared across Functions, Routing Middleware, and Builds. Use when implementing caching strategies beyond framework-level caching."
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

# Vercel Runtime Cache API

You are an expert in the Vercel Runtime Cache — an ephemeral caching layer for serverless compute.

## What It Is

The Runtime Cache is a **per-region key-value store** accessible from Vercel Functions, Routing Middleware, and Builds. It supports **tag-based invalidation** for granular cache control.

- **Regional**: Each Vercel region has its own isolated cache
- **Isolated**: Scoped per project AND per deployment environment (`preview` vs `production`)
- **Persistent across deployments**: Cached data survives new deploys; invalidation via TTL or `expireTag`
- **Ephemeral**: Fixed storage limit per project; LRU eviction when full
- **Framework-agnostic**: Works with any framework via `@vercel/functions`

## Key APIs

All APIs from `@vercel/functions`:

### Basic Cache Operations

```ts
import { getCache } from '@vercel/functions';

const cache = getCache();

// Store data with TTL and tags
await cache.set('user:123', userData, {
  ttl: 3600,                      // seconds
  tags: ['users', 'user:123'],    // for bulk invalidation
  name: 'user-profile',           // human-readable label for observability
});

// Retrieve cached data (returns value or undefined)
const data = await cache.get('user:123');

// Delete a specific key
await cache.delete('user:123');

// Expire all entries with a tag (propagates globally within 300ms)
await cache.expireTag('users');
await cache.expireTag(['users', 'user:123']); // multiple tags
```

### Cache Options

```ts
const cache = getCache({
  namespace: 'api',                    // prefix for keys
  namespaceSeparator: ':',             // separator (default)
  keyHashFunction: (key) => sha256(key), // custom key hashing
});
```

### Full Example (Framework-Agnostic)

```ts
import { getCache } from '@vercel/functions';

export default {
  async fetch(request: Request) {
    const cache = getCache();
    const cached = await cache.get('blog-posts');

    if (cached) {
      return Response.json(cached);
    }

    const posts = await fetch('https://api.example.com/posts').then(r => r.json());

    await cache.set('blog-posts', posts, {
      ttl: 3600,
      tags: ['blog'],
    });

    return Response.json(posts);
  },
};
```

### Tag Expiration from Server Action

```ts
'use server';
import { getCache } from '@vercel/functions';

export async function invalidateBlog() {
  await getCache().expireTag('blog');
}
```

## CDN Cache Purging Functions

These purge across **all three cache layers** (CDN + Runtime Cache + Data Cache):

```ts
import { invalidateByTag, dangerouslyDeleteByTag } from '@vercel/functions';

// Stale-while-revalidate: serves stale, revalidates in background
await invalidateByTag('blog-posts');

// Hard delete: next request blocks while fetching from origin (cache stampede risk)
await dangerouslyDeleteByTag('blog-posts', {
  revalidationDeadlineSeconds: 3600,
});
```

**Important distinction**:
- `cache.expireTag()` — operates on Runtime Cache only
- `invalidateByTag()` / `dangerouslyDeleteByTag()` — purges CDN + Runtime + Data caches

## Next.js Integration

### Next.js 16+ (`use cache: remote`)

```ts
// next.config.ts
const nextConfig: NextConfig = { cacheComponents: true };
```

```ts
import { cacheLife, cacheTag } from 'next/cache';

async function getData() {
  'use cache: remote'     // stores in Vercel Runtime Cache
  cacheTag('example-tag')
  cacheLife({ expire: 3600 })
  return fetch('https://api.example.com/data').then(r => r.json());
}
```

- `'use cache'` (no `: remote`) — in-memory only, ephemeral per instance
- `'use cache: remote'` — stores in Vercel Runtime Cache

### Next.js 16 Invalidation APIs

| Function | Context | Behavior |
|----------|---------|----------|
| `updateTag(tag)` | Server Actions only | Immediate expiration, read-your-own-writes |
| `revalidateTag(tag, 'max')` | Server Actions + Route Handlers | Stale-while-revalidate (recommended) |
| `revalidateTag(tag, { expire: 0 })` | Route Handlers (webhooks) | Immediate expiration from external triggers |

**Important**: Single-argument `revalidateTag(tag)` is deprecated in Next.js 16. Always pass a `cacheLife` profile as the second argument.

### Runtime Cache vs ISR Isolation

- Runtime Cache tags do **NOT** apply to ISR pages
- `cache.expireTag` does **NOT** invalidate ISR cache
- Next.js `revalidatePath` / `revalidateTag` does **NOT** invalidate Runtime Cache
- To manage both, use same tag and purge via `invalidateByTag` (hits all cache layers)

## CLI Cache Commands

```bash
# Purge all cached data
vercel cache purge                    # CDN + Data cache
vercel cache purge --type cdn         # CDN only
vercel cache purge --type data        # Data cache only
vercel cache purge --yes              # skip confirmation

# Invalidate by tag (stale-while-revalidate)
vercel cache invalidate --tag blog-posts,user-profiles

# Hard delete by tag (blocks until revalidated)
vercel cache dangerously-delete --tag blog-posts
vercel cache dangerously-delete --tag blog-posts --revalidation-deadline-seconds 3600

# Image invalidation
vercel cache invalidate --srcimg /images/hero.jpg
```

Note: `--tag` and `--srcimg` cannot be used together.

## CDN Cache Tags

Add tags to CDN cached responses for later invalidation:

```ts
import { addCacheTag } from '@vercel/functions';

// Via helper
addCacheTag('product-123');

// Via response header
return Response.json(product, {
  headers: {
    'Vercel-CDN-Cache-Control': 'public, max-age=86400',
    'Vercel-Cache-Tag': 'product-123,products',
  },
});
```

## Limits

| Property | Limit |
|----------|-------|
| Item size | 2 MB |
| Tags per Runtime Cache item | 64 |
| Tags per CDN item | 128 |
| Max tag length | 256 bytes |
| Tags per bulk REST API call | 16 |

Tags are **case-sensitive** and **cannot contain commas**.

## Observability

Monitor hit rates, invalidation patterns, and storage usage in the Vercel Dashboard under **Observability → Runtime Cache**. The CDN dashboard (March 5, 2026) provides a unified view of global traffic distribution, cache performance metrics, a redesigned purging interface, and **project-level routing** — update response headers or rewrite to external APIs without triggering a new deployment. Project-level routes are available on all plans and take effect instantly.

## When to Use

- Caching API responses or computed data across functions in a region
- Tag-based invalidation when content changes (CMS webhook → expire tag)
- Reducing database load for frequently accessed data
- Cross-function data sharing within a region

## When NOT to Use

- Framework-level page caching → use Next.js Cache Components (`'use cache'`)
- Persistent storage → use a database (Neon, Upstash)
- CDN-level full response caching → use `Cache-Control` / `Vercel-CDN-Cache-Control` headers
- Cross-region shared state → use a database
- User-specific data that differs per request

## References

- 📖 docs: https://vercel.com/docs/runtime-cache
- 📖 changelog: https://vercel.com/changelog/introducing-the-runtime-cache-api
- 📖 CLI cache: https://vercel.com/docs/cli/cache
- 📖 CDN cache purging: https://vercel.com/docs/cdn-cache/purge
