---
name: "import.codex.ngs-analysis.ngs-epigenomics-peaks"
description: "Dispatch ATAC-seq, ChIP-seq, CUT&RUN, or CUT&Tag requests to assay-specific QC, alignment, signal-track, peak-calling, consensus, and differential peak workflows."
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

# Epigenomics Peaks

Use this skill as the epigenomics dispatcher for ATAC-seq, ChIP-seq, CUT&RUN, or CUT&Tag analysis. Hand off to the assay-specific deep skill once the assay type is known.

## Essential Inputs

Confirm:

- assay type
- FASTQ or BAM input
- organism and genome build
- blacklist file, if available
- control samples: input DNA, IgG, or spike-in
- biological replicates
- peak type: narrow, broad, accessibility, or protocol-specific
- desired outputs: QC report, peaks, consensus peaks, bigWigs, differential peaks

## Public Defaults

Choose the workflow by assay:

- ATAC-seq: `ngs-atacseq-peaks-qc` using `nf-core/atacseq` by default
- ChIP-seq: `ngs-chip-cutrun-peaks-qc` using `nf-core/chipseq` by default
- CUT&RUN or CUT&Tag: `ngs-chip-cutrun-peaks-qc` using `nf-core/cutandrun` by default

Use direct MACS2 only for focused peak-calling tasks from prepared BAMs.

## Preflight

```bash
python plugins/ngs-analysis/scripts/ngs_preflight.py --pipeline epigenomics_peaks --emit-install-plan
```

## Local Execution Package

For FASTQ intake/QC over ATAC-seq, ChIP-seq, CUT&RUN, or CUT&Tag data, use the shared FASTQ assay package:

```bash
python plugins/ngs-analysis/scripts/run_fastq_assay_package.py \
  --lane epigenomics_peaks \
  --sample-sheet assay_samples.csv \
  --execute
```

This validates sample-sheet paths and read structure, runs seqkit stats and FastQC/MultiQC when available, and writes `peak_calling_readiness.json`. Full alignment, signal tracks, TSS/FRiP, consensus peaks, and differential analyses still route through the assay-specific workflow.

Assay-specific ATAC and ChIP/CUT&RUN runners now also emit native review files alongside TSV/JSON summaries: `qc/*_dashboard.html`, FRiP/peak SVG plots, insert-size SVG plots, browser-track preview HTML, UCSC track lines, and IGV session files.

## Kickoff Pattern

ATAC-seq preflight run:

```bash
nextflow run nf-core/atacseq \
  -profile test,docker \
  --outdir results/atacseq_test
```

ChIP-seq preflight run:

```bash
nextflow run nf-core/chipseq \
  -profile test,docker \
  --outdir results/chipseq_test
```

CUT&RUN/CUT&Tag preflight run:

```bash
nextflow run nf-core/cutandrun \
  -profile test,docker \
  --outdir results/cutandrun_test
```

Carry replicate and control metadata through the sample sheet before running real analysis.
