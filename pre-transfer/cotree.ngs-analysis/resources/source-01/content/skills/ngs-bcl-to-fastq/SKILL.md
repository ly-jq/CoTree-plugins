---
name: "import.codex.ngs-analysis.ngs-bcl-to-fastq"
description: "Validate Illumina BCL run folders and sample sheets, plan demultiplexing, review index/UMI/lane choices, run BCL-to-FASTQ conversion, and interpret demux metrics while surfacing license/download boundaries."
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

# BCL To FASTQ

Use this skill when the input is an Illumina BCL run folder or the user asks to demultiplex a sequencing run. This is a deep demultiplexing and run-validation skill, not only a command wrapper.

## Essential Inputs

Confirm:

- run folder path with `RunInfo.xml`
- sample sheet path and format
- output directory
- instrument/run metadata from `RunInfo.xml` and `RunParameters.xml`
- lane handling: split by lane or combine lanes
- index mismatch tolerance
- index read structure and dual-index orientation
- UMI layout, if any
- whether adapter trimming/masking should happen during conversion
- whether undetermined reads and demultiplexing metrics should be reviewed before downstream analysis

## Public Tool Boundary

Prefer `bcl-convert` if it is already installed. It is free for local use but proprietary and RPM-distributed by Illumina, so do not auto-download without explicit user approval.

Legacy `bcl2fastq` may exist in older environments. Use it only when BCL Convert is unavailable or the run requires legacy compatibility.

## Preflight

```bash
python plugins/ngs-analysis/scripts/ngs_preflight.py --pipeline bcl_to_fastq --emit-install-plan
```

Also check run-folder structure:

```bash
test -f /path/to/run/RunInfo.xml
test -f /path/to/SampleSheet.csv
find /path/to/run -maxdepth 4 -type d -name BaseCalls
```

## Local Execution Package

Use the plugin-owned runner when the user provides a local run folder and sample sheet:

```bash
python plugins/ngs-analysis/scripts/run_bcl_to_fastq.py \
  --run-folder /path/to/run \
  --sample-sheet /path/to/SampleSheet.csv \
  --output-directory /path/to/fastq_out
```

Add `--execute` only when conversion is requested. The runner validates `RunInfo.xml`, optional `RunParameters.xml`, the BaseCalls directory, sample-sheet rows, duplicate lane/index combinations, and index length compatibility. With `--execute`, it uses installed `bcl-convert`, then legacy `bcl2fastq` if available; if neither exists, it records the blocker instead of downloading proprietary software.

## Validation Checklist

Before conversion, validate:

- `RunInfo.xml` exists and its read structure matches the expected sequencing design.
- `SampleSheet.csv` exists, is the intended version, and has no duplicate sample/index combinations within each lane.
- Index sequence lengths match the index reads and any trimming/masking requested by the sample sheet.
- Dual-index orientation is explicit for the instrument and library prep; do not infer i5 orientation from filenames.
- UMI bases are assigned to the intended read or index read and carried through to FASTQ headers or output metadata as needed.
- Lane-splitting, sample-name normalization, and output directory behavior are agreed before running.
- Disk space is sufficient for output FASTQs, reports, and temporary files.

## Kickoff Pattern

First produce a preflight plan with paths and sample sheet validation. Then run conversion only after the user confirms:

```bash
bcl-convert \
  --bcl-input-directory /path/to/run \
  --output-directory /path/to/fastq_out \
  --sample-sheet /path/to/SampleSheet.csv
```

## Metrics Review

After conversion, inspect and report:

- total clusters, clusters passing filter, and yield by lane
- percent assigned by sample and percent undetermined by lane
- top undetermined index sequences when available
- per-sample FASTQ counts and read-pair consistency
- unexpected index hopping, barcode collision, or sample-sheet mismatch signals

Record software version, command, sample sheet checksum, run-folder path, output path, and conversion metrics. Do not start downstream analysis until severe demultiplexing anomalies are surfaced.
