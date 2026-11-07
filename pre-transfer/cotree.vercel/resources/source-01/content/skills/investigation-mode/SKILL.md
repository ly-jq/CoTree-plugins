---
name: "import.codex.vercel.investigation-mode"
description: "Orchestrated debugging coordinator. Triggers on frustration signals (stuck, hung, broken, waiting) and systematically triages: runtime logs → workflow status → browser verify → deploy/env. Reports findings at every step."
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

# Investigation Mode — Orchestrated Debugging

When a user reports something stuck, hung, broken, or not responding, you are the **diagnostic coordinator**. Do not guess. Follow the triage order, report what you find at every step, and stop when you have a high-confidence root cause.

## Reporting Contract

Every investigation step MUST follow this pattern:

1. **Tell the user what you are checking** — "I'm checking the runtime logs for errors…"
2. **Share the evidence you found** — paste the relevant log line, status, error, or screenshot
3. **Explain the next step** — "The logs show a timeout on the DB call. I'll check the connection pool next."

Never silently move between steps. The user is already frustrated — silence makes it worse.

## Triage Order

Work through these in order. Stop as soon as you find the root cause.

### 1. Runtime Logs (check first — most issues leave traces here)

- **Dev server**: Check terminal output for errors, warnings, unhandled rejections
- **Vercel logs**: `vercel logs --follow` (production) or `vercel logs <deployment-url>`
- **Browser console**: Open DevTools → Console tab for client-side errors
- **If no logs exist**: This is the problem. Add logging before continuing (see "Add Logging" below)

Tell the user: "Checking runtime logs…" → share what you found → explain next step.

### 2. Workflow / Background Job Status

If the app uses workflows, queues, or cron jobs:

- Run `vercel workflow runs list` to check recent run statuses
- Look for runs stuck in `running` state — likely a missing `await` or unresolved promise
- Check individual run details: `vercel workflow runs get <run-id>`
- Look for failed steps, retry exhaustion, or timeout errors

Tell the user: "Checking workflow run status…" → share the run state → explain next step.

### 3. Browser Verification

Use agent-browser to visually verify what the user sees:

- Take a screenshot of the current page state
- Check the browser console for JavaScript errors
- Check the Network tab for failed requests (4xx/5xx, CORS errors, hanging requests)
- Look for hydration mismatches or React error boundaries

Tell the user: "Taking a browser screenshot to see the current state…" → share the screenshot → explain what you see.

### 4. Deploy / Environment Status

- `vercel inspect <deployment-url>` — check build output, function regions, environment
- `vercel ls` — verify the latest deployment succeeded
- Check for environment variable mismatches between local and production
- Verify the correct branch/commit is deployed

Tell the user: "Checking deployment status…" → share the deployment state → explain findings.

## Stop Condition

**Stop investigating when:**
- You find a high-confidence root cause (specific error, missing env var, failed step, etc.)
- Two consecutive triage steps produce no signal — report what you checked and that you found no evidence, then ask the user for more context

**Do not** keep cycling through steps hoping something appears. If logs are empty and workflows look fine, say so and ask the user what they expected to happen.

## Common Hang Causes

When logs point to code issues, check for these frequent culprits:

- **Missing `await`**: Async functions called without await cause silent failures
- **Infinite loops**: `while(true)` without break conditions, recursive calls without base cases
- **Unresolved promises**: `new Promise()` that never calls `resolve()` or `reject()`
- **Missing env vars**: `process.env.X` returning `undefined` causing silent auth/DB failures
- **Connection pool exhaustion**: Database connections not being released
- **Middleware chains**: A middleware that never calls `next()` or returns a response
- **Timeout misconfigs**: Function timeout too short for the operation (check `vercel.json` maxDuration)

## Add Logging (If Missing)

If the investigation reveals insufficient observability, **add structured logging immediately** — you cannot debug what you cannot see.

```typescript
// API routes — wrap handlers with try/catch + logging
export async function POST(request: Request) {
  console.log('[api/route] incoming request', { method: 'POST', url: request.url });
  try {
    const result = await doWork();
    console.log('[api/route] success', { resultId: result.id });
    return Response.json(result);
  } catch (error) {
    console.error('[api/route] failed', { error: String(error), stack: (error as Error).stack });
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

```typescript
// Workflow steps — log entry/exit of every step
const result = await step.run('process-data', async () => {
  console.log('[workflow:process-data] step started');
  const data = await fetchData();
  console.log('[workflow:process-data] step completed', { count: data.length });
  return data;
});
```

**Key principle**: Every async boundary, every external call, every step entry/exit should have a log line. When something hangs, the last log line tells you exactly where it stopped.

> **Cross-reference**: For comprehensive logging setup (OpenTelemetry, log drains, Sentry, Vercel Analytics), see the **observability** skill. For workflow-specific debugging, see the **workflow** skill.
