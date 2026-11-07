---
name: "import.codex.data-analytics.design-kpis"
description: "Design KPI frameworks, metric definitions, targets, guardrails, and measurement plans for product or business decisions. Use when success metrics, drivers, guardrails, targets, or the measurement approach need to be defined or improved."
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

# Design KPIs

Design KPI frameworks, set targets, and develop measurement plans that help teams make product or business decisions.

## When To Use Data Quality First

Use $analyze-data-quality first when the task is to reconcile existing metrics, dashboards, tables, owners, or sources of truth.

Return to this skill only when the user asks to define the metric going forward, redesign the KPI framework, choose guardrails, or set targets.

## Skill Configuration

### Source Discovery And Verification

Use the relevant semantic layer as a starting map, not a boundary.

1. **Explore all possible sources.** Search every connected or provided source that could contain task-relevant data or change the interpretation. Within each structured-data source, run fresh catalog or metadata discovery for relevant schemas, datasets, tables, views, models, and metrics. Known sources, tables, dashboards, and semantic mappings are starting points, not stopping points.
2. **Compare duplicates and conflicts.** When sources overlap or disagree, compare ownership, freshness, definition, grain, coverage, and directness. Use the best authoritative source, or combine complementary sources when needed. Note material conflicts, explain why the selected source or sources control the answer, and verify selected data through live reads before concluding.

### Source Access Guardrail

Before querying sources, building artifacts, or drawing conclusions, determine whether the answer requires a specific source of truth.

If a required source is unavailable, stop that path. Tell the user what source is needed, ask them to make it available or provide a reviewed fallback, and do not treat weaker substitutes as equivalent.

If the missing source is only optional enrichment, continue with the strongest available evidence and label the gap when it materially affects the answer.

Clarify with the user when a missing input would materially change the analytical frame or recommendation. Otherwise make a reasonable assumption, state it, and proceed.

## Workflow

### 1. Clarify The Decision And Operating Context

Understand the decision the metrics need to support, the context in which they will be reviewed, and who will act on the result. Ask the user to clarify the goal, operating cadence, or measurement constraints when missing or ambiguous input would change the recommendation.

### 2. Gather Evidence Before Recommending Metrics

When the prompt does not already provide enough context to know what success means, gather that context before recommending metrics or targets. Use $gather-business-context to understand the goal, current state, audience, constraints, risks, existing definitions, prior decisions, and any baseline or target context that should shape the metric system.

For KPI design, use that context to clarify what success is meant to mean, how related metrics have been defined before, and which constraints or risks should affect the recommended KPIs, drivers, guardrails, or measurement plan.

### 3. Generate A Wider Candidate Set

Create candidate outcome, driver, and guardrail metrics before narrowing.
Each candidate should have a clear definition and a plausible link to the decision. Use the example metric shapes below as inspiration when helpful, not as a required template.

### 4. Compare And Select Metrics

Compare candidate metrics by whether they:

- reflect the goal: the metric should represent the intended outcome. When using a proxy, explain why it should reflect real progress and where it could mislead.
- inform a real decision: movement should change what the team does, prioritizes, or investigates.
- show useful signal at the decision cadence: a metric can be conceptually good but too slow-moving or noisy for the decision it supports. For example, annual retention may be the right outcome, but it may not help a weekly launch review unless paired with earlier indicators.
- can be influenced by the team: the team should have plausible levers, or the metric should be paired with drivers it can affect.
- can be measured operationally: the team should be able to instrument, calculate, and track the metric consistently without one-off manual work.
- are hard to improve in a misleading way: improving the metric should not obviously hide harm to quality, trust, retention, cost, or another important outcome.

Use lightweight scoring only when it helps explain tradeoffs. Recommend `1-3` primary KPIs, `1-2` driver metrics for each KPI when they improve diagnosis, and `1-2` guardrails when tradeoffs are likely. Do not recommend extra metrics unless they materially improve decision-making.

For each recommended metric, include enough detail for the team to use it: what it measures, why it matters, how it is calculated, where it comes from, its main pros and cons against the selection criteria above, and what caveats or guardrails matter.

### 5. Set Targets When Needed

Treat target setting as a separate judgment from metric selection. First decide what should be measured; then set targets when the user asks or when the recommendation needs a threshold to be useful.

Use the target-setting approach that best fits the evidence:

- Top-down: start from benchmarks, historical performance, comparable products, competitor or market context, or a reasoned view of what good would need to look like for the decision.
- Bottom-up: start from what the team can realistically do, such as what is shipping, how adoption is expected to build, or which operating levers should move the metric.

Use data to set or evaluate targets. Once the target-setting approach is clear, identify what data it requires, such as provided inputs, internal performance data, external benchmarks or market data, and results from similar past work.

Compare aspirational targets with what the team can realistically influence through planned work, available audience, expected adoption, and historical movement. A good target should be meaningful for the decision and plausible enough to guide action. Explain the target anchor, key assumptions, and confidence. If the strongest target-setting method requires missing inputs, share the methodology and ask whether the user can provide or identify the relevant data. If there is still enough evidence for a directional target, present it as a provisional range; otherwise recommend the measurement needed before setting a firm target.

### 6. Deliver The Recommendation

Keep the final recommendation concise and decision-oriented, and deliver it inline by default. Do not load `$build-report` merely because the KPI framework uses evidence, compares candidates, or contains several metrics. Use `$visualize-data` and `$build-report` when a data visual would materially improve the answer, such as by showing how a proposed target compares with historical performance or benchmarks, or by clarifying tradeoffs or candidate scoring. Honor an explicitly requested report, dashboard, notebook, spreadsheet, native document, or slide deck as the primary artifact. The recommendation should include:

1. initiative summary
2. recommended metric candidates, with definition and rationale
3. target recommendation, if included, with anchor, assumptions, and methodology
4. evidence reviewed
5. assumptions and missing context
6. risks and guardrails
7. open questions

## Example Metric Shapes

Different contexts need different metric shapes. Use these as examples, not a template:

- Product launch or adoption: pair an outcome metric for adoption or value realization with drivers for activation, engagement, repeat use, or time to value, plus guardrails for experience quality.
- Growth work: choose the business outcome the team is trying to improve, such as activation, retention, or monetization; add drivers that explain how growth is expected to happen and guardrails for quality.
- Funnel work: choose the progression or completion outcome that represents success; add drivers around where people advance or drop off and guardrails for downstream quality.
- Operating review: focus on health, pacing, and action-oriented metrics that show whether the business is on track and where attention is needed.
- Experiment or intervention: use one primary success metric tied to the decision, diagnostics that explain movement, and guardrails for unintended effects.
- Data, model, or analytics initiative: connect technical performance to the decision or workflow it improves, with adoption, reliability, cost, or fairness guardrails when relevant.
- Platform, reliability, or operations work: measure service health, throughput, quality, cost efficiency, and customer impact in terms the owning team can act on.
