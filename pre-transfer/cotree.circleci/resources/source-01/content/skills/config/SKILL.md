---
name: "import.codex.circleci.circleci-config"
description: "Optimize CircleCI configuration for speed, reliability, and maintainability. Use when users ask to improve `.circleci/config.yml`, reduce CI runtime, tune caching/workspaces/parallelism, remove pipeline waste, or fix flaky pipeline behavior caused by configuration choices."
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

# CircleCI Config

## Overview

Use this skill to improve CircleCI performance and stability without changing product behavior. Focus on measured bottlenecks first, then implement the smallest safe config changes with clear validation criteria.

Read `references/cache-optimization.md` when the request involves `save_cache`, `restore_cache`, `persist_to_workspace`, `attach_workspace`, cache key design, dependency caching, lockfiles, or complaints about low cache hit rates, oversized caches, or wasted persistence steps.
Read `references/persisting-data.md` when the request involves choosing between caches, workspaces, and artifacts, or when data is being moved between jobs inefficiently.
Read `references/test-results-and-splitting.md` when the request involves slow test jobs, parallelism, flaky test visibility, missing JUnit XML, or `circleci tests run`.
Read `references/patterns.md` when the request involves approvals, branch/tag filters, schedules, deploy flow structure, or environment promotion patterns.

## Inputs To Gather

- `.yaml` and `.yml` files in `.circleci/` and any reusable config fragments
- Current pain points: duration, flakiness, cost, or maintainability
- Baseline metrics: slowest jobs, most frequent retries/failures, queue and run times
- Risk tolerance for structural changes

## Workflow

1. Build a baseline.
   - Identify top 1-3 longest jobs and top flaky jobs.
   - Capture before metrics (duration, pass rate, retries).
2. Remove pipeline waste.
   - Eliminate duplicate jobs/workflows.
   - Tighten branch/tag filters and workflow triggers.
3. Improve dependency and artifact flow.
   - Fix cache keys to include deterministic lockfile checks.
   - Use workspaces/artifacts to avoid rebuilding identical outputs.
   - Prefer cache scopes that are narrow, reproducible, and cheap to restore.
4. Apply safe parallelism.
   - Parallelize only proven bottlenecks.
   - Keep fan-out/fan-in readable and deterministic.
5. Validate impact.
   - Define expected metric changes and acceptance criteria before finalizing.

## Guardrails

- Prefer configuration fixes before proposing application code changes.
- Do not add blanket retries to hide deterministic failures.
- Preserve deployment safety gates while optimizing build/test stages.
- Keep changes incremental and easy to revert.
- Prefer language-specific cache directories over broad project snapshots.
- Avoid cache keys that rotate every run unless the user explicitly wants effectively write-only caches.

## Output Contract

Provide:

1. Baseline bottleneck summary.
2. Proposed or applied config changes with rationale.
3. Expected runtime/reliability impact.
4. Validation plan and rollback note.
