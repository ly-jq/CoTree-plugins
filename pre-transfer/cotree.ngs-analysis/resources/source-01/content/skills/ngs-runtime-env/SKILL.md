---
name: "import.codex.ngs-analysis.ngs-runtime-env"
description: "Check whether public NGS tools and packages already exist before downloading, installing, or running a sequencing pipeline."
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

# NGS Runtime Environment

Use this skill whenever an NGS workflow needs package checks, install planning, or runtime validation.

## Existence Check Order

1. Check executables on `PATH` with `command -v` or `shutil.which`.
2. Check Python imports for Python-backed tools.
3. Check active package managers with `conda list`, `mamba list`, `micromamba list`, or `pip show`.
4. If requested, check package indexes or container registries.
5. Emit an install plan before installing.
6. Install only when explicitly requested by the user.

Do not modify system Python. Prefer isolated conda/mamba environments or containers.

## Script

From the repo root:

```bash
python plugins/ngs-analysis/scripts/ngs_preflight.py --list
python plugins/ngs-analysis/scripts/ngs_preflight.py --tool fastqc --emit-install-plan
python plugins/ngs-analysis/scripts/ngs_preflight.py --profile local_light --emit-install-plan
python plugins/ngs-analysis/scripts/ngs_preflight.py --pipeline dna_variant_calling --network-checks --emit-install-plan
python plugins/ngs-analysis/scripts/ngs_preflight.py --pipeline shotgun_metagenomics --manager micromamba --install-plan-outdir runtime_readiness/shotgun_install
```

Use `--install-plan-outdir` when a user needs a reviewable permission handoff. It writes `install_plan.json` as the canonical machine-readable plan and `install_commands.sh` as a guarded shell companion generated from the same plan. The shell companion is review-only by default; it exits without installing unless `NGS_RUN_INSTALL_COMMANDS=1` is set after explicit user approval.

Check reference and database bundle readiness separately from executable readiness:

```bash
python plugins/ngs-analysis/scripts/ngs_reference_manager.py list
python plugins/ngs-analysis/scripts/ngs_reference_manager.py check --kind reference --bundle grch38_core --root /refs/GRCh38
python plugins/ngs-analysis/scripts/ngs_reference_manager.py explain-missing --kind database --bundle kraken2_standard --root /db/kraken2/standard
python plugins/ngs-analysis/scripts/ngs_reference_manager.py plan --pipeline shotgun_metagenomics --include-optional --outdir resource_readiness/shotgun
python plugins/ngs-analysis/scripts/ngs_reference_manager.py setup-plan --pipeline shotgun_metagenomics --include-optional --outdir resource_readiness/shotgun_setup
python plugins/ngs-analysis/scripts/ngs_reference_manager.py plan --pipeline atacseq --genome-build GRCh38 --bundle-root grch38_core=/refs/GRCh38 --outdir resource_readiness/atac
python plugins/ngs-analysis/scripts/ngs_reference_manager.py inventory --outdir resource_readiness/inventory
python plugins/ngs-analysis/scripts/ngs_reference_manager.py lock --outdir resource_readiness/lock --include-checksums
python plugins/ngs-analysis/scripts/ngs_reference_manager.py verify-lock --lockfile resource_readiness/lock/resource_lock.json --outdir resource_readiness/lock_verify --fail-on-mismatch
python plugins/ngs-analysis/scripts/ngs_reference_manager.py check-all --kind database --output resource_readiness/database_audit.json
```

Use `plan` before claiming that a reference- or database-heavy workflow is runnable. The plan output writes `resource_plan.json`, `resource_manifest.tsv`, `resource_env.sh`, `resource_readiness.md`, and setup-plan artifacts; missing required bundles are blocking, while optional bundles such as Bracken/HUMAnN or HOMER motif resources should stay explicit.

Use `setup-plan` when the user needs an actionable resource/database setup checklist without running an assay. It writes `resource_setup_plan.json`, `resource_setup_plan.tsv`, `resource_setup_plan.md`, and `resource_setup_commands.sh`. The shell skeleton keeps setup hints commented by default, so large reference/database downloads remain deliberate and reviewable.

Use `inventory` when the user needs a broader resource/database audit across the plugin. It writes `resource_inventory.json`, `resource_inventory.tsv`, `resource_env.sh`, and `resource_dashboard.md`, including missing files, env vars, setup hints, license notes, and pipeline usage for every known bundle.

Use `lock` after resources are ready for a project or handoff. It snapshots the resource inventory into `resource_lock.json`, `resource_lock.tsv`, and `resource_lock.md`; `verify-lock` compares the lockfile against current local paths and writes a drift report before reruns.

The nf-core adapter performs the same resource gate automatically unless `--skip-resource-plan` is supplied:

```bash
python plugins/ngs-analysis/scripts/run_nfcore_pipeline.py --pipeline taxprofiler --sample-sheet samples.csv --profile docker --bundle-root kraken2_standard=/db/kraken2/standard --include-optional-resources
```

The direct bulk RNA-seq counts/QC, scRNA FASTQ-to-count, generic DNA, germline DNA, somatic DNA, UMI panel, ATAC, ChIP/CUT&RUN, amplicon, and shotgun backend runners also emit run-local `resources/` readiness bundles. These direct runners use advisory resource checks by default so custom or reduced local inputs can still be planned; add `--require-resource-plan` when missing registered bundles should block readiness.

Use `--install-missing --yes` only after explicit user approval:

```bash
python plugins/ngs-analysis/scripts/ngs_preflight.py --pipeline fastq_qc --manager mamba --install-missing --yes
```

## Install Strategy

Prefer these patterns:

- nf-core workflows: install/check `nextflow`; use Docker/Singularity/Apptainer profiles for process tools.
- local execution: install/check `snakemake`; use `mamba` or `micromamba` environments and avoid containers by default.
- small QC tools: install with `mamba` or `micromamba` from `conda-forge` and `bioconda`.
- Python analysis packages: install in a dedicated environment, not global Python.
- large databases and references: estimate size and check existing paths before downloading.
- pipeline resource plans: use `--bundle-root bundle=/path` or the registry `root_env` variables so downstream runs can cite the exact local bundle roots.

## Report

Summarize:

- present tools and paths
- missing tools
- package-index checks, if performed
- suggested install commands
- tools that are proprietary, EULA-bound, cloud-bound, or database-heavy
