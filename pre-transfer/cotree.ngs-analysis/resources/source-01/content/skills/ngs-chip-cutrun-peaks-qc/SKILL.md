---
name: "import.codex.ngs-analysis.ngs-chip-cutrun-peaks-qc"
description: "Run or plan ChIP-seq, CUT&RUN, or CUT&Tag QC, control handling, spike-in, peak calling, broad-vs-narrow target selection, replicate, bigWig, and differential binding workflows."
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

# ChIP/CUT&RUN Peaks QC

Use this skill for antibody-targeted enrichment workflows: ChIP-seq, CUT&RUN, or CUT&Tag. Use `ngs-atacseq-peaks-qc` for ATAC-seq.

## Essential Inputs

Confirm:

- assay: ChIP-seq, CUT&RUN, or CUT&Tag
- target class: transcription factor, histone mark, chromatin regulator, or custom target
- FASTQ/BAM inputs and paired-end status
- input DNA, IgG, no-antibody, or spike-in controls
- organism, genome build, blacklist, and spike-in genome if used
- biological replicates, conditions, batches, and sample metadata
- desired endpoint: QC, peaks, bigWigs, consensus peaks, or differential binding

## Route

Use `nf-core/chipseq` for ChIP-seq and `nf-core/cutandrun` for CUT&RUN/CUT&Tag when they fit the assay. Use direct MACS2 only for prepared BAMs with known control and duplicate policy.

Preflight command:

```bash
python plugins/ngs-analysis/scripts/ngs_preflight.py --pipeline chip_cutrun_peaks_qc --emit-install-plan
```

For compact FASTQ intake/QC, use the shared epigenomics execution package:

```bash
python plugins/ngs-analysis/scripts/run_fastq_assay_package.py \
  --lane epigenomics_peaks \
  --sample-sheet chip_or_cutrun_samples.csv \
  --execute
```

It records FASTQ-level QC and peak-calling readiness.

For local-light alignment, control-aware MACS2 peak calling, FRiP, bigWig tracks, consensus peaks, and motif-handoff artifacts, use the dedicated ChIP/CUT&RUN runner:

```bash
python plugins/ngs-analysis/scripts/run_chip_cutrun_peaks_qc.py \
  --sample-sheet chip_or_cutrun_samples.csv \
  --assay chipseq \
  --target-class tf \
  --peak-mode narrow \
  --bowtie2-index /refs/GRCh38/bowtie2/genome \
  --genome-size hs \
  --blacklist-bed /refs/GRCh38/blacklists/encode_blacklist.bed \
  --execute
```

This runner emits `qc/chip_cutrun_qc_summary.{tsv,json}`, `qc/chip_cutrun_qc_dashboard.html`, native SVG FRiP/peak and insert-size plots, browser-track handoff files under `tracks/`, and `motifs/motif_summary.tsv`. Add `--run-motifs --motif-genome <genome>` when HOMER motif enrichment should be executed instead of only planned.

It also emits `resources/resource_plan.json`, `resource_manifest.tsv`, `resource_env.sh`, and `resource_readiness.md`. The resource check is advisory by default for local-light runs; add `--genome-build`, `--bundle-root <bundle>=<path>`, and `--require-resource-plan` when missing registered reference bundles should block readiness.

For nf-core execution, use `plugins/ngs-analysis/scripts/run_nfcore_pipeline.py --pipeline chipseq` or `--pipeline cutandrun`.

## Decision Points

- Choose narrow versus broad peak mode from target biology, not from convenience.
- Preserve control pairing and spike-in metadata through sample sheets.
- For histone marks, expect broad or domain-like signal for many marks; for TFs, expect sharper peaks and stronger replicate checks.
- Review alignment rate, duplicate rate, fragment size, FRiP/peak signal, blacklist overlap, and replicate concordance.
- Keep consensus peak generation and differential binding design separate from raw peak calling.

## Outputs

Produce:

- assay/target/control manifest
- command/profile and sample sheet
- QC summary with replicate/control status
- peaks, bigWigs, browser-track manifests, browser-track preview HTML, native QC dashboard/SVG plots, consensus peaks, and count matrix when requested
- motif summary files when a motif backend is requested
- differential binding design and caveats for missing controls, weak enrichment, or poor replicate concordance
