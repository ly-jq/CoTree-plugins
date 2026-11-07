---
name: "import.codex.posthog.posthog"
description: "Analyze product data and manage product tooling in PostHog. Use when the user wants product analytics or insights, HogQL/SQL queries, feature flags, experiments and A/B tests, error tracking, session replay, surveys, LLM analytics, dashboards, data warehouse, or PostHog documentation."
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

# PostHog

## Overview

This skill provides a structured workflow for working with PostHog from ChatGPT and Codex. It assumes the bundled PostHog app is connected so the PostHog tools are available for analytics, feature flags, experiments, error tracking, and more.

PostHog is an all-in-one product platform. The same project's data backs every surface below, so most questions can be answered by querying analytics or running HogQL, and most product changes (flags, experiments, surveys) can be made directly.

**Prefer live tools over pre-trained knowledge.** Your baked-in knowledge of PostHog's API, HogQL functions, and tool shapes may be outdated. The connected PostHog app advertises its own skills and tools at runtime and asks clients to *prioritize its skills over raw tools* — discover and follow those rather than guessing. When in doubt about syntax, limits, or product behavior, use the documentation-search tool.

## Prerequisites
- The PostHog app must be connected and accessible via OAuth.
- Confirm which PostHog organization and project the request targets before reading or writing.
- Self-hosted users connect against their own instance during the app's OAuth flow.

## Required Workflow

**Follow these steps in order. Do not skip steps.**

### Step 0: Connect the PostHog app (if not already configured)

If PostHog tools are unavailable, pause and ask the user to connect the PostHog app:

1. Enable the bundled PostHog app for this plugin or session.
2. Complete the PostHog OAuth flow if prompted, and select the correct organization/project.
3. Restart Codex or the current session if the tools still do not appear.

After the app is connected, finish your answer and tell the user to retry so they can continue with Step 1.

### Step 1
Clarify the user's goal and scope (e.g., a metric over a time range, a funnel, a new feature flag, an experiment readout, an error investigation). Confirm the target project, date range, event/property names, and any filters or cohorts.

### Step 2
Discover the available PostHog skills/tools the connected app exposes and pick the right one for the task. Resolve identifiers (project ID, flag key, experiment ID, insight/dashboard ID, error issue ID) before calling tools. For anything involving syntax, function names, or product behavior, search the docs first.

### Step 3
Execute PostHog tool calls in logical batches:
- **Read first** — list/get/query (insights, events, HogQL/SQL, error issues) to build context.
- **Write next** — create or update flags, experiments, surveys, dashboards, or insights with all required fields.
- For destructive or broad changes (e.g., toggling a flag in production, ending an experiment), state the impact and confirm before applying.

### Step 4
Summarize results with concrete numbers and links to the PostHog UI where available, call out caveats (sampling, person-on-events timing, date ranges), and propose next actions.

## Capability Map

Use this to route a request to the right PostHog surface, then discover the exact tool the app exposes for it.

| If the user wants to… | PostHog surface |
| --- | --- |
| Answer a metric/trend/funnel/retention/path question | Insights & queries (trends, funnels, retention, paths, lifecycle, stickiness) |
| Run arbitrary SQL over events/persons | HogQL / SQL execution |
| Create, toggle, or audit a feature flag | Feature flags |
| Launch or read out an A/B test | Experiments |
| Investigate a bug or exception | Error tracking (issues + events) |
| Watch how users actually behave | Session replay |
| Gather qualitative feedback (NPS, surveys) | Surveys |
| Track LLM cost/latency/usage | LLM analytics |
| Build or update a dashboard | Dashboards & insights |
| Connect or query external data | Data warehouse |
| Look up how something works in PostHog | Documentation search |

## HogQL & Querying Tips
- HogQL is PostHog's SQL dialect over the events/persons schema. Read the data schema before writing queries, and confirm event and property names exist.
- With person-on-events enabled, `person.properties.*` on the events table reflect the value at ingestion time, not the person's current value — the same person can show different values across events. Don't build workarounds for "query-time" person properties.
- Respect the project timezone when bucketing by day.
- Start narrow (small date range, limited rows), validate, then widen.

## Tips for Maximum Productivity
- Batch related reads before writes; confirm identifiers up front.
- Use natural-language asks where the app supports them ("signups by week this quarter").
- Reference prior insights/dashboards instead of rebuilding from scratch.
- For experiments and flags, double-check rollout conditions and targeting before enabling.

## Troubleshooting
- **Tools missing**: re-run the app connection/OAuth flow (Step 0); verify org/project access.
- **Empty or surprising results**: re-check event/property names, date range, filters, and timezone; confirm the events exist via a small query.
- **Permission errors**: confirm the connected account has access to the target project and the action (some changes require elevated roles).
- **Unsure about syntax or limits**: search the PostHog docs rather than guessing.
