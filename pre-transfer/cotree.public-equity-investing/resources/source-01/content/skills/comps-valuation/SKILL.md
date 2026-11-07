---
name: "import.codex.public-equity-investing.comps-valuation"
description: "Produce Public Equity Investing comparable-company valuation in report or workbook mode. Use for peer selection, multiple analysis, valuation read-throughs, implied prices, comps dashboards, Excel or Sheets comps, refreshable peer tables, model updates, and comps workbook QA. Do not use for DCF-only, credit-security, or generic market commentary requests."
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

# Comps Valuation

## Skill Configuration

### Common Skill Instructions

MANDATORY: Before searching connectors, retrieving evidence, or drafting output, read and apply the shared runtime contract in `../public-equity-investing/SKILL.md## Cross-Skill Runtime Contract`. Then check the router skill map and `../../shared/plugin-routing-playbook.md` for adjacent skills that should be sequenced with this workflow. Do not run user-context setup or inspection during ordinary workflow work; route only explicit saved-context, source-setup, onboarding, or automation-setup requests to `../user-context/SKILL.md`.

### Source Resolution

Load `../../shared/workflow-source-resolution.md`. Resolve only the categories needed for this workflow: `company_filings_ir`, `market_data_estimates`, and `portfolio_models_trackers`. Use the shared runtime contract to map each attempted category to an available app, connector, file, export, or user-provided input.

## Relevant Dependency Categories

These are the source categories most likely to matter for this workflow. Use the router contract to resolve only the categories the task actually needs, prefer user-named sources first, and state any material source limitation.

- `Market Data & Estimates`
- `Company Filings & IR`
- `Portfolio Models & Trackers`

## Deliverable Intake And Judgment Standard

Before source gathering or analysis for a new substantive hero deliverable, load `../../shared/deliverable-intake-policy.md` and use its adaptive `request_user_input` preflight for materially unresolved format, depth, audience/use, or focus choices. Reuse resolved preferences downstream. For substantive investment judgment, apply `../../shared/final-deliverable-framework.md`.

## Equity Valuation PM Standard

Load `../../shared/equity-valuation-pm-standard.md` and `../../shared/pm-judgment-heuristics.md` for substantial model, valuation, scenario, model-update, or audit work.

The output must state what the current stock price implies, the variant estimate path, whether upside is driven by fundamentals, multiple expansion, mix, capital return, sentiment, or event probability, what breaks first in downside, the valuation posture and next underwriting step, and what evidence is missing. State what changes target, rating, sizing, hedge, trim, exit, or watchlist status only when the user requests portfolio action or provides the relevant holding, benchmark, mandate, and liquidity context.

Keep equity valuation as the center of gravity. Debt is allowed only as an input to common-equity value through net debt, cost of debt, leverage, liquidity, refinancing risk, or downside equity impairment. Use Credit Markets for bond comps, loan comps, CDS, spread/yield relative value, covenant-package analysis, debt-security valuation, recovery waterfall, restructuring valuation, creditworthiness, private-credit or public-credit instrument underwriting, or distressed claim valuation.

## Mode Selection

Select the mode from the request and available context; do not ask merely because both modes exist.

- `report` mode: peer framing, multiple interpretation, implied valuation or price read-through, peer-set review, PM-facing comps argument, or a standalone HTML report or explicitly requested standardized dashboard without an editable model.
- `workbook` mode: Excel, Sheets, CSV/XLSX export, refreshable data, formulas, EV bridges, peer-table templates, workbook/model updates, structured sensitivities, or auditing an existing comps workbook.
- If an existing workbook is supplied and the requested output changes or validates it, choose `workbook`.
- Ask one focused question only when either mode is equally plausible and choosing incorrectly would materially change the user's intended artifact or decision workflow. Prefer proceeding with a stated inferred default when reliance is not impaired.

## Common Workflow

1. Establish security, issuer or target, audience mode, valuation date, fiscal basis, currency, and thesis question.
2. Source and label price, shares, EV bridge, reported/adjusted/consensus denominators, forward estimates, and peer rationale.
3. Build Core, Secondary, Excluded, and optional Watchlist peer roles.
4. Test metric comparability, stale data, outliers, valuation range, premium/discount logic, and PM action implications.
5. State what is priced in, what would change the thesis, and what evidence is missing.
6. Render or materialize the selected mode.

## Report Mode

Read `references/peer-selection.md`, `references/module-rules.md`, `references/source-and-staleness-rules.md`, `references/valuation-readthrough.md`, `references/output-templates.md`, and `references/p0-integrations.md` only when relevant. For a substantial reusable or HTML comps report, produce a polished standalone HTML comps report following `../../shared/html-artifact-standard.md`; let the valuation question and supported evidence determine the hierarchy. Use `dashboard-builder` only when the user explicitly asks for a standardized dashboard, reusable dashboard template, PM cockpit, or structured payload-driven render; in that case, load `references/DASHBOARD_PACK.md` and hand over a `public_equity_investing_dashboard.v1` payload.

For a standalone HTML comps report, keep the first read compact:

1. Valuation read: whether the premium or discount is supported and the key unresolved proof point.
2. Four or five high-signal metrics: current price, primary trading multiple, premium or discount to core peers, implied value range only when supportable, and the key operating proof point.
3. Peer-set rationale: Core, Secondary, and Excluded peers with concise inclusion or exclusion reasons.
4. Core trading-comps table.
5. Premium or discount bridge grounded in growth, margin, business-model fit, and data quality.
6. Valuation posture, material evidence gaps, and concise source ledger.

Express a valuation posture such as `premium partly supported`, `screening-only`, or `not sufficiently supported for a new-money decision`. Do not issue add, trim, hedge, sizing, or exit instructions unless the user requests portfolio action or supplies relevant holding and mandate context.

When HTML is delivered, keep citations traceable but readable: do not fragment tickers, prices, multiples, percentages, dates, numeric ranges, metric names, or peer labels into separately linked tokens. Visually inspect local HTML via local headless-browser screenshots, not the in-app Browser plugin, and iterate on hierarchy, density, clipping, citation rendering, and whitespace before delivery.

## Workbook Mode

Read `references/workbook/comps-framework.md`, `references/workbook/data-sourcing-and-connectors.md`, `references/workbook/model-workbook-spec.md`, `references/workbook/qa-and-pressure-testing.md`, `references/workbook/review-memo-template.md`, and `references/workbook/dashboard-map.md` only when relevant. Use `scripts/create_comps_template.py`, `scripts/materialize_screening_comps.py`, and `scripts/audit_comps_workbook.py` as appropriate. Preserve an existing workbook before rebuilding it.

## When To Invoke Support

Load `../../shared/support-layer-routing-contract.md` when source/data/QC support is needed. Use `financials-normalizer` for messy issuer or peer inputs, `model-audit-tieout` for standalone workbook audit, and `deck-report-qc` before circulation. Route credit-first conclusions to Credit Markets.
