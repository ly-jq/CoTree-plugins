---
name: "import.codex.build-ios-apps.ios-memgraph-leaks"
description: "Capture and inspect iOS leaks and memgraphs. Use when debugging leaked objects, retain cycles, memory growth, or before/after leak evidence."
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

# iOS Memgraph Leaks

Use this skill to prove iOS leaks from a live simulator process or an existing `.memgraph`. Pair it with `../ios-debugger-agent/SKILL.md` when the task also needs simulator build, install, launch, UI driving, logs, or screenshots.

## Core Workflow

1. Build, launch, and drive the exact flow that should release objects.
2. Capture a memgraph from the running simulator process with `scripts/capture_sim_memgraph.sh`.
3. Summarize leaks with `scripts/summarize_memgraph_leaks.py`.
4. For each app-owned leaked type, inspect ownership with `leaks --traceTree=<address> <file.memgraph>` and grouped leak evidence.
5. Make the smallest root-cause patch, then recapture the same flow on the same simulator when possible.
6. Report proof: before/after leak counts, disappeared root types, remaining leaks, memgraph paths, and test/build results.

Do not claim a leak fix from a smaller memgraph alone. A credible fix explains the ownership path that kept the object alive and shows that the same path or type disappears after the patch.

## Capture

Prefer capturing from the simulator already used for the reproduction. Resolve the simulator UDID and app bundle identifier, then capture the running app:

```bash
SKILL_DIR="<absolute path to this loaded skill folder>"
SIM="<simulator-udid>"
BUNDLE_ID="<app.bundle.identifier>"
MEMGRAPH_DIR="$(mktemp -d "${TMPDIR:-/tmp}/codex-ios-memgraph.XXXXXX")"

"$SKILL_DIR/scripts/capture_sim_memgraph.sh" \
  --udid "$SIM" \
  --bundle-id "$BUNDLE_ID" \
  --out-dir "$MEMGRAPH_DIR"
```

Do not derive `SKILL_DIR` from the target app repo's `pwd`; installed plugins usually live outside the app being debugged. Store captures in a run-specific temp or user-chosen folder, not under `SKILL_DIR`.

If the process cannot be found, confirm the bundle identifier and use `xcrun simctl spawn "$SIM" launchctl list` to inspect running labels.

## Summarize

Summarize an existing memgraph:

```bash
"$SKILL_DIR/scripts/summarize_memgraph_leaks.py" \
  /path/to/app.memgraph \
  --trace-limit 5 \
  --out /path/to/leak-summary.md
```

Use `--trace-limit` sparingly. Trace trees are useful root-cause evidence, but large memgraphs can produce noisy output. If a trace tree says `Found 0 roots referencing`, treat it as an unreachable/self-retained leak candidate and use the summary's grouped leak tree or `leaks --groupByType <file.memgraph>` to identify the retained fields and payload chain.

## Root Cause Rules

- Identify the first app-owned leaked type in the leak output or trace.
- Determine the intended lifetime: process, session, account, view, request, or task.
- Treat lazy or deferred allocation as a scope reduction, not a leak fix, unless the original eager allocation itself violated the intended lifetime.
- Prove retain-cycle claims with either a `traceTree` ownership path or an isolated reproduction.
- For unreachable/self-cycle leaks, `traceTree` may have no root path; use `leaks --groupByType` plus source verification to find the self-retaining edge.
- Do not claim success just because total leak count went down; prove the specific type or path disappeared.
- Separate real root-cause branches from candidate/noise branches.
- Prefer deleting the retaining edge over adding broad cleanup code.

## Report

A useful leak report includes:

- the exact flow and simulator/app build
- the memgraph and summary paths
- app-owned leaked types and counts
- at least one ownership path, or grouped leak tree evidence when the object is unreachable from roots
- the smallest proposed or applied retaining-edge fix
- before/after evidence when a fix was made

If the memgraph shows only framework/runtime noise, say that and recommend the next narrower capture rather than inventing an app leak.
