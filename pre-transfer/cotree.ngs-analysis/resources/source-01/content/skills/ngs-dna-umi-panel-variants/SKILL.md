---
name: "import.codex.ngs-analysis.ngs-dna-umi-panel-variants"
description: "Run or plan targeted DNA panel variant workflows that use UMIs, duplex consensus reads, molecular barcodes, low-frequency calling, target coverage, and panel-specific QC."
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

# UMI Panel DNA Variants

Use this skill for targeted DNA panels where molecular barcodes, UMIs, duplex consensus, or low-frequency allele detection are central to the analysis. If the panel is ordinary germline calling without molecular consensus, use `ngs-dna-germline-variants`.

## Essential Inputs

Confirm:

- panel/capture kit name and target BED
- UMI layout: inline read, index read, single UMI, duplex UMI, or unknown
- whether consensus reads have already been generated
- FASTQ/BAM input and pairing convention
- reference build and panel-specific annotation requirements
- minimum allele fraction goal and intended use: screening, research, validation, or exploratory
- positive/negative controls and expected spike-ins when available

## Route

Use a lab-validated panel workflow when provided. For public-tool planning, combine FASTQ QC, UMI extraction/consensus generation, alignment, target coverage QC, and variant calling as separate audited stages.

Preflight command:

```bash
python plugins/ngs-analysis/scripts/ngs_preflight.py --pipeline dna_umi_panel_variants --emit-install-plan
```

For compact local checks from prepared consensus or alignment BAM/CRAM files, use the dedicated UMI panel runner:

```bash
python plugins/ngs-analysis/scripts/run_dna_umi_panel_variants.py \
  --sample-sheet umi_panel_samples.tsv \
  --reference-fasta reference.fa \
  --target-bed panel_targets.bed \
  --umi-mode duplex \
  --umi-tag RX \
  --execute
```

This writes the consensus/variant command plan, molecular-consensus state, low-frequency calling settings, visualization index, `qc/umi_postrun_summary.{tsv,json}`, `qc/umi_molecular_evidence_contract.{tsv,json}`, and consensus-BAM VCF outputs when the local fgbio/samtools/bcftools backend is available. The post-run summary parses consensus flagstat, target coverage, bcftools stats, and family-size/duplex files when present; missing metrics stay explicit in the notes column. The molecular evidence contract keeps the low-AF review requirements visible per sample: consensus BAM, family-size or molecule-support metrics, variant stats, hotspot review, and duplex review.

The direct runner also emits `resources/resource_plan.json`, `resource_manifest.tsv`, `resource_env.sh`, and `resource_readiness.md`. The resource check is advisory by default so custom or reduced references can still be planned; add `--genome-build`, `--bundle-root <bundle>=<path>`, and `--require-resource-plan` when missing registered reference bundles should block readiness.

## Decision Points

- Do not trim or discard UMI bases until their layout and destination are known.
- Separate raw read depth from unique molecular depth and consensus depth.
- Track on-target rate, coverage uniformity, family size distribution, strand/duplex support, and per-target dropout.
- Low allele fraction calls require stronger artifact review than ordinary germline calls.
- Use panel-specific hotspot/blacklist rules only when their provenance is known.

## Outputs

Produce:

- UMI layout and consensus strategy
- target BED/resource manifest
- raw-depth, molecular-depth, and consensus-depth QC summary
- `qc/umi_postrun_summary.tsv` for consensus reads, target coverage, variant counts, family size, and duplex fraction
- `qc/umi_molecular_evidence_contract.tsv` for low-AF evidence readiness, hotspot review, and duplex review expectations
- variant calls with allele fraction, depth, strand/duplex support, and filtering rationale
- limitations around sensitivity, panel dropout, molecule count, and non-validated interpretation
