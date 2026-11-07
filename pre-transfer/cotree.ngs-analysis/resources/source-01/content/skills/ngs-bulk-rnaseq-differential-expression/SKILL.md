---
name: "import.codex.ngs-analysis.ngs-bulk-rnaseq-differential-expression"
description: "Run or plan bulk RNA-seq differential-expression analysis from count matrices with replicate, design formula, contrast, batch, normalization, QC plot, and result-table checks."
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

# Bulk RNA-seq Differential Expression

Use this skill when the user has raw counts or a count-generation output and wants differential expression, contrasts, QC plots, or ranked gene tables.

## Essential Inputs

Confirm:

- raw count matrix path and sample metadata path
- gene ID type and annotation mapping requirement
- biological conditions, replicates, batch variables, donor pairing, covariates, and exclusions
- exact contrasts and baseline levels
- preferred statistical framework: DESeq2, edgeR, limma-voom, or existing lab standard
- output needs: normalized counts, PCA, sample distance, volcano plots, heatmaps, ranked tables, GSEA-ready lists

## Preconditions

Do not start differential expression until:

- raw counts are preserved
- each requested contrast has enough biological replication
- sample metadata row names match count matrix columns
- batch/covariate choices are explicit
- exploratory PCA/sample-distance plots do not reveal obvious swaps or failed libraries

## Route

For most count matrices, use DESeq2 or edgeR. Use limma-voom when the study design or lab standard favors it. Keep the analysis in R when using Bioconductor unless the user specifically asks for a Python-only workflow.

The plugin-owned local runner is:

```bash
python plugins/ngs-analysis/scripts/run_bulk_rnaseq_de.py \
  --count-matrix count_matrix.tsv \
  --sample-metadata sample_metadata.tsv \
  --contrasts contrasts.tsv \
  --execute
```

Use `--method auto` unless the user or lab standard specifies `DESeq2`, `edgeR`, or `limma_log2`. Auto mode uses DESeq2 when integer-like counts and the package are available, falls back to edgeR for integer-like counts, and uses `limma_log2` for non-integer expression matrices.

Use `--input-mode` to declare whether the matrix is `raw_counts`, `normalized_expression`, or `log_expression`. When `--input-mode auto` is used, the runner infers the mode and records a warning if normalization is skipped because the matrix is already transformed.

Preflight command:

```bash
python plugins/ngs-analysis/scripts/ngs_preflight.py --pipeline bulk_rnaseq_differential_expression --emit-install-plan
```

## Decision Points

- Never compare groups without stating the design formula and contrast.
- Treat batch correction in modeling separately from visual batch removal.
- Do not filter genes using post-hoc knowledge of the contrast.
- For paired or repeated-measures designs, model subject/donor explicitly.
- Report genes with effect size, uncertainty, adjusted p-value, and filtering status.

## Outputs

Produce:

- design formula and contrast manifest
- QC plots: library size, detected genes, PCA/sample distance, mean-variance trend, and outlier review
- input-mode-aware matrix exports plus the modeling/log-scale matrix used for DE
- differential-expression tables per contrast
- explicit `.not_tested.tsv` stubs for contrasts blocked by insufficient replication or confounding
- auto-launched localhost Marimo review app recorded in `notebooks/marimo_server.json`
- caveats for small n, confounded designs, failed samples, or batch variables that cannot be estimated
- standard run envelope: `run_manifest.json`, `config.json`, `validation/`, `logs/`, `versions/`, `visualizations/`, `notebooks/`, `artifact_index.json`, and `summary.md`
