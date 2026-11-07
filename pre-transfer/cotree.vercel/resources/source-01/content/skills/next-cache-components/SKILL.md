---
name: "import.codex.vercel.next-cache-components"
description: "Next.js 16 Cache Components guidance — PPR, use cache directive, cacheLife, cacheTag, updateTag, and migration from unstable_cache. Use when implementing partial prerendering, caching strategies, or migrating from older Next.js cache patterns."
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

# Cache Components (Next.js 16+)

Cache Components enable Partial Prerendering (PPR) - mix static, cached, and dynamic content in a single route.

## Enable Cache Components

```ts
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  cacheComponents: true,
}

export default nextConfig
```

This replaces the old `experimental.ppr` flag.

---

## Three Content Types

With Cache Components enabled, content falls into three categories:

### 1. Static (Auto-Prerendered)

Synchronous code, imports, pure computations - prerendered at build time:

```tsx
export default function Page() {
  return (
    <header>
      <h1>Our Blog</h1>  {/* Static - instant */}
      <nav>...</nav>
    </header>
  )
}
```

### 2. Cached (`use cache`)

Async data that doesn't need fresh fetches every request:

```tsx
async function BlogPosts() {
  'use cache'
  cacheLife('hours')

  const posts = await db.posts.findMany()
  return <PostList posts={posts} />
}
```

### 3. Dynamic (Suspense)

Runtime data that must be fresh - wrap in Suspense:

```tsx
import { Suspense } from 'react'

export default function Page() {
  return (
    <>
      <BlogPosts />  {/* Cached */}

      <Suspense fallback={<p>Loading...</p>}>
        <UserPreferences />  {/* Dynamic - streams in */}
      </Suspense>
    </>
  )
}

async function UserPreferences() {
  const theme = (await cookies()).get('theme')?.value
  return <p>Theme: {theme}</p>
}
```

---

## `use cache` Directive

### File Level

```tsx
'use cache'

export default async function Page() {
  // Entire page is cached
  const data = await fetchData()
  return <div>{data}</div>
}
```

### Component Level

```tsx
export async function CachedComponent() {
  'use cache'
  const data = await fetchData()
  return <div>{data}</div>
}
```

### Function Level

```tsx
export async function getData() {
  'use cache'
  return db.query('SELECT * FROM posts')
}
```

---

## Cache Profiles

### Built-in Profiles

```tsx
'use cache'                    // Default: 5m stale, 15m revalidate
```

```tsx
'use cache: remote'           // Platform-provided cache (Redis, KV)
```

```tsx
'use cache: private'          // For compliance, allows runtime APIs
```

### `cacheLife()` - Custom Lifetime

```tsx
import { cacheLife } from 'next/cache'

async function getData() {
  'use cache'
  cacheLife('hours')  // Built-in profile
  return fetch('/api/data')
}
```

Built-in profiles: `'default'`, `'minutes'`, `'hours'`, `'days'`, `'weeks'`, `'max'`

### Inline Configuration

```tsx
async function getData() {
  'use cache'
  cacheLife({
    stale: 3600,      // 1 hour - serve stale while revalidating
    revalidate: 7200, // 2 hours - background revalidation interval
    expire: 86400,    // 1 day - hard expiration
  })
  return fetch('/api/data')
}
```

---

## Cache Invalidation

### `cacheTag()` - Tag Cached Content

```tsx
import { cacheTag } from 'next/cache'

async function getProducts() {
  'use cache'
  cacheTag('products')
  return db.products.findMany()
}

async function getProduct(id: string) {
  'use cache'
  cacheTag('products', `product-${id}`)
  return db.products.findUnique({ where: { id } })
}
```

### `updateTag()` - Immediate Invalidation

Use when you need the cache refreshed within the same request:

```tsx
'use server'

import { updateTag } from 'next/cache'

export async function updateProduct(id: string, data: FormData) {
  await db.products.update({ where: { id }, data })
  updateTag(`product-${id}`)  // Immediate - same request sees fresh data
}
```

### `revalidateTag()` - Background Revalidation

Use for stale-while-revalidate behavior:

```tsx
'use server'

import { revalidateTag } from 'next/cache'

export async function createPost(data: FormData) {
  await db.posts.create({ data })
  revalidateTag('posts')  // Background - next request sees fresh data
}
```

---

## Runtime Data Constraint

**Cannot** access `cookies()`, `headers()`, or `searchParams` inside `use cache`.

### Solution: Pass as Arguments

```tsx
// Wrong - runtime API inside use cache
async function CachedProfile() {
  'use cache'
  const session = (await cookies()).get('session')?.value  // Error!
  return <div>{session}</div>
}

// Correct - extract outside, pass as argument
async function ProfilePage() {
  const session = (await cookies()).get('session')?.value
  return <CachedProfile sessionId={session} />
}

async function CachedProfile({ sessionId }: { sessionId: string }) {
  'use cache'
  // sessionId becomes part of cache key automatically
  const data = await fetchUserData(sessionId)
  return <div>{data.name}</div>
}
```

### Exception: `use cache: private`

For compliance requirements when you can't refactor:

```tsx
async function getData() {
  'use cache: private'
  const session = (await cookies()).get('session')?.value  // Allowed
  return fetchData(session)
}
```

---

## Cache Key Generation

Cache keys are automatic based on:
- **Build ID** - invalidates all caches on deploy
- **Function ID** - hash of function location
- **Serializable arguments** - props become part of key
- **Closure variables** - outer scope values included

```tsx
async function Component({ userId }: { userId: string }) {
  const getData = async (filter: string) => {
    'use cache'
    // Cache key = userId (closure) + filter (argument)
    return fetch(`/api/users/${userId}?filter=${filter}`)
  }
  return getData('active')
}
```

---

## Complete Example

```tsx
import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { cacheLife, cacheTag } from 'next/cache'

export default function DashboardPage() {
  return (
    <>
      {/* Static shell - instant from CDN */}
      <header><h1>Dashboard</h1></header>
      <nav>...</nav>

      {/* Cached - fast, revalidates hourly */}
      <Stats />

      {/* Dynamic - streams in with fresh data */}
      <Suspense fallback={<NotificationsSkeleton />}>
        <Notifications />
      </Suspense>
    </>
  )
}

async function Stats() {
  'use cache'
  cacheLife('hours')
  cacheTag('dashboard-stats')

  const stats = await db.stats.aggregate()
  return <StatsDisplay stats={stats} />
}

async function Notifications() {
  const userId = (await cookies()).get('userId')?.value
  const notifications = await db.notifications.findMany({
    where: { userId, read: false }
  })
  return <NotificationList items={notifications} />
}
```

---

## Migration from Previous Versions

| Old Config | Replacement |
|-----------|-------------|
| `experimental.ppr` | `cacheComponents: true` |
| `dynamic = 'force-dynamic'` | Remove (default behavior) |
| `dynamic = 'force-static'` | `'use cache'` + `cacheLife('max')` |
| `revalidate = N` | `cacheLife({ revalidate: N })` |
| `unstable_cache()` | `'use cache'` directive |

### Migrating `unstable_cache` to `use cache`

`unstable_cache` has been replaced by the `use cache` directive in Next.js 16. When `cacheComponents` is enabled, convert `unstable_cache` calls to `use cache` functions:

**Before (`unstable_cache`):**

```tsx
import { unstable_cache } from 'next/cache'

const getCachedUser = unstable_cache(
  async (id) => getUser(id),
  ['my-app-user'],
  {
    tags: ['users'],
    revalidate: 60,
  }
)

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCachedUser(id)
  return <div>{user.name}</div>
}
```

**After (`use cache`):**

```tsx
import { cacheLife, cacheTag } from 'next/cache'

async function getCachedUser(id: string) {
  'use cache'
  cacheTag('users')
  cacheLife({ revalidate: 60 })
  return getUser(id)
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCachedUser(id)
  return <div>{user.name}</div>
}
```

Key differences:
- **No manual cache keys** - `use cache` generates keys automatically from function arguments and closures. The `keyParts` array from `unstable_cache` is no longer needed.
- **Tags** - Replace `options.tags` with `cacheTag()` calls inside the function.
- **Revalidation** - Replace `options.revalidate` with `cacheLife({ revalidate: N })` or a built-in profile like `cacheLife('minutes')`.
- **Dynamic data** - `unstable_cache` did not support `cookies()` or `headers()` inside the callback. The same restriction applies to `use cache`, but you can use `'use cache: private'` if needed.

---

## Limitations

- **Edge runtime not supported** - requires Node.js
- **Static export not supported** - needs server
- **Non-deterministic values** (`Math.random()`, `Date.now()`) execute once at build time inside `use cache`

For request-time randomness outside cache:

```tsx
import { connection } from 'next/server'

async function DynamicContent() {
  await connection()  // Defer to request time
  const id = crypto.randomUUID()  // Different per request
  return <div>{id}</div>
}
```

Sources:
- [Cache Components Guide](https://nextjs.org/docs/app/getting-started/cache-components)
- [use cache Directive](https://nextjs.org/docs/app/api-reference/directives/use-cache)
- [unstable_cache (legacy)](https://nextjs.org/docs/app/api-reference/functions/unstable_cache)
