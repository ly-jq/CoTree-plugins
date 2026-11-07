---
name: "import.codex.cloudflare.agents-sdk"
description: "Build AI agents on Cloudflare Workers using the Agents SDK. Load when creating stateful agents, durable workflows, real-time WebSocket apps, scheduled tasks, MCP servers, or chat applications. Covers Agent class, state management, callable RPC, Workflows integration, and React hooks. Biases towards retrieval from Cloudflare docs over pre-trained knowledge."
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

# Cloudflare Agents SDK

Your knowledge of the Agents SDK may be outdated. **Prefer retrieval over pre-training** for any Agents SDK task.

## Retrieval Sources

Fetch current docs from `https://github.com/cloudflare/agents/tree/main/docs` before implementing.

| Topic | Doc | Use for |
|-------|-----|---------|
| Getting started | `docs/getting-started.md` | First agent, project setup |
| State | `docs/state.md` | `setState`, `validateStateChange`, persistence |
| Routing | `docs/routing.md` | URL patterns, `routeAgentRequest`, `basePath` |
| Callable methods | `docs/callable-methods.md` | `@callable`, RPC, streaming, timeouts |
| Scheduling | `docs/scheduling.md` | `schedule()`, `scheduleEvery()`, cron |
| Workflows | `docs/workflows.md` | `AgentWorkflow`, durable multi-step tasks |
| HTTP/WebSockets | `docs/http-websockets.md` | Lifecycle hooks, hibernation |
| Email | `docs/email.md` | Email routing, secure reply resolver |
| MCP client | `docs/mcp-client.md` | Connecting to MCP servers |
| MCP server | `docs/mcp-servers.md` | Building MCP servers with `McpAgent` |
| Client SDK | `docs/client-sdk.md` | `useAgent`, `useAgentChat`, React hooks |
| Human-in-the-loop | `docs/human-in-the-loop.md` | Approval flows, pausing workflows |
| Resumable streaming | `docs/resumable-streaming.md` | Stream recovery on disconnect |

Cloudflare docs: https://developers.cloudflare.com/agents/

## Capabilities

The Agents SDK provides:

- **Persistent state** - SQLite-backed, auto-synced to clients
- **Callable RPC** - `@callable()` methods invoked over WebSocket
- **Scheduling** - One-time, recurring (`scheduleEvery`), and cron tasks
- **Workflows** - Durable multi-step background processing via `AgentWorkflow`
- **MCP integration** - Connect to MCP servers or build your own with `McpAgent`
- **Email handling** - Receive and reply to emails with secure routing
- **Streaming chat** - `AIChatAgent` with resumable streams
- **React hooks** - `useAgent`, `useAgentChat` for client apps

## FIRST: Verify Installation

```bash
npm ls agents  # Should show agents package
```

If not installed:
```bash
npm install agents
```

## Wrangler Configuration

```jsonc
{
  "durable_objects": {
    "bindings": [{ "name": "MyAgent", "class_name": "MyAgent" }]
  },
  "migrations": [{ "tag": "v1", "new_sqlite_classes": ["MyAgent"] }]
}
```

## Agent Class

```typescript
import { Agent, routeAgentRequest, callable } from "agents";

type State = { count: number };

export class Counter extends Agent<Env, State> {
  initialState = { count: 0 };

  // Validation hook - runs before state persists (sync, throwing rejects the update)
  validateStateChange(nextState: State, source: Connection | "server") {
    if (nextState.count < 0) throw new Error("Count cannot be negative");
  }

  // Notification hook - runs after state persists (async, non-blocking)
  onStateUpdate(state: State, source: Connection | "server") {
    console.log("State updated:", state);
  }

  @callable()
  increment() {
    this.setState({ count: this.state.count + 1 });
    return this.state.count;
  }
}

export default {
  fetch: (req, env) => routeAgentRequest(req, env) ?? new Response("Not found", { status: 404 })
};
```

## Routing

Requests route to `/agents/{agent-name}/{instance-name}`:

| Class | URL |
|-------|-----|
| `Counter` | `/agents/counter/user-123` |
| `ChatRoom` | `/agents/chat-room/lobby` |

Client: `useAgent({ agent: "Counter", name: "user-123" })`

## Core APIs

| Task | API |
|------|-----|
| Read state | `this.state.count` |
| Write state | `this.setState({ count: 1 })` |
| SQL query | `` this.sql`SELECT * FROM users WHERE id = ${id}` `` |
| Schedule (delay) | `await this.schedule(60, "task", payload)` |
| Schedule (cron) | `await this.schedule("0 * * * *", "task", payload)` |
| Schedule (interval) | `await this.scheduleEvery(30, "poll")` |
| RPC method | `@callable() myMethod() { ... }` |
| Streaming RPC | `@callable({ streaming: true }) stream(res) { ... }` |
| Start workflow | `await this.runWorkflow("ProcessingWorkflow", params)` |

## React Client

```tsx
import { useAgent } from "agents/react";

function App() {
  const [state, setLocalState] = useState({ count: 0 });

  const agent = useAgent({
    agent: "Counter",
    name: "my-instance",
    onStateUpdate: (newState) => setLocalState(newState),
    onIdentity: (name, agentType) => console.log(`Connected to ${name}`)
  });

  return (
    <button onClick={() => agent.setState({ count: state.count + 1 })}>
      Count: {state.count}
    </button>
  );
}
```

## References

- **[references/workflows.md](references/workflows.md)** - Durable Workflows integration
- **[references/callable.md](references/callable.md)** - RPC methods, streaming, timeouts
- **[references/state-scheduling.md](references/state-scheduling.md)** - State persistence, scheduling
- **[references/streaming-chat.md](references/streaming-chat.md)** - AIChatAgent, resumable streams
- **[references/mcp.md](references/mcp.md)** - MCP server integration
- **[references/email.md](references/email.md)** - Email routing and handling
- **[references/codemode.md](references/codemode.md)** - Code Mode (experimental)
