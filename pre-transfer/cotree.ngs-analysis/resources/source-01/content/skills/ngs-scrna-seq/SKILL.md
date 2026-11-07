---
name: "import.codex.ngs-analysis.ngs-scrna-seq"
description: "Route single-cell or single-nucleus RNA-seq FASTQs to public count-generation workflows and defer post-count matrix QC, annotation, clustering, and UMAP analysis to the embedded scrna-seq-qc skill."
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

# Single-cell RNA-seq

Use this skill for scRNA-seq or snRNA-seq kickoff from FASTQs, Cell Ranger-style outputs, matrices, `.h5`, `.h5ad`, or `.rds`. This skill owns upstream intake and FASTQ-to-count routing; post-count QC, annotation, clustering, and UMAPs must route to the embedded `scrna-seq-qc` skill.

## Essential Inputs

Confirm:

- input type: FASTQ, count matrix, `.h5`, `.h5ad`, or `.rds`
- assay: single-cell or single-nucleus
- chemistry or barcode/UMI layout
- organism and reference
- expected cells per sample when available
- sample, donor, batch, and channel metadata
- desired endpoint: count matrix only, QC, clustering, annotation, UMAP, or differential abundance/expression

## Public Default

For FASTQs, prefer public alternatives:

- `nf-core/scrnaseq`
- STARsolo
- kallisto-bustools via `kb-python`
- alevin-fry

Use 10x Cell Ranger only when the user explicitly wants vendor-standard output and has accepted the 10x EULA.

## Implementation Sequence

Treat scRNA as three ordered rows in the plugin state and execute them sequentially:

1. FASTQ-to-count:
   count matrix generation, barcode and feature tables, chemistry or whitelist choice, and a backend summary.
2. Post-count QC and annotation:
   raw-count-preserving objects, QC metrics, threshold plots, doublet and ambient-RNA outputs, clustering, UMAPs, and annotation confidence.
3. Downstream stats:
   pseudobulk matrices, differential expression or abundance tables, and per-condition plots.

Cell Ranger is an optional backend when vendor-standard output is explicitly required. It is not a standalone roadmap row and it is not the default execution target.

For post-count QC/annotation, use the embedded `skills/scrna-seq-qc` guidance. Route to that skill whenever the requested endpoint starts from a matrix, `.h5`, `.h5ad`, `.rds`, Cell Ranger output, or asks for QC, doublets, ambient RNA, annotation, clustering, UMAPs, or post-count differential summaries.

## Preflight

```bash
python plugins/ngs-analysis/scripts/ngs_preflight.py --pipeline scrnaseq --emit-install-plan
```

## Kickoff Pattern

nf-core preflight run:

```bash
python plugins/ngs-analysis/scripts/run_nfcore_pipeline.py \
  --pipeline scrnaseq \
  --sample-sheet samplesheet.csv \
  --profile docker \
  --genome GRCh38 \
  --bundle-root grch38_core=/refs/GRCh38
```

This adapter captures the generated params, pinned Nextflow command, resource gate, trace/report paths, run manifest, and visualization index in the standard plugin envelope. Add `--revision <tag>` for pinned nf-core execution and `--execute` only when Nextflow plus a container/HPC profile are ready.

Plugin-owned local execution:

```bash
python plugins/ngs-analysis/scripts/run_scrnaseq_fastq_to_count.py \
  --sample-sheet samplesheet.csv \
  --genome-fasta reference/genome.fa \
  --annotation-gtf reference/genes.gtf \
  --cb-whitelist reference/whitelist.txt \
  --execute
```

The FASTQ-to-count runner emits advisory `resources/resource_plan.json`, `resource_manifest.tsv`, `resource_env.sh`, and `resource_readiness.md` outputs by default. Add `--genome-build`, `--bundle-root <bundle>=<path>`, and `--require-resource-plan` when STARsolo reference bundle completeness should block readiness.

Matrix-level QC should be handled by `scrna-seq-qc` and must preserve raw counts, per-sample metadata, filter decisions, doublet calls, ambient-RNA handling, and plot outputs.

## Guardrails

- Do not assume 10x chemistry from filenames alone.
- Do not silently skip doublet or ambient-RNA assessment when doing QC.
- Do not over-annotate clusters without matched references or clear markers.
