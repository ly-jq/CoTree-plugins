---
name: "import.codex.vercel.swr"
description: "SWR data-fetching expert guidance. Use when building React apps with client-side data fetching, caching, revalidation, mutations, optimistic UI, pagination, or infinite loading using the SWR library."
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

# SWR — React Hooks for Data Fetching

You are an expert in SWR v2 (latest: 2.4.1), the React Hooks library for data fetching by Vercel. SWR implements the stale-while-revalidate HTTP cache invalidation strategy — serve from cache first, then revalidate in the background.

## Installation

```bash
npm install swr
```

## Core API

### `useSWR`

```tsx
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

function Profile() {
  const { data, error, isLoading, mutate } = useSWR('/api/user', fetcher)

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error loading data</div>
  return <div>Hello, {data.name}</div>
}
```

**Key parameters:**
- `key` — unique string, array, or function identifying the resource (often a URL)
- `fetcher` — async function that receives the key and returns data
- `options` — optional config object

**Return values:** `data`, `error`, `isLoading`, `isValidating`, `mutate`

### `useSWRMutation` — Remote Mutations

```tsx
import useSWRMutation from 'swr/mutation'

async function updateUser(url: string, { arg }: { arg: { name: string } }) {
  return fetch(url, { method: 'POST', body: JSON.stringify(arg) }).then(res => res.json())
}

function Profile() {
  const { trigger, isMutating } = useSWRMutation('/api/user', updateUser)

  return (
    <button disabled={isMutating} onClick={() => trigger({ name: 'New Name' })}>
      Update
    </button>
  )
}
```

### `useSWRInfinite` — Pagination & Infinite Loading

```tsx
import useSWRInfinite from 'swr/infinite'

const getKey = (pageIndex: number, previousPageData: any[]) => {
  if (previousPageData && !previousPageData.length) return null
  return `/api/items?page=${pageIndex}`
}

function Items() {
  const { data, size, setSize, isLoading } = useSWRInfinite(getKey, fetcher)
  const items = data ? data.flat() : []

  return (
    <>
      {items.map(item => <div key={item.id}>{item.name}</div>)}
      <button onClick={() => setSize(size + 1)}>Load More</button>
    </>
  )
}
```

## Global Configuration

Wrap your app (or a subtree) with `SWRConfig` to set defaults:

```tsx
import { SWRConfig } from 'swr'

function App() {
  return (
    <SWRConfig value={{
      fetcher: (url: string) => fetch(url).then(res => res.json()),
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }}>
      <Dashboard />
    </SWRConfig>
  )
}
```

## Revalidation Strategies

| Strategy | Option | Default |
|---|---|---|
| On window focus | `revalidateOnFocus` | `true` |
| On network recovery | `revalidateOnReconnect` | `true` |
| On mount if stale | `revalidateIfStale` | `true` |
| Polling | `refreshInterval` | `0` (disabled) |
| Manual | Call `mutate()` | — |

## Optimistic Updates

```tsx
const { trigger } = useSWRMutation('/api/user', updateUser, {
  optimisticData: (current) => ({ ...current, name: 'New Name' }),
  rollbackOnError: true,
  populateCache: true,
  revalidate: false,
})
```

## Conditional Fetching

Pass `null` or a falsy key to skip fetching:

```tsx
const { data } = useSWR(userId ? `/api/user/${userId}` : null, fetcher)
```

## Error Retry

SWR retries on error by default with exponential backoff. Customize with:

```tsx
useSWR(key, fetcher, {
  onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
    if (error.status === 404) return // Don't retry on 404
    if (retryCount >= 3) return      // Max 3 retries
    setTimeout(() => revalidate({ retryCount }), 5000)
  },
})
```

## `useSWRSubscription` — Real-Time Data Sources

Subscribe to real-time data (WebSockets, SSE, etc.) with automatic deduplication:

```tsx
import useSWRSubscription from 'swr/subscription'

function LivePrice({ symbol }: { symbol: string }) {
  const { data } = useSWRSubscription(
    `wss://stream.example.com/${symbol}`,
    (key, { next }) => {
      const ws = new WebSocket(key)
      ws.onmessage = (event) => next(null, JSON.parse(event.data))
      ws.onerror = (event) => next(event)
      return () => ws.close()
    }
  )

  return <span>{data?.price}</span>
}
```

The `subscribe` function receives a `next(error, data)` callback and must return a cleanup function. Multiple components using the same key share a single subscription.

## Key Rules

- **Keys must be unique** — two `useSWR` calls with the same key share cache and deduplicate requests
- **Fetcher is optional** when set via `SWRConfig`
- **`mutate(key)`** globally revalidates any hook matching that key
- **Array keys** like `useSWR(['/api/user', id], fetcher)` — the fetcher receives the full array
- **Never call hooks conditionally** — use conditional keys (`null`) instead
