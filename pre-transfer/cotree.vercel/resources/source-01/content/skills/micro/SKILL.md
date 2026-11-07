---
name: "import.codex.vercel.micro"
description: "Expert guidance for micro — asynchronous HTTP microservices framework by Vercel. Use when building lightweight HTTP servers, API endpoints, or microservices using the micro library."
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

# micro — Asynchronous HTTP Microservices

You are an expert in micro, Vercel's lightweight framework for building asynchronous HTTP microservices in Node.js. micro makes it easy to write single-purpose HTTP endpoints with minimal boilerplate.

## Installation

```bash
npm install micro
```

## Basic Usage

Create a module that exports a request handler:

```ts
// index.ts
import { serve } from 'micro'

const handler = (req: Request) => {
  return new Response('Hello, World!')
}

serve(handler)
```

Or use the classic API:

```ts
import { IncomingMessage, ServerResponse } from 'http'

export default (req: IncomingMessage, res: ServerResponse) => {
  res.end('Hello, World!')
}
```

Run with:

```bash
npx micro
```

## Core API

### `json(req)` — Parse JSON Body

```ts
import { json } from 'micro'

export default async (req: IncomingMessage, res: ServerResponse) => {
  const body = await json(req)
  return { received: body }
}
```

### `text(req)` — Parse Text Body

```ts
import { text } from 'micro'

export default async (req: IncomingMessage, res: ServerResponse) => {
  const body = await text(req)
  return `You said: ${body}`
}
```

### `buffer(req)` — Parse Raw Body

```ts
import { buffer } from 'micro'

export default async (req: IncomingMessage, res: ServerResponse) => {
  const raw = await buffer(req)
  return `Received ${raw.length} bytes`
}
```

### `send(res, statusCode, data)` — Send Response

```ts
import { send } from 'micro'

export default (req: IncomingMessage, res: ServerResponse) => {
  send(res, 200, { status: 'ok' })
}
```

### `createError(statusCode, message)` — HTTP Errors

```ts
import { createError } from 'micro'

export default (req: IncomingMessage, res: ServerResponse) => {
  if (!req.headers.authorization) {
    throw createError(401, 'Unauthorized')
  }
  return { authorized: true }
}
```

## Development with micro-dev

`micro-dev` provides hot-reloading for development:

```bash
npm install --save-dev micro-dev

# Run in dev mode
npx micro-dev index.js
```

## Composition

Chain multiple handlers with function composition:

```ts
import { IncomingMessage, ServerResponse } from 'http'

const cors = (fn: Function) => async (req: IncomingMessage, res: ServerResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  return fn(req, res)
}

const handler = async (req: IncomingMessage, res: ServerResponse) => {
  return { hello: 'world' }
}

export default cors(handler)
```

## package.json Setup

```json
{
  "main": "index.js",
  "scripts": {
    "start": "micro",
    "dev": "micro-dev"
  },
  "dependencies": {
    "micro": "^10.0.0"
  },
  "devDependencies": {
    "micro-dev": "^3.0.0"
  }
}
```

## Key Points

1. **Return values are sent as responses** — return strings, objects (auto-serialized to JSON), or Buffers
2. **Async by default** — handlers can be async functions, errors are caught automatically
3. **Thrown errors become HTTP errors** — use `createError()` for proper status codes
4. **No routing built-in** — micro is a single-endpoint server; use a router like `micro-router` for multi-route services
5. **Body parsing is explicit** — use `json()`, `text()`, or `buffer()` to parse request bodies
6. **Composable** — wrap handlers with higher-order functions for middleware-like behavior

## Official Resources

- [micro GitHub](https://github.com/vercel/micro)
