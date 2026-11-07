---
name: "import.codex.ngs-analysis.ngs-atacseq-peaks-qc"
description: "Run or plan ATAC-seq QC, alignment, TSS enrichment, fragment-size, blacklist, peak-calling, consensus peak, and differential accessibility workflows."
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

# ATAC-seq Peaks QC

Use this skill for ATAC-seq accessibility analysis from FASTQ or BAM. If the assay is ChIP-seq, CUT&RUN, CUT&Tag, or antibody-targeted enrichment, use `ngs-chip-cutrun-peaks-qc`.

## Essential Inputs

Confirm:

- FASTQ/BAM inputs and paired-end status
- organism, genome build, blacklist, and mitochondrial contig names
- biological replicates, conditions, batches, and sample metadata
- whether the target is QC only, peaks, consensus peaks, bigWigs, or differential accessibility
- whether Tn5 shifting is handled by the chosen workflow
- desired peak caller and downstream matrix generation

## Route

Prefer `nf-core/atacseq` for full reproducible processing. Use direct MACS2 only when BAMs are already aligned, duplicate/blacklist handling is known, and the user wants focused peak calling.

Preflight command:

```bash
python plugins/ngs-analysis/scripts/ngs_preflight.py --pipeline atacseq_peaks_qc --emit-install-plan
```

For compact read-level intake/QC, use the shared epigenomics execution package:

```bash
python plugins/ngs-analysis/scripts/run_fastq_assay_package.py \
  --lane epigenomics_peaks \
  --sample-sheet atac_samples.csv \
  --execute
```

For local-light ATAC alignment, peaks, FRiP, TSS, bigWig tracks, and consensus peaks from FASTQ or prepared BAMs, use the dedicated ATAC runner:

```bash
python plugins/ngs-analysis/scripts/run_atacseq_peaks_qc.py \
  --sample-sheet atac_samples.csv \
  --bowtie2-index /refs/GRCh38/bowtie2/genome \
  --genome-size hs \
  --blacklist-bed /refs/GRCh38/blacklists/encode_blacklist.bed \
  --tss-bed /refs/GRCh38/tss.bed \
  --execute
```

This runner emits `qc/atacseq_qc_summary.{tsv,json}`, `qc/atacseq_qc_dashboard.html`, native SVG FRiP/peak and insert-size plots, browser-track handoff files under `tracks/`, and TSS profile/heatmap commands when `--tss-bed` is supplied. Add `--run-motifs --motif-genome <genome>` when HOMER motif enrichment should be part of the backend run.

It also emits `resources/resource_plan.json`, `resource_manifest.tsv`, `resource_env.sh`, and `resource_readiness.md`. The resource check is advisory by default for local-light runs; add `--genome-build`, `--bundle-root <bundle>=<path>`, and `--require-resource-plan` when missing registered reference bundles should block readiness.

For nf-core execution, use `plugins/ngs-analysis/scripts/run_nfcore_pipeline.py --pipeline atacseq`.

## QC Gates

Review before biological interpretation:

- read depth, alignment rate, duplicate rate, and mitochondrial fraction
- insert-size periodicity/nucleosome pattern
- TSS enrichment and FRiP score when available
- blacklist overlap and peak count per sample
- replicate concordance and consensus peak support

Do not proceed to differential accessibility if replicate quality or metadata is insufficient.

## Outputs

Produce:

- sample sheet and workflow command/profile
- QC summary and failed-sample flags
- narrowPeak/BED peak sets, consensus peaks, bigWigs, browser-track manifests, browser-track preview HTML, native QC dashboard/SVG plots, TSS plots, and peak-count matrix when requested
- motif summary files when a motif backend is requested
- differential-accessibility design and contrasts if applicable
- caveats for low TSS enrichment, high mitochondrial reads, weak replicate concordance, or poor FRiP
