# NGS测序分析 能力与来源

原始内容、图标、许可和版本证据完整保留，只有根 plugin.json 注册的入口加载。人工归并表供主模型导航，不是运行时路由。

| CoTree 入口 | 完整来源技能 |
|---|---|
| plan | [ngs-analysis-router](../resources/source-01/content/skills/ngs-analysis-router/SKILL.md)、[ngs-runtime-env](../resources/source-01/content/skills/ngs-runtime-env/SKILL.md) |
| demultiplex | [ngs-bcl-to-fastq](../resources/source-01/content/skills/ngs-bcl-to-fastq/SKILL.md) |
| fastq | [ngs-fastq-qc](../resources/source-01/content/skills/ngs-fastq-qc/SKILL.md) |
| bulk-counts | [ngs-bulk-rnaseq](../resources/source-01/content/skills/ngs-bulk-rnaseq/SKILL.md)、[ngs-bulk-rnaseq-counts-qc](../resources/source-01/content/skills/ngs-bulk-rnaseq-counts-qc/SKILL.md) |
| differential-expression | [ngs-bulk-rnaseq-differential-expression](../resources/source-01/content/skills/ngs-bulk-rnaseq-differential-expression/SKILL.md) |
| single-cell | [ngs-scrna-seq](../resources/source-01/content/skills/ngs-scrna-seq/SKILL.md)、[scrna-seq-qc](../resources/source-01/content/skills/scrna-seq-qc/SKILL.md) |
| germline | [ngs-dna-variant-calling](../resources/source-01/content/skills/ngs-dna-variant-calling/SKILL.md)、[ngs-dna-germline-variants](../resources/source-01/content/skills/ngs-dna-germline-variants/SKILL.md) |
| somatic | [ngs-dna-somatic-variants](../resources/source-01/content/skills/ngs-dna-somatic-variants/SKILL.md) |
| umi | [ngs-dna-umi-panel-variants](../resources/source-01/content/skills/ngs-dna-umi-panel-variants/SKILL.md) |
| atac | [ngs-epigenomics-peaks](../resources/source-01/content/skills/ngs-epigenomics-peaks/SKILL.md)、[ngs-atacseq-peaks-qc](../resources/source-01/content/skills/ngs-atacseq-peaks-qc/SKILL.md) |
| chip-cutrun | [ngs-chip-cutrun-peaks-qc](../resources/source-01/content/skills/ngs-chip-cutrun-peaks-qc/SKILL.md) |
| amplicon | [ngs-amplicon-microbiome](../resources/source-01/content/skills/ngs-amplicon-microbiome/SKILL.md) |
| metagenomics | [ngs-shotgun-metagenomics](../resources/source-01/content/skills/ngs-shotgun-metagenomics/SKILL.md) |

18个来源技能归并为13个入口；保留全部23份Python脚本和6份注册表/合同资料，原生runtime保留相邻导入路径。dispatcher能力合入对应生物分析入口，来源安装与执行策略按CoTree权限处理。
