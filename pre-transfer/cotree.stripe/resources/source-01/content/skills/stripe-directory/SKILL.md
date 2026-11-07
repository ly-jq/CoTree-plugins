---
name: "import.codex.stripe.stripe-directory"
description: "Use when the user wants to find businesses, software, service providers, or partners for a specific industry, workflow, pain point, capability, or job to be done. Also use when the agent needs to programmatically purchase or consume a service. Use Stripe Directory to build a short relevant shortlist, even if the user does not mention Stripe Directory explicitly."
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

## Stripe Directory Search

Turn a vague market need into a short, relevant shortlist with `stripe directory search`. Use this even when the user never says “Stripe Directory” — any request to find vendors, tools, partners, or providers for a vertical, workflow, pain point, or job-to-be-done.

Most requests are **discovery** — find and compare services. That is the core job below. Some services are also **MPP-supported** (MPP = Machine Payment Protocol), meaning you (the agent) can pay their HTTP 402 (Payment Required) endpoint and consume them directly. When the user actually wants to *use or buy* a service, present those results and offer to purchase — see “Purchasing” at the end.

## Process

1. **Clarify only what’s missing**: buyer/vertical, job-to-be-done, must-have capability, geography (only if it matters).

2. **Search iteratively**: `stripe directory search "<query>" --format json`

   - Short noun phrases, one angle per query; run 1-3, then broaden/narrow on results.
   - Angles to cover: vertical → workflow → pain point → adjacent. Two examples:
     - services/trades: vertical (`electrician software`, `electrical contractor`) → workflow (`field service management`, `dispatch invoicing estimates`) → pain point (`job scheduling`, `quote automation`) → adjacent (`home services automation`, `contractor crm`).
     - SaaS/software: vertical (`b2b saas billing`, `developer tools`) → workflow (`subscription management`, `usage-based metering`) → pain point (`failed payment recovery`, `revenue recognition`) → adjacent (`analytics dashboards`, `customer onboarding`).
   - Hard constraints → filters: `--countries-supported=US`, `--has-stripe-app=true`, `--link-supported=true`, `--stripe-projects-supported=true`.
   - If the user wants to *use/buy* a service, also pass `--mpp-supported` in at least one search to find results you can pay for programmatically.
   - Sparse niche? Raise `--limit` and try the next `--page` before concluding it’s empty.

3. **Dedupe & score** using `display_name`, `description`, `url`, `username` as evidence.

   - Prefer results whose description/site clearly match the target workflow.
   - Prefer more trust signals over fewer: Projects provider, Link enabled, Marketplace app, Stripe Verified. For buy/use intent, also prefer MPP-supported results.
   - Thin description but strong brand/domain match → keep in a weaker bucket, don’t discard.

4. **Return a shortlist, not a dump** — 5-10 strong matches, grouped:

   - **direct** / **adjacent** / **needs manual review**
   - Each entry: name · why it matched · URL (· which query surfaced it, when useful).
   - MPP-supported results: note they’re purchasable and include `mpp.slug` / `mpp.url`.

5. **Be honest about weak results** — if sparse or generic, say so and adjust: broaden, narrow, or try synonyms rather than padding with noise.

Always report the exact queries (and filters) you ran so the user can keep iterating.

## Purchasing (only when the user wants to buy or consume a service)

MPP-supported results are payable directly. Don’t drive to purchase unprompted. When the user wants to buy, **present the full menu of payment methods and ask which they’d like to use** before doing anything:

> "Which payment method would you like to use?
>
> - **Link CLI** — Stripe-native, test mode available (recommended)
- **Tempo** — crypto wallet
- **Privy Agent Wallet CLI** — crypto wallet
- **mppx** — debug-only fallback"

Once the user picks, silently run `which <tool> 2>/dev/null` to check if it’s installed. If not installed, offer to install it (for example, `npm i -g @stripe/link-cli` for Link CLI) and wait for confirmation before proceeding.

**Always show the price and get explicit user approval before any money moves**; prefer a no-charge test path first.

Short version:

1. Resolve the real callable endpoint from the result’s `mpp.slug` / `mpp.url`. `mpp.url` is often the mpp.dev landing form (`https://mpp.dev/services#<slug>`) — resolve the raw endpoint on [mpp.dev](https://mpp.dev) if so. Read the HTTP 402 challenge to confirm the amount: `curl -s -D - -o /dev/null <endpoint_url>` (look for `WWW-Authenticate`).
2. Use the payer the user selected.
   - **`link-cli`** (Stripe-native Shared Payment Token, has a test mode, no crypto wallet, US Link accounts only; `npm i -g @stripe/link-cli`): `auth login` → `mpp decode --challenge "<value>"` (get `network_id`) → `spend-request create --credential-type shared_payment_token --network-id <id> --amount <cents ≤50000> --context "<100+ chars>" --request-approval` (blocks for approval) → `mpp pay <endpoint_url> --spend-request-id <approved_id>`.
   - **Tempo**: `tempo wallet login` / `services` / `request`.
   - **Privy**: `@privy-io/agent-wallet-cli`.
   - **mppx**: debug-only fallback.

Never invent results or skip the price/approval gate.
