---
name: "import.codex.ngs-analysis.ngs-dna-variant-calling"
description: "Dispatch WGS, WES, or targeted DNA variant requests to germline, somatic, or UMI-panel skills, then plan public nf-core/sarek, GATK4, DeepVariant, samtools, or bcftools workflows."
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

# DNA Variant Calling

Use this skill as the DNA variant-calling dispatcher for WGS, WES, or targeted DNA panel analysis from FASTQ, BAM, or CRAM. Once the sample model is clear, hand off to the narrow subtype skill.

## Essential Inputs

Confirm:

- data type: WGS, WES, or panel
- sample model: germline single sample, cohort, trio, tumor-only, or tumor-normal
- input type: FASTQ, BAM, or CRAM
- organism and reference genome
- known-sites resources for BQSR, if required
- target BED for WES or panels
- UMI or duplex handling
- desired callers and annotation outputs

## Dispatch

Route by biological/sample model:

- Germline singleton, cohort, family, trio, WGS, WES, or ordinary inherited panel: `ngs-dna-germline-variants`
- Tumor-normal, tumor-only, relapse-baseline, or other cancer somatic calling: `ngs-dna-somatic-variants`
- UMI, duplex, molecular-barcode, or low-frequency targeted panel calling: `ngs-dna-umi-panel-variants`

If the request is ambiguous, ask only for the missing sample model and assay design needed to choose among these three. Do not run one generic variant workflow when the request needs subtype-specific assumptions.

## Public Default

Prefer `nf-core/sarek` for an end-to-end public workflow. Use direct GATK4, DeepVariant, samtools, or bcftools commands only for smaller, focused tasks or when the user explicitly wants a custom pipeline.

## Preflight

```bash
python plugins/ngs-analysis/scripts/ngs_preflight.py --pipeline dna_variant_calling --emit-install-plan
```

## Local Execution Package

For a compact BAM/CRAM-to-VCF run with a matching reference FASTA, use the plugin-owned samtools/bcftools runner:

```bash
python plugins/ngs-analysis/scripts/run_dna_variant_calling.py \
  --sample-sheet dna_samples.tsv \
  --reference-fasta reference.fa \
  --region chr20:1-100000 \
  --filter-min-qual 30 \
  --filter-min-site-dp 10 \
  --execute
```

The sample sheet should include `sample` and `bam` or `cram` columns. When `--region` is provided the runner also emits per-base depth plus a callable-loci summary for that interval, and when filter thresholds are provided it emits a soft-filtered VCF alongside the raw calls. This package is suitable for focused local checks and run-envelope generation; subtype skills still own germline, somatic, UMI, reference-resource, cohort, annotation, and workflow assumptions.

This compact runner now writes advisory `resources/resource_plan.json`, `resource_manifest.tsv`, `resource_env.sh`, and `resource_readiness.md` artifacts for the selected genome bundle. Use `--require-resource-plan` when missing registered reference resources should block readiness; otherwise the explicit `--reference-fasta` remains enough for focused local checks.

## Kickoff Pattern

Preflight-first nf-core pattern:

```bash
nextflow run nf-core/sarek \
  -profile test,docker \
  --outdir results/sarek_test
```

Real run skeleton:

```bash
nextflow run nf-core/sarek \
  -profile docker \
  --input samplesheet.csv \
  --outdir results/sarek \
  --genome GRCh38 \
  --tools haplotypecaller,vep
```

For WES/panel data, include the target BED. For tumor-normal data, verify pair metadata before execution. For UMI panels, preserve barcode handling and molecule-level QC.

## Guardrails

- Do not mix genome builds across FASTA, GTF/BED, known sites, and VEP cache.
- Do not download large references without confirming disk space and target path.
- Treat clinical interpretation as out of scope unless the user has a validated clinical workflow.
