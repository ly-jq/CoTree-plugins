---
name: "import.codex.ngs-analysis.ngs-analysis-router"
description: "Route BCL, FASTQ, BAM/CRAM, count-matrix, or VCF sequencing requests to the right public NGS analysis skill and ask only the missing assay-specific setup questions."
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

# Life Sciences NGS Analysis Router

Use this skill as the top-level entrypoint for ambiguous or broad sequencing-analysis requests.

## Start Here

Inspect the available inputs before asking the user questions. Look for:

- Illumina run-folder files: `RunInfo.xml`, `RunParameters.xml`, `SampleSheet.csv`, `Data/Intensities/BaseCalls`
- FASTQs: `*.fastq`, `*.fq`, `*.fastq.gz`, `*.fq.gz`
- BAM/CRAM/VCF: `*.bam`, `*.cram`, `*.vcf`, `*.vcf.gz`
- count matrices: `matrix.mtx`, `features.tsv`, `barcodes.tsv`, `*.h5`, `*.h5ad`, `*.rds`
- metadata: sample sheets, design files, target BEDs, reference FASTA/GTF, primer files

Read `references/intake-schema.json` and `references/pipeline-registry.json` when forming the route.

## Intake Rules

Ask the smallest set of missing questions needed to choose a defensible pipeline. Do not ask the full questionnaire if file inspection already answers a field.

Always resolve:

- input type
- assay type
- desired output
- organism/reference
- paired-end vs single-end when FASTQs are involved
- any assay-specific design file or metadata required for the requested result
- runtime constraints: local/HPC/cloud, container availability, and whether installs are allowed

For human data, ask whether cloud upload is allowed before suggesting BaseSpace, Terra, DNAnexus, or any cloud path.

## Routing

Route to one leaf skill:

- BCL run folder or demultiplexing: `ngs-bcl-to-fastq`
- QC/trimming only: `ngs-fastq-qc`
- WGS/WES/panel variants: `ngs-dna-variant-calling`, then a subtype skill when the analysis model is clear
- germline WGS/WES/panel variants: `ngs-dna-germline-variants`
- tumor-normal or tumor-only somatic variants: `ngs-dna-somatic-variants`
- UMI, duplex, or low-frequency targeted panels: `ngs-dna-umi-panel-variants`
- bulk RNA-seq kickoff: `ngs-bulk-rnaseq`
- bulk RNA-seq FASTQ-to-count QC: `ngs-bulk-rnaseq-counts-qc`
- bulk RNA-seq differential expression from counts: `ngs-bulk-rnaseq-differential-expression`
- single-cell or single-nucleus FASTQ-to-matrix kickoff: `ngs-scrna-seq`
- single-cell or single-nucleus post-count QC/annotation/UMAP: `scrna-seq-qc`
- epigenomics kickoff: `ngs-epigenomics-peaks`
- ATAC-seq QC/peaks/accessibility: `ngs-atacseq-peaks-qc`
- ChIP-seq, CUT&RUN, or CUT&Tag QC/peaks: `ngs-chip-cutrun-peaks-qc`
- 16S/18S/ITS/COI amplicons: `ngs-amplicon-microbiome`
- shotgun metagenomics: `ngs-shotgun-metagenomics`
- runtime/package setup only: `ngs-runtime-env`

Prefer public, runtime-installable packages and nf-core workflows. Surface license/EULA/account boundaries before using proprietary or cloud tools.

## Preflight

Before proposing installation or execution, run a preflight plan from the repo root:

```bash
python plugins/ngs-analysis/scripts/ngs_preflight.py --pipeline <pipeline_key> --emit-install-plan
```

When the user needs an approval-ready install handoff, write persistent install artifacts:

```bash
python plugins/ngs-analysis/scripts/ngs_preflight.py --pipeline <pipeline_key> --manager micromamba --install-plan-outdir runtime_readiness/<pipeline_key>_install
```

Treat `install_plan.json` as the canonical review artifact. `install_commands.sh` is generated from the same plan and stays review-only unless the user explicitly approves execution with `NGS_RUN_INSTALL_COMMANDS=1`.

For reference- or database-heavy pipelines, also create a resource plan before saying the workflow is runnable:

```bash
python plugins/ngs-analysis/scripts/ngs_reference_manager.py plan --pipeline <pipeline_key> --genome-build <build> --outdir resource_readiness/<pipeline_key>
```

Use `--include-optional` for shotgun, amplicon, or motif-enabled epigenomics runs when optional databases materially affect the requested output.

Use `--network-checks` only when the user allows network checks. Use `--install-missing --yes` only when the user explicitly asks to install.

## Output Contract

Return:

1. the routed analysis type and confidence
2. missing essential parameters, if any
3. recommended public pipeline or package family
4. local tool preflight summary
5. preflight-first command or next concrete action
6. caveats around licenses, cloud upload, database size, and reference data
