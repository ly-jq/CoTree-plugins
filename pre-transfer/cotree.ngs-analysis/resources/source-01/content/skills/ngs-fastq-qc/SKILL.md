---
name: "import.codex.ngs-analysis.ngs-fastq-qc"
description: "Validate FASTQ inputs, run local FastQC/MultiQC QC, interpret QC signals, and optionally execute fastp or Cutadapt trimming branches without overwriting raw reads."
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

# FASTQ QC

Use this skill for QC-only, trimming-first, or FASTQ quality interpretation workflows. This skill can execute the plugin-owned local FastQ QC runner when the user approves a local run. It should decide whether trimming or additional investigation is warranted; it should not blindly trim by default.

## Essential Inputs

Confirm:

- FASTQ paths and pairing convention
- whether output should be QC-only or trimmed FASTQs
- known adapter or primer sequences
- organism if contamination screening or host depletion is requested
- output directory
- whether FASTQs are raw, demultiplexed, previously trimmed, or downloaded from an archive
- whether downstream analysis expects original read lengths, UMIs, or inline barcodes

## Public Tools

Default tool set:

- `FastQC` for raw read QC
- `MultiQC` for project-level summary
- `fastp` for all-in-one QC/trimming when acceptable
- `Cutadapt` when primer/adapter handling needs explicit sequences
- `seqkit` for quick counts, stats, and subsampling

## Preflight

```bash
python plugins/ngs-analysis/scripts/ngs_preflight.py --pipeline fastq_qc --emit-install-plan
```

## Local Execution

Use the plugin-owned runner for local artifact-producing FASTQ QC:

```bash
python plugins/ngs-analysis/scripts/run_fastq_qc.py \
  --sample-sheet samplesheet.csv \
  --execute
```

Single paired sample:

```bash
python plugins/ngs-analysis/scripts/run_fastq_qc.py \
  --sample sampleA \
  --r1 sampleA_R1.fastq.gz \
  --r2 sampleA_R2.fastq.gz \
  --execute
```

Optional trimming branch:

```bash
python plugins/ngs-analysis/scripts/run_fastq_qc.py \
  --sample-sheet samplesheet.csv \
  --trim-mode fastp \
  --execute
```

For explicit adapters:

```bash
python plugins/ngs-analysis/scripts/run_fastq_qc.py \
  --sample-sheet samplesheet.csv \
  --trim-mode cutadapt \
  --adapter-r1 AGATCGGAAGAGC \
  --adapter-r2 AGATCGGAAGAGC \
  --execute
```

The runner performs pre-execution validation before Snakemake execution. It writes a timestamped run directory with `run_manifest.json`, `config.json`, `validation/`, `workflow/Snakefile`, logs, `artifact_index.json`, `summary.md`, FastQC/MultiQC outputs, and `qc_interpretation.json` after successful execution.

## Interpretation Rules

Inspect raw QC before recommending trimming:

- Per-base quality drop at the read end: consider quality trimming, but preserve enough length for alignment or amplicon merging.
- Adapter or primer signal: use `cutadapt` when explicit sequences matter; use `fastp` only when automatic handling is acceptable.
- Poly-G or patterned-flowcell artifacts: handle with a tool that explicitly supports the artifact and report the assumption.
- Overrepresented sequences: classify adapters, primers, rRNA, PhiX, host contamination, or true biology before filtering.
- Per-tile failures or severe quality shifts: flag possible run-level issues and avoid treating them as ordinary adapter contamination.
- High duplication: interpret by assay; it may be expected for amplicons, targeted panels, or low-input libraries.
- Pairing issues: verify R1/R2 file counts and read-name pairing before any downstream workflow.

Do not overwrite input FASTQs. Preserve the raw QC reports even when trimmed FASTQs are created.

## Kickoff Pattern

QC-only:

```bash
mkdir -p results/fastqc results/multiqc
fastqc -t 4 -o results/fastqc *.fastq.gz
multiqc results/fastqc -o results/multiqc
```

QC plus trimming:

```bash
fastp \
  -i sample_R1.fastq.gz \
  -I sample_R2.fastq.gz \
  -o results/trimmed/sample_R1.fastq.gz \
  -O results/trimmed/sample_R2.fastq.gz \
  --html results/fastp/sample.html \
  --json results/fastp/sample.json
multiqc results -o results/multiqc
```

## Output Review

Return a short QC interpretation with:

1. sample/read-pair inventory
2. QC modules that look normal
3. QC modules that require action or user confirmation
4. trimming or no-trimming recommendation with rationale
5. downstream caveats such as short reads, contaminated libraries, or failed pairs

When using the local runner, ground the response in the generated `qc_interpretation.json`, `summary.md`, and MultiQC report instead of relying only on expected artifacts.
