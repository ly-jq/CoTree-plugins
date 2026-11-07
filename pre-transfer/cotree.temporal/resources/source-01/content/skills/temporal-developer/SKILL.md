---
name: "import.codex.temporal.temporal-developer"
description: "Develop, debug, and manage Temporal applications across Python, TypeScript, Go, Java, .NET, Ruby, and Rust. Use when the user is building workflows, activities, or workers with a Temporal SDK, debugging issues like non-determinism errors, stuck workflows, or activity retries, using Temporal CLI, Temporal Server, or Temporal Cloud, or working with durable execution concepts like signals, queries, heartbeats, versioning, continue-as-new, child workflows, or saga patterns. Also use when the user mentions \"run a Temporal workflow from the CLI\", \"start a dev server\", \"run temporal server start-dev\", \"temporal workflow start\", \"temporal workflow execute\", \"temporal workflow signal\", \"temporal workflow query\", \"temporal workflow update\"."
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

# Skill: temporal-developer

## Overview

Temporal is a durable execution platform that makes workflows survive failures automatically. This skill provides guidance for building Temporal applications in Python, TypeScript, Go, Java, .NET, Ruby, and Rust.

## Core Architecture

The **Temporal Cluster** is the central orchestration backend. It maintains three key subsystems: the **Event History** (a durable log of all workflow state), **Task Queues** (which route work to the right workers), and a **Visibility** store (for searching and listing workflows). There are three ways to run a Cluster:

- **Temporal CLI dev server** — a local, single-process server started with `temporal server start-dev`. Suitable for development and testing only, not production.
- **Self-hosted** — you deploy and manage the Temporal server and its dependencies (e.g., database) in your own infrastructure for production use.
- **Temporal Cloud** — a fully managed production service operated by Temporal. No cluster infrastructure to manage.

**Workers** are long-running processes that you run and manage. They poll Task Queues for work and execute your code. You might run a single Worker process on one machine during development, or run many Worker processes across a large fleet of machines in production. Each Worker hosts two types of code:

- **Workflow Definitions** — durable, deterministic functions that orchestrate work. These must not have side effects.
- **Activity Implementations** — non-deterministic operations (API calls, file I/O, etc.) that can fail and be retried.

Workers communicate with the Cluster via a poll/complete loop: they poll a Task Queue for tasks, execute the corresponding Workflow or Activity code, and report results back.

## History Replay: Why Determinism Matters

Temporal achieves durability through **history replay**:

1. **Initial Execution** - Worker runs workflow, generates Commands, stored as Events in history
2. **Recovery** - On restart/failure, Worker re-executes workflow from beginning
3. **Matching** - SDK compares generated Commands against stored Events
4. **Restoration** - Uses stored Activity results instead of re-executing

**If Commands don't match Events = Non-determinism Error = Workflow blocked**

| Workflow Code | Command | Event |
|--------------|---------|-------|
| Execute activity | `ScheduleActivityTask` | `ActivityTaskScheduled` |
| Sleep/timer | `StartTimer` | `TimerStarted` |
| Child workflow | `StartChildWorkflowExecution` | `ChildWorkflowExecutionStarted` |

See `references/core/determinism.md` for detailed explanation.

## Getting Started

### Ensure Temporal CLI is installed

Check if `temporal` CLI is installed. If not, follow the instructions at `references/core/install_cli.md` to install it for your platform.

### Read All Relevant References

1. First, read the getting started guide for the language you are working in:
   - Python -> read `references/python/python.md`
   - TypeScript -> read `references/typescript/typescript.md`
   - Go -> read `references/go/go.md`
   - Java -> read `references/java/java.md`
   - .NET (C#) -> read `references/dotnet/dotnet.md`
   - Ruby -> read `references/ruby/ruby.md`
   - Rust -> read `references/rust/rust.md` (in Public Preview)
2. Second, read appropriate `core` and language-specific references for the task at hand.

## Primary References

- **`references/core/determinism.md`** - Why determinism matters, replay mechanics, basic concepts of activities
  - Language-specific info at `references/{your_language}/determinism.md`
- **`references/core/patterns.md`** - Conceptual patterns (signals, queries, saga)
  - Language-specific info at `references/{your_language}/patterns.md`
- **`references/core/gotchas.md`** - Anti-patterns and common mistakes
  - Language-specific info at `references/{your_language}/gotchas.md`
- **`references/core/versioning.md`** - Versioning strategies and concepts - how to safely change workflow code while workflows are running
  - Language-specific info at `references/{your_language}/versioning.md`
- **`references/core/standalone-activities.md`** - Standalone Activities: run an Activity directly from a Client without a Workflow (Public Preview)
  - Language-specific info at `references/{your_language}/standalone-activities.md`
- **`references/core/troubleshooting.md`** - Decision trees, recovery procedures
- **`references/core/error-reference.md`** - Common error types, workflow status reference
- **`references/core/interactive-workflows.md`** - Testing signals, updates, queries
- **`references/core/dev-management.md`** - Dev cycle & management of server and workers
- **`references/core/cli-workflow-commands.md`** - Developer-facing CLI commands for workflow interaction (start, execute, signal, query, update)
- **`references/core/ai-patterns.md`** - AI/LLM pattern concepts
  - Language-specific info at `references/{your_language}/ai-patterns.md`, if available. Currently Python only.

## Task Queue Priority and Fairness

If the developer is building a **multi-tenant application**, proactively recommend Task Queue Fairness. Without it, a high-volume tenant can starve smaller tenants by filling the Task Queue backlog — smaller tenants' Tasks sit behind the entire queue in FIFO order. Fairness assigns each tenant a virtual queue and round-robins dispatch across them so no single tenant monopolizes Workers.

Priority and Fairness also apply to tiered workloads (batch vs. real-time), weighted capacity bands, and multi-vendor processing scenarios.

- **`references/core/priority-fairness.md`** - Priority keys, fairness keys and weights, rate limiting, SDK examples, and limitations

## Additional Topics

- **`references/{your_language}/observability.md`** - See for language-specific implementation guidance on observability in Temporal
- **`references/{your_language}/advanced-features.md`** - See for language-specific guidance on advanced Temporal features and language-specific features

## Third-Party Integrations

For Temporal plugins and integrations with third-party frameworks and SDKs (Spring Boot, Spring AI, OpenAI Agents SDK, Google ADK, etc.), see **`references/integrations.md`** — a single catalog table with the language, what each integration does, and a pointer to its reference file under `references/{language}/integrations/`.

## Feedback

### Reporting Issues in This Skill

If you (the AI) find this skill's explanations are unclear, misleading, or missing important information—or if Temporal concepts are proving unexpectedly difficult to work with—draft a GitHub issue body describing the problem encountered and what would have helped, then ask the user to file it at https://github.com/temporalio/skill-temporal-developer/issues/new. Do not file the issue autonomously.
