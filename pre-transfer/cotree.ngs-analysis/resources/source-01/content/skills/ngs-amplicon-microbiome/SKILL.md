---
name: "import.codex.ngs-analysis.ngs-amplicon-microbiome"
description: "Kick off public 16S, 18S, ITS, COI, or other marker-gene amplicon microbiome workflows using nf-core/ampliseq, QIIME2, DADA2, and Cutadapt."
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

# Amplicon Microbiome

Use this skill for marker-gene microbiome analysis from amplicon FASTQs.

## Essential Inputs

Confirm:

- marker region: 16S, 18S, ITS, COI, or custom
- primer sequences and orientation
- paired-end or single-end reads
- whether reads should be merged
- taxonomy database and version
- sample metadata
- endpoint: ASV table, taxonomy, diversity, differential abundance, or plots

## Public Defaults

Prefer `nf-core/ampliseq` for reproducible end-to-end runs. Use QIIME2 or DADA2 directly when the user wants notebook-level control or an existing lab protocol requires it.

## Preflight

```bash
python plugins/ngs-analysis/scripts/ngs_preflight.py --pipeline amplicon_microbiome --emit-install-plan
```

## Local Execution Package

For FASTQ intake/QC before primer, ASV, and taxonomy decisions, use:

```bash
python plugins/ngs-analysis/scripts/run_fastq_assay_package.py \
  --lane amplicon_microbiome \
  --sample-sheet amplicon_samples.tsv \
  --execute
```

This validates read paths and structure, runs seqkit stats and FastQC/MultiQC when available, and writes `amplicon_analysis_status.json`. The runner now also emits `methods/amplicon_methods.json` plus a concrete backend handoff bundle under `workflow/` so primer, denoiser, truncation, normalization, and taxonomy choices are machine-readable even before a full backend is run.

If the user asks for a full amplicon analysis rather than QC/readiness, do not treat FASTQs alone as sufficient. Require primer sequences, primer orientation, taxonomy database plus version, and sample metadata before presenting the run as analysis-ready. Without that context, run the local execution package and describe the result as a read-QC/readiness bundle only.

For backend ASV/taxonomy/diversity execution when primers, metadata, and taxonomy resources are available, use:

```bash
python plugins/ngs-analysis/scripts/run_amplicon_microbiome.py \
  --sample-sheet amplicon_samples.tsv \
  --backend qiime2 \
  --primer-forward GTGYCAGCMGCCGCGGTAA \
  --primer-reverse GGACTACNVGGGTWTCTAAT \
  --taxonomy-classifier silva-138-classifier.qza \
  --metadata sample_metadata.tsv \
  --execute
```

Use `--backend dada2` for a direct R/Bioconductor ASV path. The plugin includes `workflows/amplicon_microbiome/run_dada2_backend.R`; the runner checks for `Rscript` and the `dada2` R package before execution, then writes normalized ASV, representative-sequence, read-retention, and optional taxonomy tables under `tables/`.

For nf-core execution, use `plugins/ngs-analysis/scripts/run_nfcore_pipeline.py --pipeline ampliseq`.

The direct backend runner also emits `resources/resource_plan.json`, `resource_manifest.tsv`, `resource_env.sh`, and `resource_readiness.md`. The resource check is advisory by default when a QIIME classifier is supplied directly; add `--bundle-root silva_138_amplicon=<path>`, `--include-optional-resources`, and `--require-resource-plan` when missing registered taxonomy databases should block readiness.

The backend runner writes native normalized tables when QIIME2/DADA2/nf-core outputs are present:

- `tables/asv_table.tsv`
- `tables/representative_sequences.fasta` for direct DADA2 runs
- `tables/taxonomy.tsv`
- `tables/read_retention.tsv`
- `tables/amplicon_backend_summary.json`
- `tables/alpha_diversity.tsv`, `tables/bray_curtis_distance.tsv`, and `tables/top_taxa_or_features.tsv` when a normalized ASV/feature table is available

QIIME2 BIOM-only feature-table exports are recorded as requiring conversion, with a `biom convert` command in the backend summary. Do not claim diversity or taxonomy interpretation unless these normalized tables or equivalent supplied inputs exist.

## Kickoff Pattern

nf-core preflight run:

```bash
nextflow run nf-core/ampliseq \
  -profile test,docker \
  --outdir results/ampliseq_test
```

Before a real run, verify primer trimming and truncation choices from read-quality profiles.

## Visualization Outputs

The local FASTQ package always writes `visualizations/index.html` and `visualizations/visualization_manifest.json`. With only FASTQs, this is a read-QC/readiness bundle. If an ASV/feature table is available, pass it to the runner with `--asv-table` to generate alpha diversity, Bray-Curtis PCoA, and rarefaction artifacts. If a feature taxonomy table is available, pass `--taxonomy-table` to generate taxa barplots. When downstream tables are labeled synthetic or contain sample columns that are not present in the real sample sheet, the runner marks the run review-only and blocks beta-diversity/PCoA unless `--allow-synthetic-diversity` is set explicitly.

The run also emits `qc_verdict.json` and, for amplicon runs, `qc_interpretation.json` with machine-readable reason codes, a readiness verdict, and follow-on command templates for generating ASV/taxonomy tables and re-rendering plugin-native plots. Backend runs additionally write `tables/amplicon_backend_summary.json` so exported ASV, taxonomy, read-retention, and BIOM-conversion status are auditable. When a normalized ASV/feature table is available, the backend runner also writes `tables/amplicon_diversity_summary.json`, `visualizations/amplicon_backend_dashboard.html`, and SVG plots for sample depth, Shannon diversity, and top taxa/features. If the ASV table is absent, these outputs remain explicitly unavailable rather than inferred from FASTQ QC.

## Guardrails

- Do not choose truncation lengths before looking at quality distributions.
- Do not mix taxonomy database versions without recording them.
- Preserve negative controls and extraction blanks in metadata.
