# NGS 运行与平台边界

运行目录：runtime/scripts；配套registry和schema位于runtime/references。完整29份源码/资料经过显式复制或补丁，来源和适配SHA见provenance/adapted-resources.json。移除隐藏.env自动加载，包身份改读CoTree plugin.json；FastQC缺字段和样本ID拒绝虚构，UMI/注释缺证据给出原因与下一步。链方向仅接受forward/reverse/unstranded或显式auto；缺失或不支持的值报错。UMI必须显式提供--umi-mode single/duplex；duplex仅接受已存在且由独立流程验证的consensus BAM，本runner不生成duplex consensus，不会把它当single执行。原脚本仍完整归档。

Python 3.10+准备入口：

- python runtime/scripts/ngs_preflight.py --list
- python runtime/scripts/ngs_preflight.py --pipeline bulk_rnaseq --emit-install-plan（先用--list核实实际registry键）
- python runtime/scripts/run_fastq_qc.py --sample sample-a --r1 绝对路径/R1.fastq --r2 绝对路径/R2.fastq --outdir 全新目录 --no-dry-run --quick-validation --pair-check-reads 100

预检不会默认安装；--network-checks、--install-missing --yes属于额外操作，使用现有明确授权。生产工具PATH和环境由调用方提供，不读取.ngs-analysis-local.env。只准备FASTQ使用--no-dry-run；默认dry-run会调用Snakemake，并非纯静态检查。只有所选runner支持且用户任务授权执行时才传--execute；所有runner先核对--help。记录工具版本、reference/database checksum、独立run目录、manifest与真实产物，不改用户原始数据。

[Nextflow官方安装合同](https://docs.seqera.io/nextflow/install)说明POSIX或Windows WSL环境及Java/Bash依赖，2026-10-14核对。源registry和shell脚本不能当作原生Windows全流程支持。完整nf-core/原生工具在Linux/macOS/WSL或授权计算环境执行；R/Bioconductor、Scanpy/AnnData、GATK、STAR、Salmon、QIIME2等按所选路线安装到独立环境并核对版本。不要执行未经检查的安装片段。

来源runner成熟度不一：某些assay只准备QC/后端资源或生成命令，特别是微生物分类、表观组峰调用和缺依赖的执行路线。process exit、manifest状态和科学目标分别判断；inspect execution、commands、logs与artifact index后报告实际完成到哪一步。PBMC marker回退不证明其他组织注释，单个细胞不是独立生物重复。

本批在Windows验证stdlib预检、合成FASTQ及负例、源码编译与包身份；没有安装大型reference/database，也没有真实样本、全套生信依赖、WSL/HPC/云账户或端到端科学结果验收。云/受控数据、商业拆样软件许可另登记认证HTML；本地公开工具不强制云账户。
