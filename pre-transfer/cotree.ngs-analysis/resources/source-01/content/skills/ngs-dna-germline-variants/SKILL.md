---
name: "import.codex.ngs-analysis.ngs-dna-germline-variants"
description: "Run or plan deep germline WGS, WES, targeted-panel, cohort, or trio variant-calling workflows with reference-build, known-sites, QC, joint-calling, and annotation checks."
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

# Germline DNA Variants

Use this skill for germline WGS, WES, or inherited-disease panel analysis from FASTQ, BAM, or CRAM. If the request is tumor-only, tumor-normal, or low-frequency molecular-barcode panel calling, use a somatic or UMI-panel skill instead.

## Essential Inputs

Confirm:

- data type: WGS, WES, or targeted panel
- sample model: singleton, cohort, duo, trio, family, or case/control
- input type: FASTQ, BAM, or CRAM
- organism, reference build, FASTA, indexes, and contig naming
- known-sites resources for BQSR, contamination, and annotation
- target BED and bait BED for WES/panel data
- sex/ploidy assumptions and mitochondrial/sex-chromosome requirements
- desired callers, annotation outputs, and final VCF/gVCF expectations

## Route

Prefer `nf-core/sarek` for full FASTQ/BAM-to-VCF workflows. Use direct GATK4, DeepVariant, samtools, or bcftools only for focused tasks or a custom workflow.

Preflight command:

```bash
python plugins/ngs-analysis/scripts/ngs_preflight.py --pipeline dna_germline_variants --emit-install-plan
```

For compact local checks from prepared BAM/CRAM files, use the shared DNA execution package:

```bash
python plugins/ngs-analysis/scripts/run_dna_variant_calling.py \
  --sample-sheet dna_samples.tsv \
  --reference-fasta reference.fa \
  --execute
```

Treat this as a focused samtools/bcftools run envelope, not as a substitute for full cohort, trio, gVCF, BQSR, or annotation workflows.

For a higher-fidelity local germline run that owns BQSR, per-sample gVCFs, and joint genotyping assumptions, use the germline-specific runner:

```bash
python plugins/ngs-analysis/scripts/run_dna_germline_variants.py \
  --sample-sheet dna_samples.tsv \
  --reference-fasta reference.fa \
  --known-sites dbsnp.vcf.gz \
  --known-sites mills.vcf.gz \
  --emit-gvcf \
  --joint-call \
  --execute
```

This runner still expects reference-matched resources and an available GATK toolchain. It packages the validation state and generated artifacts even when execution is blocked by missing tools or resources.

It also writes advisory `resources/resource_plan.json`, `resource_manifest.tsv`, `resource_env.sh`, and `resource_readiness.md` artifacts by default. Add `--genome-build`, `--bundle-root <bundle>=<path>`, and `--require-resource-plan` when complete registered reference and known-sites bundles should be mandatory for readiness.

## Decision Points

- For cohorts or families, decide whether the endpoint is per-sample VCFs, gVCFs for joint genotyping, or a jointly called cohort VCF.
- For WES/panels, carry the target BED through alignment metrics, calling, and coverage reports; do not call off-target regions by accident.
- Use BQSR only when reference-matched known-sites resources exist. Do not mix GRCh37, hg19, GRCh38, or T2T resources.
- Check sample identity, sex concordance, contamination, coverage, duplication, insert size, and transition/transversion where feasible.
- For trios, preserve pedigree metadata and report Mendelian/QC checks separately from variant interpretation.

## Outputs

Produce:

- command or workflow profile and sample sheet
- reference/resource manifest with versions and checksums when available
- QC summary: coverage, duplication, insert size, contamination, sex/relatedness checks when run
- VCF/gVCF path, index path, and annotation path
- limitations: low coverage, missing known-sites, target design gaps, or build mismatches

Clinical interpretation, pathogenicity classification, and report signing are out of scope unless the user provides a validated clinical workflow.
