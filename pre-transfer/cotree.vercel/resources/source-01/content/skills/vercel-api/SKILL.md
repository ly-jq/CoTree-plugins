---
name: "import.codex.vercel.vercel-api"
description: "Vercel app and REST API expert guidance. Use when the agent needs live access to Vercel projects, deployments, environment variables, domains, logs, or documentation through the connected Vercel app or REST API."
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

# Vercel API — Connected App & REST API

You are an expert in the Vercel platform APIs. This plugin uses the connected Vercel app for live, authenticated access to Vercel resources, and this skill also covers the direct REST API when connector coverage is not enough.

## Connected Vercel App

The plugin's `.app.json` points Codex at the connected Vercel app. The linked Vercel documentation still describes the underlying MCP server and REST API, and this skill uses that documentation where it helps explain capabilities and fallback paths.

### Connection

```
URL:       https://mcp.vercel.com
Transport: Streamable HTTP
Auth:      OAuth 2.1 (automatic — agent is prompted to authorize on first use)
```

On first connection the agent will open a browser-based OAuth flow to grant read access to your Vercel account. Subsequent sessions reuse the stored token.

### Available MCP Tools

The connected Vercel app exposes these tool categories:

| Category | Capabilities |
|----------|-------------|
| **Documentation** | Search and navigate Vercel docs, Next.js docs, AI SDK docs |
| **Projects** | List projects, get project details, view project settings |
| **Deployments** | List deployments, inspect deployment details, view build output |
| **Logs** | Query deployment logs, function invocation logs, build logs |
| **Domains** | List domains, check domain configuration and DNS status |
| **Environment Variables** | List env vars per project and environment |
| **Teams** | List teams, view team members and settings |

### Usage Patterns

#### Diagnose a failed deployment

```
1. List recent deployments → find the failed one
2. Inspect deployment → get error summary
3. Query build logs → identify root cause
4. Cross-reference with vercel-functions skill for runtime fixes
```

#### Audit project configuration

```
1. Get project details → check framework, build settings, root directory
2. List environment variables → verify required vars are set per environment
3. List domains → confirm production domain is correctly assigned
4. Check deployment logs → look for runtime warnings
```

#### Search documentation

```
1. Search Vercel docs for a topic → get relevant pages
2. Read specific doc page → extract configuration examples
3. Cross-reference with bundled skills for deeper guidance
```

#### Debug function performance

```
1. Query function logs → find slow invocations
2. Inspect deployment → check function region, runtime, memory
3. Cross-reference with vercel-functions skill for optimization patterns
```

## Deploying Your Own MCP Server

Use the `mcp-handler` package (renamed from `@vercel/mcp-adapter`) to build and deploy custom MCP servers on Vercel with Next.js, Nuxt, or SvelteKit:

```bash
npm install mcp-handler
```

MCP servers deployed on Vercel use **Streamable HTTP** transport (replaced SSE in March 2025 MCP spec) — cuts CPU usage vs SSE with no persistent connections required. Used in production by Zapier, Composio, Vapi, and Solana.

See [Deploy MCP servers to Vercel](https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel) and [GitHub: mcp-handler](https://github.com/vercel/mcp-handler).

## REST API (Direct Access)

When the MCP server doesn't cover a use case (or for write operations), use the Vercel REST API directly with `@vercel/sdk` or `curl`.

### Authentication

```bash
# Bearer token auth (personal token or team token)
curl -H "Authorization: Bearer $VERCEL_TOKEN" https://api.vercel.com/v9/projects
```

```typescript
// @vercel/sdk
import { Vercel } from '@vercel/sdk';

const vercel = new Vercel({ bearerToken: process.env.VERCEL_TOKEN });
```

### Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v9/projects` | GET | List all projects |
| `/v9/projects/:id` | GET | Get project details |
| `/v13/deployments` | GET | List deployments |
| `/v13/deployments` | POST | Create a deployment |
| `/v13/deployments/:id` | GET | Get deployment details |
| `/v9/projects/:id/env` | GET | List environment variables |
| `/v9/projects/:id/env` | POST | Create environment variable |
| `/v6/domains` | GET | List domains |
| `/v6/domains` | POST | Add a domain |
| `/v1/edge-config` | GET | List Edge Configs |
| `/v1/firewall` | GET | List firewall rules |
| `/v1/drains` | GET | List all drains |
| `/v1/drains` | POST | Create a drain |
| `/v1/drains/:id/test` | POST | Test a drain |
| `/v1/drains/:id` | PATCH | Update a drain |
| `/v1/drains/:id` | DELETE | Delete a drain |
| `/v3/deployments/:id/events` | GET | Stream runtime logs |

### SDK Examples

#### List deployments

```typescript
import { Vercel } from '@vercel/sdk';

const vercel = new Vercel({ bearerToken: process.env.VERCEL_TOKEN });

const { deployments } = await vercel.deployments.list({
  projectId: 'prj_xxxxx',
  limit: 10,
});

for (const d of deployments) {
  console.log(`${d.url} — ${d.state} — ${d.created}`);
}
```

#### Manage environment variables

```typescript
// List env vars
const { envs } = await vercel.projects.getProjectEnv({
  idOrName: 'my-project',
});

// Create env var
await vercel.projects.createProjectEnv({
  idOrName: 'my-project',
  requestBody: {
    key: 'DATABASE_URL',
    value: 'postgres://...',
    target: ['production', 'preview'],
    type: 'encrypted',
  },
});
```

#### Get project domains

```typescript
const { domains } = await vercel.projects.getProjectDomains({
  idOrName: 'my-project',
});

for (const d of domains) {
  console.log(`${d.name} — verified: ${d.verified}`);
}
```

## Observability APIs

### Drains (`/v1/drains`)

Drains forward logs, traces, speed insights, and web analytics data to external endpoints. All drain management is REST API or Dashboard (`https://vercel.com/dashboard/{team}/~/settings/log-drains`) only — no CLI commands exist.

```typescript
import { Vercel } from '@vercel/sdk';

const vercel = new Vercel({ bearerToken: process.env.VERCEL_TOKEN });

// List all drains
const drains = await vercel.logDrains.getLogDrains({ teamId: 'team_xxxxx' });

// Create a drain
await vercel.logDrains.createLogDrain({
  teamId: 'team_xxxxx',
  requestBody: {
    url: 'https://your-endpoint.example.com/logs',
    type: 'json',
    sources: ['lambda', 'edge', 'static'],
    environments: ['production'],
  },
});
```

> For payload schemas (JSON, NDJSON), signature verification, and vendor integration setup, see `⤳ skill: observability`.

### Runtime Logs (`/v3/deployments/:id/events`)

Stream runtime logs for a deployment. The response uses `application/stream+json` — each line is a separate JSON object. Always set a timeout to avoid hanging on long-lived streams.

```typescript
// Query via MCP (recommended for agents)
// Use the get_runtime_logs MCP tool for structured log access

// Direct REST alternative (streaming)
const res = await fetch(
  `https://api.vercel.com/v3/deployments/${deploymentId}/events`,
  { headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` } }
);
// Parse as NDJSON — see observability skill for streaming code patterns
```

## `vercel api` CLI Command (January 2026)

The `vercel api` command gives agents direct access to the full Vercel REST API from the terminal with no additional configuration. It uses the CLI's existing authentication, so agents can call any endpoint immediately.

```bash
# Call any REST endpoint directly
vercel api GET /v9/projects
vercel api GET /v13/deployments
vercel api POST /v9/projects/:id/env --body '{"key":"MY_VAR","value":"val","target":["production"]}'
```

This bridges the gap between the read-only MCP server and the full REST API — agents can perform write operations without needing `@vercel/sdk` or manual `curl` with tokens.

## When to Use MCP vs CLI vs REST API

| Scenario | Use | Why |
|----------|-----|-----|
| Agent needs to inspect/read Vercel state | **MCP server** | OAuth, structured tools, no token management |
| Agent needs to deploy or mutate state | **CLI** (`vercel deploy`, `vercel env add`) | Full write access, well-tested |
| Agent needs ad-hoc API access | **`vercel api`** | Direct REST from terminal, no token setup |
| Programmatic access from app code | **REST API / @vercel/sdk** | TypeScript types, fine-grained control |
| CI/CD pipeline automation | **CLI + VERCEL_TOKEN** | Scriptable, `--prebuilt` for speed |
| Searching Vercel documentation | **MCP server** | Indexed docs, AI-optimized results |

## Cross-References

- **CLI operations** → `⤳ skill: vercel-cli`
- **Function configuration** → `⤳ skill: vercel-functions`
- **Storage APIs** → `⤳ skill: vercel-storage`
- **Firewall rules** → `⤳ skill: vercel-firewall`
- **AI SDK MCP client** → `⤳ skill: ai-sdk` (section: MCP Integration)
- **Drains, log streaming, analytics export** → `⤳ skill: observability`

## Official Documentation

- [Vercel MCP](https://vercel.com/docs/mcp)
- [Vercel REST API](https://vercel.com/docs/rest-api/reference)
- [@vercel/sdk](https://www.npmjs.com/package/@vercel/sdk)
- [MCP Authorization Spec](https://spec.modelcontextprotocol.io)
- [GitHub: Vercel SDK](https://github.com/vercel/sdk)
