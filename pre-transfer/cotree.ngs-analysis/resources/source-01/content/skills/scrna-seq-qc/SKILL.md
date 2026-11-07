---
name: "import.codex.ngs-analysis.scrna-seq-qc"
description: "Process, quality-control, annotate, and visualize single-cell or single-nucleus RNA-seq datasets across tissues and species. Use when Codex needs to build, adapt, or review a general scRNA-seq QC pipeline; choose dataset-appropriate cell-level filters from QC distributions; run required scDblFinder-based doublet and ambient-RNA filtering; annotate cells with matched references or marker-based fallbacks; or generate global and per-group UMAP visualizations for large scRNA-seq datasets."
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

# scRNA-seq QC

## Start Here

Read `references/qc-annotation-umap-heuristics.md` before picking thresholds, annotation backends, or UMAP feature-selection rules.

Confirm what inputs exist before writing code:

- An AnnData object or equivalent with raw counts preserved.
- Per-sample, per-batch, or per-channel metadata, because QC and doublet detection should respect technical partitions.
- Organism, tissue, assay type, chemistry, and whether the data are whole-cell or single-nucleus.
- Whether a matched cell atlas or label-transfer reference exists for the tissue and species.

Preserve provenance in the output: package versions, thresholds, threshold-justification plots, counts removed or flagged at each filter, annotation backend and reference, marker-gene selection heuristic, and any manual cluster exclusions.

## Workflow

1. Choose QC thresholds from the data, not from a fixed template.
   - Plot detected genes, total UMIs, mitochondrial fraction, and any tissue-specific nuisance signals overall and by batch.
   - Inspect all available QC metrics, but default filtering should use only the standard metrics: detected genes, total counts, and `percent.mt`.
   - Pick thresholds from the observed distributions and expected biology.
   - Save a plot with threshold lines and record why each threshold is appropriate for this dataset.
   - If another metric looks important enough to filter on, flag it as a dataset-specific issue, explain why, and consult the user before adding that extra filter.
   - Keep QC plots legible: do not overload a single panel with too many batches or categories when faceting, splitting, or summary views would communicate the result more clearly.

2. Run cell-level QC.
   - Remove or flag obvious low-quality barcodes using the chosen thresholds on detected genes, total counts, and `percent.mt`.
   - Use `scDblFinder` for doublet detection. Run it per batch or capture channel, and split very large batches before doublet calling.
   - Do not skip doublet calling or silently substitute another method. If `scDblFinder` cannot run in the environment, surface the blocker explicitly or get user approval before using a different caller.
   - Compute ambient-RNA style metrics and use them for filtering when the dataset and workflow support it.
   - Compute any other informative QC metrics when feasible, but do not turn those additional nonstandard metrics into hard filters without explicit user approval unless the user already asked for a stricter policy.
   - Prefer adding a `passes_QC` column instead of physically dropping cells when downstream provenance matters.

3. Build a latent space and inspect residual artifacts.
   - Decide whether `scVI` is warranted for this dataset and use case before training it.
   - Prefer a standard PCA/Scanpy workflow for smaller, simpler datasets with limited batch structure or when a conventional embedding answers the question cleanly.
   - Prefer `scVI` when integration across batches, donors, chemistries, or related datasets is important, or when the dataset is large and noisy enough that a learned latent space is likely to help.
   - Record why `scVI` or a conventional PCA workflow was chosen for this dataset.
   - Cluster and inspect low-quality, mixed-marker, or ambiguous clusters before downstream visualization.
   - Remove or flag artifact clusters only with explicit evidence, and record the rationale.

4. Annotate cells.
   - If a suitable Allen Brain Cell Atlas reference exists and the dataset is a compatible brain tissue and species, use MapMyCells or `cell_type_mapper`.
   - If no suitable Allen reference exists, use the closest matched reference for tissue, species, assay, and chemistry with an appropriate mapping tool.
   - If no reliable reference exists, annotate conservatively from canonical markers and cluster-level markers. Assign coarse labels first and leave uncertain clusters as unknown or ambiguous rather than overlabeling them.
   - Persist annotation confidence or probability fields when available, together with at least one coarse and one fine label.

5. Choose a general marker panel for global UMAP.
   - Do not rely on a perturbation-specific or brain-only marker panel.
   - Start from HVGs selected in a batch-aware way.
   - Add genes that distinguish major coarse compartments or high-confidence labels, for example top markers per coarse cluster or class.
   - Exclude nuisance-dominated genes if they swamp the embedding unless the biology requires them.
   - Document how the panel was chosen.

6. Generate UMAP visualizations.
   - For a global UMAP, use the learned latent space or the chosen informative marker panel, depending on which better matches the analytical goal and runtime constraints.
   - For per-group UMAPs, subset by a stable coarse label and use the latent representation unless there is a strong reason to rebuild on expression features.
   - Keep plotting separate from filtering so visualization choices do not mutate the core analysis object.
   - Make every plot legible. Use a reasonable number of categories per panel, prefer coarse labels on overview plots, and split or facet figures when fine labels, batches, or neighborhoods would otherwise make the figure unreadable.

7. Scale to large datasets without copying.
   - Keep matrices sparse whenever possible.
   - Avoid densifying whole matrices.
   - Avoid whole-object copies of AnnData or Seurat objects; use views, backed mode, chunked operations, and per-batch or per-group manifests instead.
   - When crossing Python and R boundaries, pass only the subset and metadata required for the step.
   - Write checkpoints after major stages so failures do not require restarting from raw ingest.

## Deliverables

When implementing a pipeline, produce an auditable output set:

- Filtered `.h5ad` or equivalent object with raw counts preserved and QC or annotation fields in metadata.
- QC summary table with input cells, cells removed or flagged by each filter, final cells, and per-batch summaries.
- Threshold-justification plots for detected genes, UMIs, mitochondrial fraction, plus any additional QC metric that was inspected; clearly separate metrics that informed review from metrics that actually drove filtering.
- Parameter manifest with thresholds, package versions, annotation backend and reference, marker-panel heuristic, and any manual exclusions.
- UMAP coordinates and plots for global and per-group views when requested, with category counts and panel layouts chosen so the figures remain legible.

## Embedded Runner

For 10x-style matrix bundles, a local runner is available:

```bash
python plugins/ngs-analysis/scripts/run_scrnaseq_post_count_qc.py --input-dir path/to/scrna_bundle
```

The input directory should contain `matrix/`, `manifest.tsv`, and `dataset_metadata.json`, unless explicit paths are supplied. Treat the runner as an auditable analysis surface: its marker-based fallback is PBMC-oriented when no matched reference is provided, so tissue-specific annotation and integration choices still require review.

The runner writes `visualizations/index.html` for portable artifact review, `summary.md` plus `provenance/analysis_status.json` for explicit completeness/blocker reporting, and auto-launches a localhost Marimo review app recorded in `notebooks/marimo_server.json`. It also writes `notebooks/scrna_qc_review.marimo.py` as a notebook backup over the generated PNG/CSV/H5AD outputs. Treat the notebook and review app as review layers, not as the source of truth; the run envelope and generated artifacts remain canonical.

## Resources

- `references/qc-annotation-umap-heuristics.md`: Threshold-selection heuristics, annotation fallback strategy, general marker-panel selection rules, and large-dataset memory practices.
