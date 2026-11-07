---
name: "import.codex.ngs-analysis.ngs-dna-somatic-variants"
description: "Run or plan tumor-normal, tumor-only, WGS, WES, or cancer-panel somatic variant workflows with pairing, contamination, panel-of-normals, purity, QC, and annotation checks."
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

# Somatic DNA Variants

Use this skill for tumor-normal or tumor-only somatic SNV/indel calling from FASTQ, BAM, or CRAM. If the request is inherited germline calling or family analysis, use `ngs-dna-germline-variants`.

## Essential Inputs

Confirm:

- tumor-normal, tumor-only, relapse-baseline, or multi-tumor design
- WGS, WES, or panel assay and target BED when applicable
- input type and whether reads are already aligned
- tumor/normal pairing table and sample identifiers
- reference build, known-sites, germline resource, and annotation cache
- panel-of-normals availability and matched-normal availability
- tumor purity, contamination expectations, and minimum allele fraction goals
- desired outputs: raw calls, filtered calls, VEP/SnpEff annotation, MAF, CNV/SV handoff

## Route

Prefer `nf-core/sarek` for an end-to-end public workflow when its supported callers fit the request. Use direct GATK Mutect2 or bcftools/samtools utilities for focused validation or prepared BAMs.

Preflight command:

```bash
python plugins/ngs-analysis/scripts/ngs_preflight.py --pipeline dna_somatic_variants --emit-install-plan
```

For compact local checks from prepared tumor/normal BAM/CRAM files, use the dedicated Mutect2 runner:

```bash
python plugins/ngs-analysis/scripts/run_dna_somatic_variants.py \
  --sample-sheet somatic_pairs.tsv \
  --reference-fasta reference.fa \
  --germline-resource af-only-gnomad.vcf.gz \
  --panel-of-normals pon.vcf.gz \
  --execute
```

This produces a tumor-normal/tumor-only pairing table, Mutect2 command plan, contamination/filtering artifacts, somatic QC summary, `qc/somatic_pair_review.{tsv,json}`, visualization index, and filtered VCF outputs when the local GATK resources are available. For nf-core execution, use `plugins/ngs-analysis/scripts/run_nfcore_pipeline.py --pipeline sarek`.

The direct runner also emits `resources/resource_plan.json`, `resource_manifest.tsv`, `resource_env.sh`, and `resource_readiness.md`. The resource check is advisory by default so custom or reduced references can still be planned; add `--genome-build`, `--bundle-root <bundle>=<path>`, and `--require-resource-plan` when missing registered reference bundles should block readiness.

## Decision Points

- Verify tumor-normal pair metadata before execution. A swapped or missing normal changes the biological meaning of the calls.
- For tumor-only analysis, explicitly state the false-positive risk and require a germline resource plus careful filtering.
- Use panel-of-normals when available and reference-matched; do not reuse a PON across incompatible capture kits or genome builds.
- Track contamination, orientation bias, strand artifacts, mapping quality, coverage, tumor purity, and allele-fraction filters.
- Keep germline filtering separate from somatic interpretation; avoid presenting tumor-only calls as confirmed somatic without supporting evidence.

## Outputs

Produce:

- validated pairing/sample sheet
- caller/filter settings and reference/resource manifest
- QC summary: tumor/normal depth, contamination, duplication, insert size, on-target rate for panels/WES
- per-pair review table covering matched-normal state, PON/germline-resource availability, contamination-table status, filtered VCF status, and parsed variant counts
- VCF/MAF/annotation paths and a filtered-vs-raw call count summary
- caveats for tumor-only calls, low-purity tumors, low-depth regions, or missing matched normals

Clinical actionability and treatment recommendations are out of scope unless the user supplies a validated clinical interpretation workflow.
