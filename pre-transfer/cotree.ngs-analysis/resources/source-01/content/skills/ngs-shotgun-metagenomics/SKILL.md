---
name: "import.codex.ngs-analysis.ngs-shotgun-metagenomics"
description: "Kick off public shotgun metagenomics QC, host-depletion, taxonomic profiling, and functional profiling workflows using nf-core/taxprofiler, Kraken2, Bracken, MetaPhlAn, and HUMAnN."
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

# Shotgun Metagenomics

Use this skill for shotgun metagenomic FASTQs.

## Essential Inputs

Confirm:

- paired-end or single-end reads
- host organism and host-depletion requirement
- target outputs: taxonomic profile, functional profile, assembly, binning, or QC only
- preferred database family, if any
- database paths or permission to download large databases
- sample metadata, batches, and negative controls

## Public Defaults

Prefer `nf-core/taxprofiler` for reproducible taxonomic profiling. Use direct Kraken2/Bracken, MetaPhlAn, or HUMAnN when the user wants a focused path or already has databases installed.

For direct backend execution, prefer the plugin runner over handwritten shell when possible because it validates database bundle contents and records `resources/resource_plan.json`, `resource_manifest.tsv`, `resource_env.sh`, and `resource_readiness.md`. `--run-bracken` and `--run-humann` make those database bundles blocking, not merely optional.

## Preflight

```bash
python plugins/ngs-analysis/scripts/ngs_preflight.py --pipeline shotgun_metagenomics --emit-install-plan
```

## Local Execution Package

For FASTQ intake/QC before host-depletion, taxonomic profiling, or functional profiling, use:

```bash
python plugins/ngs-analysis/scripts/run_fastq_assay_package.py \
  --lane shotgun_metagenomics \
  --sample-sheet shotgun_samples.csv \
  --execute
```

This validates read paths and structure, runs seqkit stats and FastQC/MultiQC when available, and writes `taxonomic_classification_status.json`. Add `--kraken-db /path/to/db` only when a local Kraken2 database is available; otherwise the package records the database/tool blocker explicitly.

For backend taxonomic and functional profiling when databases are available, use:

```bash
python plugins/ngs-analysis/scripts/run_shotgun_metagenomics.py \
  --sample-sheet shotgun_samples.csv \
  --kraken-db /db/kraken2/standard \
  --host-reference /refs/human_kneaddata_db \
  --run-bracken \
  --run-humann \
  --humann-db /db/humann \
  --metadata sample_metadata.tsv \
  --execute
```

For nf-core execution, use `plugins/ngs-analysis/scripts/run_nfcore_pipeline.py --pipeline taxprofiler`.

When `--host-reference` is supplied, the backend runner adds a KneadData host-depletion step, requires `kneaddata` in tool preflight, writes cleaned FASTQs under `host_depletion/`, and uses those cleaned reads for downstream Kraken2 and HUMAnN steps. Keep the host reference path and host-depletion decision visible because it can change taxonomic and functional abundance conclusions.

The backend runner writes native matrix artifacts when database tools produce outputs:

- `tables/bracken_est_reads_matrix.tsv`
- `tables/bracken_relative_abundance_matrix.tsv`
- `tables/humann_pathabundance_matrix.tsv`
- `tables/humann_genefamilies_matrix.tsv`
- `tables/bracken_summary.json` and `tables/humann_summary.json`
- `tables/top_bracken_taxa.tsv`, `tables/top_humann_pathways.tsv`, `tables/top_humann_gene_families.tsv`, and `tables/metagenomics_backend_review.json` when normalized backend matrices are available

If Kraken2/Bracken/HUMAnN outputs are absent, the summaries and visualization manifest keep those layers `not_available` instead of implying taxonomic or functional interpretation succeeded.

## Kickoff Pattern

nf-core preflight run:

```bash
nextflow run nf-core/taxprofiler \
  -profile test,docker \
  --outdir results/taxprofiler_test
```

Direct Kraken2 skeleton:

```bash
kraken2 \
  --db /path/to/kraken2_db \
  --paired sample_R1.fastq.gz sample_R2.fastq.gz \
  --report results/kraken2/sample.report \
  --output results/kraken2/sample.kraken
```

## Visualization Outputs

The local FASTQ package always writes `visualizations/index.html` and `visualizations/visualization_manifest.json`. With only FASTQs, this is a read-QC/readiness bundle. Provide existing `--kraken-report`, `--bracken-table`, `--humann-pathabundance`, or `--humann-genefamilies` files to generate native taxonomy and functional-profile plots without requiring a Marimo notebook. For full backend runs, `run_shotgun_metagenomics.py` now also merges generated Bracken/HUMAnN outputs into plugin-native tables for the review bundle and writes `visualizations/shotgun_backend_dashboard.html` plus SVG plots for top Bracken taxa, HUMAnN pathways, and HUMAnN gene families when the corresponding matrices are present.

## Guardrails

- Do not auto-download large databases without confirming size and destination.
- Host depletion choices can change biological conclusions; document the reference and parameters.
- Negative controls should stay visible in QC and interpretation.
