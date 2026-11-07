---
name: "import.codex.public-equity-investing.initiating-coverage"
description: "Use when building public-equity-investing initiating coverage reports. Do not use for trade pitches, memos, earnings notes, models, or tearsheets."
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

# Initiating Coverage

## Skill Configuration

### Common Skill Instructions

MANDATORY: Before searching connectors, retrieving evidence, or drafting output, read and apply the shared runtime contract in `../public-equity-investing/SKILL.md## Cross-Skill Runtime Contract`. Then check the router skill map and `../../shared/plugin-routing-playbook.md` for adjacent skills that should be sequenced with this workflow. Do not run user-context setup or inspection during ordinary workflow work; route only explicit saved-context, source-setup, onboarding, or automation-setup requests to `../user-context/SKILL.md`.

### Source Resolution

Load `../../shared/workflow-source-resolution.md`. Resolve only the categories needed for this workflow: `company_filings_ir`, `earnings_transcripts_presentations`, `internal_research`, `portfolio_models_trackers`, and `market_data_estimates`. Use the shared runtime contract to map each attempted category to an available app, connector, file, export, or user-provided input.

## Relevant Dependency Categories

These are the source categories most likely to matter for this workflow. Use the router contract to resolve only the categories the task actually needs, prefer user-named sources first, and state any material source limitation.

- `Market Data & Estimates`
- `Company Filings & IR`
- `Earnings Transcripts & Events`
- `Portfolio Models & Trackers`
- `Internal Research`

## Internal Support

When this workflow needs rendering, evidence/data preparation, style, or sector context, route support through the visible `public-equity-investing` router and its bundled internal playbooks. Route workbook or model QA through the visible `model-audit-tieout` workflow.

## Deliverable Intake

Before source gathering or analysis for a new substantive hero deliverable, load `../../shared/deliverable-intake-policy.md` and use its adaptive `request_user_input` preflight for materially unresolved format, depth, audience/use, or focus choices. Reuse resolved preferences in downstream steps; when acting only as input to an owning workflow, do not re-prompt.

## Purpose

Build a full public-equity-investing initiation report that is thesis-led, model-backed, valuation-aware, source-disciplined, and explicit about what is proven versus assumed.

This skill owns initiation-style research architecture. It can produce a report outline, full initiation report, structured internal handoff, source request list, model/valuation workplan, or deck-ready storyboard. For a substantial reusable initiation package, default to a polished standalone HTML initiation report following `../../shared/html-artifact-standard.md`, unless the user requests another surface, a quick/no-file answer, or a model/workbook-first deliverable. Use `dashboard-builder` only when the user explicitly asks for a standardized dashboard, reusable validated template, or structured payload-driven render. Structured JSON is support/audit material, not the final user-facing artifact. This skill does not own live trade expression, generic memo writing, earnings notes, model-only work, or one-page issuer profiles.

## Do Not Use

- Live trade pitch, pair trade, add/trim/exit rules, short-cover logic, or variant-perception trade expression: use `long-short-pitch`.
- IC memo, investment memo, committee note, client memo, PM update, or memo rewrite: use `memo-builder`.
- Pre-earnings or post-earnings note: use `earnings-preview` or `earnings-deep-dive`.
- Model refresh, DCF, 3-statement model, comps workbook, or sensitivity-only task: use the relevant model or scenario skill.
- One-page public issuer profile: use `company-tearsheet`.

## Non-Negotiables

- Preserve user files and models. Create additive outputs or marked-up recommendations unless the user explicitly asks for edits.
- Prioritize user-provided material, connected/approved sources, primary filings/releases/transcripts, trusted providers, then clearly labeled assumptions.
- Include report date, data cut-off, evidence confidence, underwriting status, unresolved conflicts, and major assumptions. Keep evidence confidence distinct from underwriting readiness; do not describe investability as source confidence.
- Label facts, company claims, street estimates, model-derived values, PM judgment, assumptions, mixed claims, and missing sources.
- Do not make personalized investment advice or compliance/legal/tax conclusions. Treat rating/target price language as research output requiring human review.
- If context is thin, produce a skeleton, research agenda, model architecture, source request list, and thesis hypotheses rather than fabricating facts.

## Workflow

1. **Classify the mode.** Choose `sell_side_initiation`, `buy_side_deep_dive`, `long_only_initiation`, `hedge_fund_initiation`, `credit_adjacent_initiation`, `sector_initiation`, `model_first_initiation`, or `report_refresh`. Load `references/report-modes.md` only when mode-specific requirements matter.
2. **Assess context depth.** For no-context prompts, ask one targeted clarification only if company/security or output mode is unclear. For partial/full context, preserve supplied facts, identify missing inputs, and build a source register and assumption register.
3. **Complete market data and valuation inputs.** Before finalizing a substantive initiation, retrieve current price with an as-of timestamp, market capitalization, diluted share-count inputs, enterprise-value inputs, and available consensus or estimate context from approved accessible sources. Load `references/source-and-evidence.md` for required treatment. If an input is unavailable, label it missing and explain what valuation conclusion it prevents; do not omit available market context simply because the report remains preliminary.
4. **Coordinate with local skills.** Use `financial-source-of-truth` for evidence posture, `company-tearsheet` for issuer baseline, `financials-normalizer` or `excel-data-cleaner` for source prep, model skills for valuation work, `scenario-sensitivity-generator` for cases, and `thesis-tracker` after initiation.
5. **Frame the senior thesis.** Answer what the market is missing, what must be true, what falsifies the thesis, which KPI/catalyst matters, why the valuation method fits, and what would change the view.
6. **Apply the financed-growth gate when material.** When capital intensity, debt, lease liabilities, dilution, customer-funded buildout, or financing risk is central to the equity debate, require a pro forma fully diluted capitalization / enterprise-value bridge and after-financing return evidence before a positive ownership conclusion or target price. Use normalized FCF, ROIC or return on invested capacity, capacity-cohort cash returns, leverage, and interest burden as applicable. Treat equity-value-to-revenue or other revenue multiples as preliminary market context only when material financed obligations are not yet incorporated.
7. **Build the report.** Default structure: cover/view, executive summary, key debates, company overview, industry position, model summary, valuation, catalysts, risks/disconfirmers, scenarios, and source appendix. In standalone HTML, make the first read a single research-posture block, the central debate, the valuation or capital-return gate, the essential evidence, and what remains missing. Do not repeat the same conclusion in a hero, metric tile, PM-answer block, and decision box.
8. **Apply sector context.** Load `references/sector-overlays.md` for report-mode framing and use `sector-context-overlay` only when sector nuance affects KPIs, valuation, or red flags.
9. **Run QA.** Confirm the report has a real view, falsifiable thesis, sourced metrics, visible data cut-off, source conflicts, appropriate sector metrics, and non-boilerplate risks. For a local HTML file, inspect the opening viewport and important downstream sections with local headless-browser screenshots rather than the in-app Browser plugin; iterate on hierarchy, clipping, citation noise, and readability.

## Sub-agent decomposition

For complex medium/large requests, use sub-agents where available; otherwise emulate the split as named workstreams. Suggested lanes: evidence gathering, company and industry analysis, model/valuation, thesis and risk, and report QA. Keep this skill as the lead: reconcile conflicts, source labels, assumptions, open items, final QA, and the user-facing answer.


## Artifact Contract

Default initiation output should include:

- MD / PM-level answer with recommendation or research posture.
- Investment thesis with 3-5 evidence-linked claims.
- Key debates and variant perception.
- Company and industry overview.
- Model and forecast driver table.
- Valuation / target price methodology, sensitivity, and backup method.
- Current market data and valuation-input status, including as-of time and explicit missing inputs.
- Earnings quality and EPS basis when P/E or EPS-driven valuation is used.
- Catalysts, risks, disconfirming evidence, and monitoring items.
- Source register, conflicts, assumptions, and open evidence requests.

For a long-only initiation where valuation, the capital stack, or after-financing cash economics remain materially unproven, label the output a `Preliminary initiation underwrite` or `Watchlist initiation`. State the evidence and modeling required before ownership rather than implying a completed positive initiation or supplying an unsupported target price. This posture does not excuse omitting current market data that is obtainable from approved accessible sources.

For standalone HTML artifacts, keep citations traceable but readable: do not fragment tickers, fiscal periods, dates, prices, ranges, multiples, or metric names with inline source links. Cite a complete figure or statement, or use a compact nearby source note.

Structured handoffs should follow `references/output-schema.md` and can be validated with:

```bash
python scripts/validate_initiation_json.py path/to/initiation.json
```

For publication-looking reports, run `python scripts/validate_initiation_json.py path/to/initiation.json --publication-ready` so unresolved placeholders, weak source metadata, and unknown source IDs hard-fail. Use the validated structure to render or support the human-readable report; do not make raw JSON the lead deliverable unless explicitly requested.

Use `scripts/calculate_price_target.py` only when valuation assumptions are available in JSON; the helper calculates math, not analyst judgment.

If the user explicitly asks for a standardized dashboard, use `references/DASHBOARD_PACK.md`. `initiating-coverage` owns the thesis, report architecture, and valuation judgment; `dashboard-builder` owns the shell/rendering/QA. Build a `public_equity_investing_dashboard.v1` payload as an internal renderer input, and keep JSON/Markdown/CSV support files behind the HTML dashboard unless explicitly requested.

## Reference Map

- `references/report-modes.md`: mode-specific output standards.
- `references/report-architecture.md`: full report structures and section variants.
- `references/thesis-framework.md`: senior thesis, debate, and falsification prompts.
- `references/valuation-and-modeling.md`: valuation methods, assumptions, and price-target logic.
- `references/source-and-evidence.md`: source hierarchy, labels, stale data, and evidence requests.
- `references/sector-overlays.md`: sector KPI, valuation, and red-flag overlays.
- `references/pm-md-standards.md`: quality bar for PM/MD-level initiations.
- `references/output-templates.md`: reusable report sections.
- `references/quality-checklist.md`: final QA.
- `references/integration-guide.md`: local handoff patterns.

## Final Note

End each initiation with evidence confidence, underwriting status, data cut-off, unresolved conflicts, major assumptions, and the recommended next handoff such as `thesis-tracker`, `equity-model-update`, `earnings-preview`, or `long-short-pitch`.

## Public Equity PM Judgment Layer

For substantial initiation work, load `shared/pm-judgment-heuristics.md` before finalizing. Audience modes: `long_only_pm`, `long_short_hf`, `sell_side_research`, `etf_index_diligence`, `public_equity_diligence`.

Required PM judgment:
- State the decision hinge, variant perception, what is priced in, valuation basis, downside mechanism, ownership/positioning, benchmark relevance, and falsifiers.
- Add `etf_index_constituent_diligence` when the user is assessing an issuer as an ETF/index constituent, index exposure, passive-flow risk, or benchmark-relative holding.
- Include market cap, float/liquidity, ownership, short interest, factor exposure, index membership, and capital allocation when source-backed or clearly missing.
- Fund/product diligence is out of scope; public issuer or constituent diligence is in scope.
