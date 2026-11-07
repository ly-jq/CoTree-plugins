---
name: "import.codex.data-analytics.gather-business-context"
description: "Gather business context from connected or provided sources so downstream analysis starts with the right framing. Use when an analytical question depends on missing context, such as what a metric means, what changed recently, or which sources should be checked. If the same prompt asks for diagnosis, recommendation, or a deliverable, gather context first and continue to the focused skill."
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

## Boundary

Use this skill to gather framing context, not to complete the downstream analysis.

If the same request also asks for a diagnosis, recommendation, dashboard, report, or other analytical deliverable, return only the context needed for that next step and continue with the appropriate focused skill, such as $metric-diagnostics, $product-business-analysis, $build-dashboard, or $build-report.

# Gather Business Context

Use this skill to collect the business context needed to understand an analytical question before doing deeper work. Focus on what the topic is, why it matters, what changed or is being decided, who or what source is closest to the work, and which definitions or artifacts should frame the analysis. This is a retrieval and extraction skill: gather enough context to set up the next step, not a final report, root-cause analysis, or broad background scan. Skip it when the prompt already provides the needed context or the task is fully self-contained.

## Workflow

### 1. Identify The Retrieval Target

Establish the analytical topic that needs context and why it matters for the next step. Capture the boundary needed to search and interpret sources, such as the relevant product area, audience, time period, or decision. If the timeframe is missing, use the narrowest reasonable window implied by the task and label it as an assumption.

### 2. Build Search Anchors

Search with concrete identifiers rather than broad topic guesses. Start with the names the user provided or the sources surfaced, then expand with adjacent terms that help recall, such as aliases, owners, teams, dates, source names, related entities, or entities found in earlier results.

Start broad enough to avoid missing relevant context. If too much comes back and a quick scan suggests the results are mostly unrelated, combine anchors to narrow retrieval, for example a metric plus a dashboard name, a feature plus a launch window, or a customer plus the relevant workflow. If a likely source comes back thin, revise the anchors before treating the source as missing.

### 3. Search From Discovery Points Toward Authoritative Artifacts

1. **Explore all possible sources.** Search every enabled or provided source family that could contain useful context or task-relevant data. Within each structured-data source, run fresh catalog or metadata discovery for relevant schemas, datasets, tables, views, models, and metrics. User-named sources, known tables, dashboards, and semantic-layer anchors are starting points, not stopping points.
2. **Compare duplicates and conflicts.** When sources overlap or disagree, compare authority, freshness, definition, scope, and directness. Prefer artifacts closest to what was decided, defined, implemented, or measured; follow linked evidence when useful. Note material conflicts and explain which source or combination should guide downstream analysis.

### 4. Extract Only Decision-Shaping Context

Treat business context as a fixed extraction target, not an open-ended summary. Capture the facts that will shape the downstream analysis: the topic's business meaning, why it matters now, how it is defined or measured, where to verify it, what recently changed, and what uncertainty should travel with the analysis. Examples can include a metric definition, current rollout state, dashboard link, owner note, source conflict, or stated next step.

Keep the context note focused on details that help frame the next analysis. Skip broad background, adjacent history, or long source excerpts unless they add useful context.

### 5. Keep Source Notes Compact And Attributable

For each useful source, record enough attribution for the downstream work to be checked later: when the source applies, what kind of source it is, what factual context it established, and any important caveat or conflict. Distinguish source facts from inference and do not imply source review, stakeholder views, metric certainty, or confidence beyond what was actually established.

### 6. Reconcile Conflicts Explicitly

When sources disagree in a way that could change the downstream framing, preserve the disagreement instead of smoothing it over. Prefer the newest explicit decision artifact over older plans, owner-written docs over third-party summaries, and implementation artifacts over aspirational plans when the question is what is live, shipped, logged, or queryable now. Treat an informal source as stronger than a canonical artifact only when it clearly records a later decision or owner confirmation.

If disagreement remains, present both views, label the conflict, and state what source or owner would resolve it. If context is stale or incomplete, say what is missing and where to look next.

### 7. Stop Once The Framing Is Sound

Stop gathering context when the downstream task can be framed well enough to proceed and the likely enabled or provided source families have been checked, ruled out as unavailable, or identified as too thin. Before stopping, make sure the next step has a clear enough understanding of the topic, why it matters, where the important definitions came from, what recent context applies, and what gaps remain.

Continue searching when a relevant enabled or provided source is likely to add useful context. If an expected source was not found, name that as a gap rather than implying it does not exist.

### 8. Return A Lightweight Context Note When Useful

Prefer a focused context note over a full report or raw retrieval dump. Include enough context for the next analysis to proceed without redoing the search: a short summary, the relevant context, important definitions or source links, uncertainty or caveats, and citations. Keep it readable, but do not compress away details that explain the framing or source quality.

If the user asked only for quick orientation, shorten the structure while preserving citations, conflicts, and missing canonical artifacts.

## Standards

Judge sources by what they can actually establish. Informal discussion can be useful for discovery and recent context, but durable artifacts are usually stronger evidence for definitions, decisions, status, and measured results once found. Prefer sources close to the work, recent enough to reflect current reality, and explicit about what they establish. Surface missing source-of-truth artifacts as context gaps.

Keep important claims attributable. Treat a source as useful only when it clarifies how the downstream task should be framed or interpreted; sources that merely mention the topic are incidental. Preserve enough evidence to check the work later, and label interpretation, assumptions, conflicts, and uncertainty when support is thin, stale, indirect, or conflicting.

Preserve disagreements that could change the framing. Prefer owner-authored or decision-adjacent material and evidence of what is current over secondhand summaries or speculation. Do not infer consensus from silence. Say what source or owner would resolve an important conflict.
