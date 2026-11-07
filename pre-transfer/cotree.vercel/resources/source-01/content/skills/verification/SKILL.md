---
name: "import.codex.vercel.verification"
description: "Full-story verification — infers what the user is building, then verifies the complete flow end-to-end: browser → API → data → response. Triggers on dev server start and 'why isn't this working' signals."
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

# Full-Story Verification

You are a verification orchestrator. Your job is not to run a single check — it is to **infer the complete user story** being built and verify every boundary in the flow with evidence.

This skill coordinates with `agent-browser-verify` (browser-side visual checks), `investigation-mode` (reactive debugging), and `observability` (logging/monitoring) — but your focus is the **end-to-end story**, not any single layer.

## When This Triggers

- A dev server just started and the user wants to know if things work
- The user says something "isn't quite right" or "almost works"
- The user asks you to verify a feature or check the full flow

## Step 1 — Infer the User Story

Before checking anything, determine **what is being built**:

1. Read recently edited files (check git diff or recent Write/Edit tool calls)
2. Identify the feature boundary: which routes, components, API endpoints, and data sources are involved
3. Scan `package.json` scripts, route structure (`app/` or `pages/`), and environment files (`.env*`)
4. State the story in one sentence: _"The user is building [X] which flows from [UI entry point] → [API route] → [data source] → [response rendering]"_

**Do not skip this step.** Every subsequent check must be anchored to the inferred story.

## Step 2 — Establish Evidence Baseline

Gather the current state across all layers:

| Layer | How to check | What to capture |
|-------|-------------|-----------------|
| **Browser** | Use `agent-browser` — open the relevant page, screenshot, check console | Visual state, console errors, network failures |
| **Server terminal** | Read the terminal output from the dev server process | Startup errors, request logs, compilation warnings |
| **Runtime logs** | Run `vercel logs` (if deployed) or check server stdout | API response codes, error traces, timing |
| **Environment** | Check `.env.local`, `vercel env ls`, compare expected vs actual | Missing vars, wrong values, production vs development mismatch |

Report what you find at each layer before proceeding. Use the investigation-mode reporting contract:

> **Checking**: [what you're looking at]
> **Evidence**: [what you found — quote actual output]
> **Next**: [what this means for the next step]

## Step 3 — Walk the Data Flow

Trace the feature's data path from trigger to completion:

1. **UI trigger** — What user action initiates the flow? (button click, page load, form submit)
2. **Client → Server** — What request is made? Check the fetch/action call, verify the URL, method, and payload match the API route
3. **API route handler** — Read the route file. Does it handle the method? Does it validate input? Does it call the right service/database?
4. **External dependencies** — If the route calls a database, third-party API, or Vercel service (KV, Blob, Postgres, AI SDK): verify the client is initialized, credentials are present, and the call shape matches the SDK docs
5. **Response → UI** — Does the response format match what the client expects? Is error handling present on both sides?

At each boundary, check for these common breaks:
- **Missing `await`** on async operations
- **Wrong HTTP method** (GET handler but POST fetch)
- **Env var absent** in runtime but present in `.env.local`
- **Import mismatch** (server module imported in client component or vice versa)
- **Type mismatch** between API response and client expectation
- **Missing error boundary** — unhandled rejection crashes the page silently

## Step 4 — Report With Evidence

Summarize findings in a structured report:

```
## Verification Report: [Feature Name]

**Story**: [one-sentence description of the user story]

### Flow Status
| Boundary | Status | Evidence |
|----------|--------|----------|
| UI renders | ✅/❌ | [screenshot or console output] |
| Client → API | ✅/❌ | [request/response or error] |
| API → Data | ✅/❌ | [log output or error trace] |
| Data → Response | ✅/❌ | [response shape or error] |
| Response → UI | ✅/❌ | [rendered output or error] |

### Issues Found
1. [Issue]: [evidence] → [fix]

### Verified Working
- [What was confirmed working with evidence]
```

## Stop Conditions

**Stop verifying when**:
- All boundaries in the flow are confirmed working with evidence — report success
- You find the **first broken boundary** — report it with evidence and a specific fix, do not continue past the break
- Two consecutive layers return no useful signal (e.g., no logs, no errors, no output) — flag the observability gap and recommend adding logging before continuing

**Do not**:
- Run the same check more than twice
- Continue past a confirmed broken boundary
- Verify unrelated features — stay on the inferred story
- Spend time on cosmetic issues (styling, spacing) unless the user specifically asked

## Suggest Verification After Implementation

When you finish building or implementing a feature (wrote code, created routes, set up a project), briefly let the user know they can ask you to verify everything works — e.g. browser verification or end-to-end flow check. One sentence is enough. Don't force it if only a small fix or question was involved.

## Coordination With Other Skills

- **`agent-browser-verify`** — Handles browser screenshots and console checks. Defer to it for visual verification. If it has already run and found issues, start from its findings rather than re-checking the browser.
- **`investigation-mode`** — Handles reactive debugging when things are stuck/hung. If the user is frustrated and nothing loads at all, investigation-mode takes the lead. Verification takes over when things _partially_ work.
- **`observability`** — Handles logging/monitoring setup. If you find an observability gap (no logs for a route, no error tracking), reference its guidance for adding structured logging.
