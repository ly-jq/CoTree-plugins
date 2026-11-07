---
name: "import.codex.vercel.agent-browser-verify"
description: "Automated browser verification for dev servers. Triggers when a dev server starts to run a visual gut-check with agent-browser — verifies the page loads, checks for console errors, validates key UI elements, and reports pass/fail before continuing."
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

# Dev Server Verification with agent-browser

**You MUST verify the dev server with agent-browser after starting it.** Do not assume the page works just because the dev server process started. Many issues (blank pages, hydration errors, missing env vars, broken imports) are only visible in the browser. Run this verification before continuing with any other work:

## Quick Verification Flow

```bash
# 1. Open the dev server
agent-browser open http://localhost:3000
agent-browser wait --load networkidle

# 2. Screenshot for visual check
agent-browser screenshot --annotate

# 3. Check for errors
agent-browser eval 'JSON.stringify(window.__consoleErrors || [])'

# 4. Snapshot interactive elements
agent-browser snapshot -i
```

## Verification Checklist

Run each check and report results:

1. **Page loads** — `agent-browser open` succeeds without timeout
2. **No blank page** — snapshot shows meaningful content (not empty body)
3. **No error overlay** — no Next.js/Vite error overlay detected
4. **Console errors** — evaluate `document.querySelectorAll('[data-nextjs-dialog]')` for error modals
5. **Key elements render** — snapshot `-i` shows expected interactive elements
6. **Navigation works** — if multiple routes exist, verify at least the home route

## Error Detection

```bash
# Check for framework error overlays
agent-browser eval 'document.querySelector("[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay") ? "ERROR_OVERLAY" : "OK"'

# Check page isn't blank
agent-browser eval 'document.body.innerText.trim().length > 0 ? "HAS_CONTENT" : "BLANK"'
```

## On Failure

If verification fails:

1. Screenshot the error state: `agent-browser screenshot error-state.png`
2. Capture the error overlay text or console output
3. Close the browser: `agent-browser close`
4. Fix the issue in code
5. Re-run verification (max 2 retry cycles to avoid infinite loops)

## Diagnosing a Hanging or Stuck Page

When the page appears stuck (spinner, blank content after load, frozen UI), the browser is only half the story. Correlate what you see in the browser with server-side evidence:

### 1. Capture Browser Evidence

```bash
# Screenshot the stuck state
agent-browser screenshot stuck-state.png

# Check for pending network requests (XHR/fetch that never resolved)
agent-browser eval 'JSON.stringify(performance.getEntriesByType("resource").filter(r => r.duration === 0).map(r => r.name))'

# Check console for errors or warnings
agent-browser eval 'JSON.stringify(window.__consoleErrors || [])'

# Look for fetch calls to workflow/API routes that are pending
agent-browser eval 'document.querySelector("[data-nextjs-dialog]") ? "ERROR_OVERLAY" : "OK"'
```

### 2. Check Server Logs

After capturing browser state, immediately check the backend:

```bash
# Stream Vercel runtime logs for the deployment
vercel logs --follow

# If using Workflow DevKit, check run status
npx workflow inspect runs
npx workflow inspect run <run_id>

# Check workflow health
npx workflow health
```

### 3. Correlate Browser + Server

| Browser Shows | Server Shows | Likely Issue |
|--------------|-------------|-------------|
| Spinner / loading forever | No recent function invocations | API route not being called — check fetch URL in client code |
| Spinner / loading forever | Function started but no step logs | Workflow step is stuck — add `console.log` at step entry/exit |
| Blank page, no errors | Build succeeded, no runtime errors | Hydration issue or missing data — check SSR vs client rendering |
| Network request pending | 504 Gateway Timeout in logs | Function timeout — increase `maxDuration` or optimize step |
| Console: "Failed to fetch" | OIDC/credential error in logs | Missing `vercel env pull` — run `vercel link && vercel env pull` |
| Error overlay visible | Stack trace in runtime logs | Read the server error — it usually has more detail than the client |

### 4. Fix and Re-verify

After fixing the issue:

```bash
# Re-open and verify the fix
agent-browser open http://localhost:3000
agent-browser wait --load networkidle
agent-browser screenshot after-fix.png
agent-browser eval 'document.body.innerText.trim().length > 0 ? "HAS_CONTENT" : "BLANK"'
agent-browser close
```

## On Success

```bash
agent-browser close
```

Report: "Dev server verified — page loads, no errors detected, key UI elements render correctly."

## Suggest Verification After Implementation

When you finish building or implementing a feature (wrote code, created routes, set up a project), briefly let the user know they can ask you to verify everything works with a browser check. One sentence is enough. Don't force it if only a small fix or question was involved.
