---
name: "import.codex.ngs-analysis.ngs-bulk-rnaseq"
description: "Dispatch bulk RNA-seq requests to FASTQ-to-count QC or count-matrix differential-expression skills using nf-core/rnaseq, STAR, Salmon, featureCounts, MultiQC, and R/Bioconductor workflows."
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

# Bulk RNA-seq

Use this skill as the bulk RNA-seq dispatcher. Route FASTQ/BAM processing to count-generation QC, and route count-matrix statistical analysis to differential-expression guidance.

## Essential Inputs

Confirm:

- organism and genome build
- FASTA and GTF, or supported nf-core genome key
- paired-end or single-end reads
- strandedness, or whether to infer strandedness
- sample sheet and metadata
- counts-only vs differential expression
- contrasts, covariates, and batch terms for differential expression

## Dispatch

- FASTQ or aligned reads to raw counts, transcript estimates, or MultiQC summaries: `ngs-bulk-rnaseq-counts-qc`
- Raw count matrix plus sample metadata to contrasts, plots, and DE result tables: `ngs-bulk-rnaseq-differential-expression`

If the user asks for both, run count-generation planning first and start differential expression only after the raw count matrix, sample metadata, replicates, design formula, and contrasts are confirmed.

## Public Default

Prefer `nf-core/rnaseq` for standardized processing when a stable container or HPC runtime is available. Use the `local_light` Snakemake/Salmon path when Docker, registry egress, or Nextflow process containers are unavailable and a compact local run is appropriate.

## Plugin-Owned Local Paths

Use the counts/QC runner for local FASTQ-to-matrix execution:

```bash
python plugins/ngs-analysis/scripts/run_bulk_rnaseq_counts_qc.py \
  --sample-sheet samplesheet.csv \
  --fastq-root path/to/fastqs \
  --transcriptome-fasta reference/transcriptome.fasta \
  --genome-fasta reference/genome.fa \
  --annotation-gtf reference/genes.gtf \
  --execute
```

Use the differential-expression runner when the user already has a count or expression matrix:

```bash
python plugins/ngs-analysis/scripts/run_bulk_rnaseq_de.py \
  --count-matrix count_matrix.tsv \
  --sample-metadata sample_metadata.tsv \
  --contrasts contrasts.tsv \
  --execute
```

## Preflight

```bash
python plugins/ngs-analysis/scripts/ngs_preflight.py --pipeline bulk_rnaseq --emit-install-plan
python plugins/ngs-analysis/scripts/ngs_preflight.py --pipeline bulk_rnaseq_counts_qc --emit-install-plan
python plugins/ngs-analysis/scripts/ngs_preflight.py --pipeline bulk_rnaseq_differential_expression --emit-install-plan
python plugins/ngs-analysis/scripts/ngs_preflight.py --profile local_light --emit-install-plan
```

## Kickoff Pattern

Preflight run:

```bash
nextflow run nf-core/rnaseq \
  -profile test,docker \
  --outdir results/rnaseq_test
```

Real run skeleton:

```bash
nextflow run nf-core/rnaseq \
  -profile docker \
  --input samplesheet.csv \
  --outdir results/rnaseq \
  --genome GRCh38 \
  --aligner star_salmon
```

If strandedness is unknown, run inference or use the pipeline's strandedness detection before committing to final counts.

Local execution run:

```bash
python plugins/ngs-analysis/scripts/run_bulk_rnaseq_counts_qc.py \
  --sample-sheet samplesheet.csv \
  --fastq-root path/to/fastqs \
  --transcriptome-fasta reference/transcriptome.fasta
```

The local runners create a standard run envelope with `run_manifest.json`, `config.json`, `validation/`, `logs/`, `versions/`, `artifact_index.json`, and `summary.md`. Do not depend on development-only eval harness paths in a shared package.

## Downstream

Only start DESeq2/edgeR/limma analysis after confirming biological replicates, design formula, and contrasts. Preserve the raw count matrix and sample metadata.
