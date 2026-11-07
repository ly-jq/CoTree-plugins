---
name: "import.codex.data-analytics.jupyter-notebooks"
description: "Create, edit, or validate reproducible SQL or Python notebooks. Use for notebooks, SQL/Python scratchpads, reproducible exploration, audit trails, or runnable companions where the analysis should be reviewable or rerunnable."
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

## Related Skills

Use $validate-data when notebook results support a recommendation, shared claim, or decision.

# Jupyter Notebooks

Create clean, reproducible Jupyter notebooks that are easy to skim, rerun, and handoff. Treat the notebook as a reader-facing analysis artifact, not a scratchpad dump. Notebook work is not complete until the notebook executes successfully top-to-bottom, or the execution gap is called out with the exact validation steps needed to reproduce it.

## Workflow

1. Lock the notebook mode and scope.

   Decide whether the notebook is an analysis report, experiment log, diagnostic notebook, data-quality check, market-sizing calculation, model exploration,
   tutorial, or companion artifact for a report. Identify the reader, decision,
   expected handoff, required inputs, and whether the task calls for a new notebook or targeted edits to an existing one.

2. Inspect or scaffold with notebook-safe tooling.

   Prefer JupyterLab, `nbformat`, `nbclient`, or an existing scaffold utility over hand-editing raw JSON. When editing an existing notebook, preserve its intent and minimize JSON churn. Avoid reordering cells unless it clearly improves the top-to-bottom story. If raw JSON editing is unavoidable,
   validate the notebook structure before finishing.

3. Structure the notebook for the chosen mode.

   For analytical notebooks, default to:

   1. `## tl;dr`
   2. `## Context & Methods`
   3. `## Data`
   4. `## Results`
   5. `## Takeaways`

   Write `tl;dr` and takeaways after reviewing executed outputs. Use concrete observed values, visible patterns, rows, or charts, not assumptions. Include a `### Key Assumptions` subsection in `Context & Methods` when assumptions affect correctness.

   For tutorials or walkthroughs, adapt the same discipline to a teaching flow:

   1. `## Goal`
   2. `## Setup`
   3. `## Steps`
   4. `## Checks`
   5. `## Next Steps`

4. Build a clear data and computation path.

   Separate setup, imports, parameters, data loading, data preparation,
   calculations, visualizations, and interpretation. If the notebook uses both SQL and Python, keep complex SQL in SQL cells or separate query files rather than large embedded Python strings unless there is a clear reason. Use descriptive variable names and keep each code cell focused on one step.

5. Use data sources deliberately.

   When a notebook needs table data, first use `~~structured_data` to confirm table choice, schema, partition filters, sample rows, and query-submission policy. Use the relevant source connector when available, then fall back to exports or pasted SQL when needed. Use `~~operations_logs` for freshness or lineage checks when they matter. Record query permalinks, request IDs, source paths, dashboard links,
   extract names, or other source artifacts in the notebook context for any executed result that supports the analysis. Keep heavy queries filtered and bounded instead of turning the notebook into a broad live-source scan.

6. Make cells readable and bounded.

   Add concise markdown headers before most code cells. Keep headers brief and action-oriented, such as `### 1. Load Data`, `### 2. Validate Inputs`, or `### 3. Plot Results`. Favor several short cells over one large mixed-purpose cell. Keep prose short: explain purpose, assumptions, and expected result, not every line of code. Split multiple tables or charts across separate cells instead of dumping all outputs from one cell.

7. Validate results before writing conclusions.

   Check that key numbers, charts, and takeaways match executed outputs. Bound raw debug output, oversized tables, and noisy logs. If a result is surprising, add a local reasonableness check, small sample inspection, or reconciliation against a trusted source before promoting it to the summary.

8. Execute and record validation status.

   Run the notebook top-to-bottom when the environment allows:

   ```bash
   python -m jupyter nbconvert --execute --to notebook --inplace path/to/notebook.ipynb
   ```

   Optional local setup when needed:

   ```bash
   uv pip install jupyterlab nbformat nbclient ipykernel
   ```

   If execution is not possible, say so explicitly and provide the exact command,
   missing dependency, credential, data access, kernel, or environment step needed to validate locally.

## Standards

### Notebook Structure

- Make the default top-to-bottom read clear before the reader starts executing cells out of order.
- Put executive summary material at the top, but write it last after inspecting executed results.
- Keep notebook sections aligned with the notebook mode: analysis, experiment,
  diagnostic, tutorial, or handoff artifact.
- Keep section titles, chart titles, labels, and file names descriptive enough for handoff.
- Preserve the existing notebook's intent when refactoring; improve structure without rewriting everything by default.

### Reproducibility

- Keep parameters, date ranges, filters, cohorts, assumptions, and source references visible near the top of the notebook.
- Record enough source context for another reader to trace the analysis: query permalinks, request IDs, table names, source paths, spreadsheet tabs,
  dashboard links, extract versions, or input file locations.
- Make computation deterministic where possible. Avoid hidden state, manually edited intermediate values, out-of-order dependencies, and unexplained cached outputs.
- Prefer explicit environment setup cells or notes when the notebook depends on nonstandard packages, kernels, credentials, or local files.
- Execute the notebook when the task requires a runnable artifact. In the final response, do not add a separate routine validation section for a clean run; surface execution gaps, partial execution, or unrun notebooks with the reason because those affect whether the user can rely on the artifact.

### Code And Data Hygiene

- Separate data preparation from presentation.
- Keep complex SQL readable and documented with a one-line goal comment.
- Keep plotting and lightweight shaping in Python after the data preparation step is complete.
- Use descriptive variable names and avoid abbreviated temporary names in reader-facing notebooks.
- Keep outputs bounded. Prefer small preview tables, sampled rows, explicit limits, and focused charts over raw dumps.
- Avoid broad live-source scans. Filter queries by needed partitions, cohorts,
  or time windows.

### Analysis Quality

- Make assumptions explicit when they affect interpretation.
- Tie takeaways to executed outputs with concrete numbers, rows, charts, or visible patterns.
- Do not promote unexecuted or unverified calculations into the `tl;dr`.
- Label caveats, incomplete checks, missing source access, and known validation gaps.
- Add reasonableness checks for surprising results, high-impact claims, or stakeholder-facing conclusions.

### Validation Checklist

- Required section order is present for the notebook mode.
- The notebook executes without runtime errors, or execution failure is called out explicitly.
- Outputs are present where expected and are not dominated by raw debug dumps.
- The `tl;dr`, results, and takeaways match executed cells.
- Source references and query or artifact links are preserved.
- Tables and charts are labeled, bounded, and interpretable.
- The final response includes the notebook path and validation status.
