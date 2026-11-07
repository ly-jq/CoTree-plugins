---
name: "import.codex.ngs-analysis.ngs-bulk-rnaseq-counts-qc"
description: "Run or plan bulk RNA-seq FASTQ-to-count processing with sample-sheet, strandedness, genome annotation, alignment or pseudoalignment, MultiQC, and count-matrix QC checks."
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

# Bulk RNA-seq Counts QC

Use this skill for bulk RNA-seq read processing, quantification, and count-matrix generation. If the user already has a count matrix and wants contrasts or statistics, use `ngs-bulk-rnaseq-differential-expression`.

## Essential Inputs

Confirm:

- FASTQ or aligned-read inputs and paired-end/single-end status
- organism, genome build, FASTA, GTF, and gene ID convention
- strandedness or permission to infer strandedness
- sample sheet with biological condition, replicate, batch, and library metadata
- desired quantification: gene counts, transcript estimates, or both
- alignment strategy: `STAR/Salmon`, Salmon-only, featureCounts from BAMs, or existing lab protocol

## Route

Prefer `nf-core/rnaseq` for standard processing when a stable container or HPC runtime is available. Use the `local_light` Snakemake/Salmon path for small local/devbox feasibility runs when Docker, registry egress, or Nextflow process containers are the blocker.

The plugin-owned local runner is:

```bash
python plugins/ngs-analysis/scripts/run_bulk_rnaseq_counts_qc.py \
  --sample-sheet samplesheet.csv \
  --fastq-root path/to/fastqs \
  --transcriptome-fasta reference/transcriptome.fasta \
  --genome-fasta reference/genome.fa \
  --annotation-gtf reference/genes.gtf \
  --execute
```

Omit `--execute` for validation plus Snakemake workflow validation only. Use `--no-dry-run` only when the user wants input validation and run-envelope preparation without workflow graph validation.

The runner emits a run-local `resources/` readiness bundle with `resource_plan.json`, `resource_manifest.tsv`, `resource_env.sh`, and `resource_readiness.md`. Resource checks are advisory by default for custom or reduced references; add `--genome-build`, `--bundle-root <bundle>=<path>`, and `--require-resource-plan` when a registered genome bundle must be complete before the run is considered ready.

Preflight command:

```bash
python plugins/ngs-analysis/scripts/ngs_preflight.py --pipeline bulk_rnaseq_counts_qc --emit-install-plan
python plugins/ngs-analysis/scripts/ngs_preflight.py --profile local_light --emit-install-plan
```

## Decision Points

- If strandedness is unknown, infer it before final counting; do not lock in a design based on library guesses.
- If strandedness is provided, carry it into the quantification command and flag any disagreement between the configured library type and Salmon's inferred format.
- Keep genome FASTA, GTF, transcriptome, and aligner indexes from the same build/release.
- Inspect per-sample reads, mapping rate, rRNA/mitochondrial fraction when available, duplication, insert size, gene-body bias, and assignment rate.
- Preserve raw counts separately from normalized expression.
- Carry sample metadata forward exactly; downstream DE depends on this table.

## Outputs

Produce:

- sample sheet and command/profile
- reference manifest with genome and GTF release
- MultiQC or equivalent processing summary
- Salmon `quant.sf` outputs, TPM/NumReads/effective-length matrices, and carried-forward sample metadata
- Gene-level expected-count and TPM matrices derived from transcript-level Salmon outputs, plus a `tx2gene` provenance table
- Compact QC verdict JSON covering mapping rate, duplication, library-type agreement, and outlier samples
- Browser-safe MultiQC helper HTML pages and a localhost launch hint for reliable in-app review
- Run-local reference readiness artifacts under `resources/`, including the resource plan, manifest, environment exports, and Markdown readiness summary
- issues that block differential expression, such as missing replicates, mislabeled groups, or severe batch/library failures
- standard run envelope: `run_manifest.json`, `config.json`, `validation/`, `logs/`, `versions/`, `artifact_index.json`, and `summary.md`
