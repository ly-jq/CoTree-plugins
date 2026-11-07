---
name: "import.codex.vercel.command.status"
description: "Show the status of the current Vercel project — recent deployments, linked project info, and environment overview."
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

# Vercel Project Status (Doctor)

Comprehensive project health check. Diagnoses deployment state, environment configuration, domains, and build status.

## Preflight

1. Check for `.vercel/project.json` in the current directory (or nearest parent).
   - **If found**: read `projectId` and `orgId` to confirm linkage. Print project name.
   - **If not found**: print a clear message:
     > This project is not linked to Vercel. Run `vercel link` to connect it, then re-run `/status`.
     Stop here — remaining steps require a linked project.
2. Verify `vercel` CLI is available on PATH. If missing, suggest `npm i -g vercel`.
3. Detect monorepo markers (`turbo.json`, `pnpm-workspace.yaml`). If present, note which package scope is active.

## Plan

Gather project diagnostics using MCP reads where available, CLI as fallback:

1. Fetch recent deployments (last 5).
2. Inspect the latest deployment for build status and metadata.
3. List environment variables per environment (counts only — never print values).
4. Check domain configuration and status.
5. Read `vercel.json` for configuration highlights.

No destructive operations — this command is read-only.

## Commands

### 1. Recent Deployments

```
vercel ls --limit 5
```

Extract: deployment URL, state (READY / ERROR / BUILDING), target (production / preview), created timestamp.

### 2. Latest Deployment Inspection

```
vercel inspect <latest-deployment-url>
```

Extract: build duration, function count, region, framework detected, Node.js version.

### 3. Environment Variable Counts

```
vercel env ls
```

Count variables per environment (Production, Preview, Development). **Never echo variable values.**

Present as:

| Environment | Count |
|-------------|-------|
| Production  | N     |
| Preview     | N     |
| Development | N     |

### 4. Domain Status

```
vercel domains ls
```

For each domain: name, DNS configured (yes/no), SSL valid (yes/no).

### 5. Configuration Highlights

Read `vercel.json` (if present) and summarize:

- Framework preset
- Build command overrides
- Function configuration (runtime, memory, duration)
- Rewrites / redirects count
- Cron jobs defined
- Headers or middleware config

If `vercel.json` does not exist, note "No vercel.json found — using framework defaults."

### 6. Observability Diagnostics

Check the project's observability posture — drains, error monitoring, analytics instrumentation, and drain security.

#### 6a. Drains Configured?

Use MCP `list_drains` if available, or the REST API:

```bash
curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v1/drains?teamId=$TEAM_ID" | jq '.drains | length'
```

- **If drains exist**: list drain count, types (JSON/NDJSON/Syslog), and statuses.
- **If zero drains**: note "No drains configured" and flag as a gap for production observability.

#### 6b. Errored Drains?

For each drain returned, check the status field. If any drain shows an error or disabled state:

```
⚠️ Drain "<drain-url>" is in error state.
Remediation:
  1. Verify the endpoint URL is reachable and returns 2xx.
  2. Check that the endpoint accepts the configured format (JSON/NDJSON/Syslog).
  3. Test the drain: POST /v1/drains/<drain-id>/test
  4. If unrecoverable, delete and recreate the drain.
```

#### 6c. Analytics Instrumentation Present?

Scan the project source for `@vercel/analytics` and `@vercel/speed-insights` imports:

- Check `package.json` dependencies for `@vercel/analytics` and `@vercel/speed-insights`.
- If missing either package, flag:
  > Analytics/Speed Insights not detected. See `⤳ skill: observability` for setup.

#### 6d. Drain Signature Verification

<!-- Sourced from observability skill: Drains > Security: Signature Verification -->
Vercel signs every drain payload with an HMAC-SHA1 signature in the `x-vercel-signature` header. **Always verify signatures in production** to prevent spoofed data.

> **Critical:** You must verify against the **raw request body** (not a parsed/re-serialized version). JSON parsing and re-stringifying can change key order or whitespace, breaking the signature match.

```ts
import { createHmac, timingSafeEqual } from 'crypto'

function verifyDrainSignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha1', secret).update(rawBody).digest('hex')
  // Use timing-safe comparison to prevent timing attacks
  if (expected.length !== signature.length) return false
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}
```

Usage in a drain endpoint:

```ts
// app/api/drain/route.ts
export async function POST(req: Request) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-vercel-signature')
  const secret = process.env.DRAIN_SECRET!

  if (!signature || !verifyDrainSignature(rawBody, signature, secret)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const events = JSON.parse(rawBody)
  // Process verified events...
  return new Response('OK', { status: 200 })
}
```

> **Secret management:** The drain signing secret is shown once when you create the drain. Store it in an environment variable (e.g., `DRAIN_SECRET`). If lost, delete and recreate the drain.

Check whether the project has a `DRAIN_SECRET` env var set via `vercel env ls`. If drains are configured but no signature secret is found, flag as a security gap.

#### 6e. Fallback Guidance (No Drains)

<!-- Sourced from observability skill: Drains > Fallback Guidance (No Drains) -->
If drains are unavailable (Hobby plan or not yet configured), use these alternatives:

| Need | Alternative | How |
|------|-------------|-----|
| View runtime logs | **Vercel Dashboard** | `https://vercel.com/{team}/{project}/deployments` → select deployment → Logs tab |
| Stream logs from terminal | **Vercel CLI** | `vercel logs <deployment-url> --follow` (see `⤳ skill: vercel-cli`) |
| Query logs programmatically | **MCP / REST API** | `get_runtime_logs` tool or `/v3/deployments/:id/events` (see `⤳ skill: vercel-api`) |
| Monitor errors post-deploy | **CLI** | `vercel logs <url> --level error --since 1h` |
| Web Analytics data | **Dashboard only** | `https://vercel.com/{team}/{project}/analytics` |
| Performance metrics | **Dashboard only** | `https://vercel.com/{team}/{project}/speed-insights` |

> **Upgrade path:** When ready for centralized observability, upgrade to Pro and configure drains at `https://vercel.com/dashboard/{team}/~/settings/log-drains` or via REST API. The drain setup is typically < 5 minutes.

#### Observability Decision Matrix

<!-- Sourced from observability skill: Decision Matrix -->
| Need | Use | Why |
|------|-----|-----|
| Page views, traffic sources | Web Analytics | First-party, privacy-friendly |
| Business event tracking | Web Analytics custom events | Track conversions, feature usage |
| Core Web Vitals monitoring | Speed Insights | Real user data per route |
| Function debugging | Runtime Logs (CLI `vercel logs` / Dashboard (`https://vercel.com/{team}/{project}/logs`) / REST) | Real-time, per-invocation logs |
| Export logs to external platform | Drains (JSON/NDJSON/Syslog) | Centralize observability (Pro+) |
| Export analytics data | Drains (Web Analytics type) | Warehouse pageviews + custom events (Pro+) |
| OpenTelemetry traces | Drains (OTel-compatible endpoint) | Standards-based distributed tracing (Pro+) |
| Post-response telemetry | `waitUntil` + custom reporting | Non-blocking metrics |
| Server-side event tracking | `@vercel/analytics/server` | Track API-triggered events |
| Hobby plan log access | CLI `vercel logs` + Dashboard (`https://vercel.com/{team}/{project}/logs`) | No drains needed |

## Verification

Confirm each data source returned successfully:

- [ ] Deployment list retrieved (count > 0 or "no deployments yet")
- [ ] Latest deployment inspected (or skipped if no deployments)
- [ ] Environment variable counts retrieved per environment
- [ ] Domain list retrieved (or "no custom domains")
- [ ] vercel.json parsed (or "not present")
- [ ] Drain status checked (count, errored drains identified)
- [ ] Analytics/Speed Insights instrumentation detected (or gap flagged)
- [ ] Drain signature secret checked (if drains configured)

If any check fails, report the specific error and continue with remaining checks.

## Summary

Present the diagnostic report:

```
## Vercel Doctor — Project Status

**Project**: <name> (<org>)
**Latest Deployment**: <url> — <state> (<target>, <timestamp>)
**Build**: <duration>, <framework>, Node <version>

### Deployments (last 5)
| URL | State | Target | Created |
|-----|-------|--------|---------|
| ... | ...   | ...    | ...     |

### Environment Variables
| Environment | Count |
|-------------|-------|
| Production  | N     |
| Preview     | N     |
| Development | N     |

### Domains
| Domain | DNS | SSL |
|--------|-----|-----|
| ...    | ... | ... |

### Config Highlights
- <key settings from vercel.json>

### Observability
| Check | Status |
|-------|--------|
| Drains configured | N configured (N healthy, N errored) |
| Analytics (`@vercel/analytics`) | ✓ installed / ✗ not found |
| Speed Insights (`@vercel/speed-insights`) | ✓ installed / ✗ not found |
| Drain signature secret | ✓ DRAIN_SECRET set / ⚠ missing |
```

## Next Steps

Based on the diagnostic results, suggest relevant actions:

- **Build errors** → "Run `/deploy` to trigger a fresh build, or check `vercel logs <url>` for details."
- **Missing env vars** → "Run `/env list` to review, or `/env pull` to sync locally."
- **DNS not configured** → "Update your domain DNS records. See the Vercel domains dashboard."
- **No deployments** → "Run `/deploy` to create your first deployment."
- **Stale deployment** → "Your latest deployment is over 7 days old. Consider redeploying."
- **No vercel.json** → "Add a `vercel.json` if you need custom build, function, or routing configuration."
- **No drains (Hobby)** → "View logs via Dashboard or `vercel logs <url> --follow`. Upgrade to Pro for drain-based forwarding."
- **No drains (Pro+)** → "Configure drains for centralized observability. See `⤳ skill: observability` or run via REST API."
- **Errored drain** → "Test the endpoint: `POST /v1/drains/<id>/test`. Check URL reachability and format compatibility."
- **Missing analytics** → "Install `@vercel/analytics` and add `<Analytics />` to your root layout."
- **Missing speed insights** → "Install `@vercel/speed-insights` and add `<SpeedInsights />` to your root layout."
- **Missing drain secret** → "Set `DRAIN_SECRET` env var. Without it, drain endpoints can't verify payload authenticity."
