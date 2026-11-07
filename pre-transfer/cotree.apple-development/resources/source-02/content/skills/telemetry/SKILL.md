---
name: "import.codex.build-macos-apps.telemetry"
description: "Add and verify lightweight macOS runtime telemetry. Use when wiring Logger events or inspecting logs for windows, sidebars, menus, and actions."
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

# Telemetry

## Quick Start

Use this skill to add lightweight app instrumentation that helps debug behavior
without turning the codebase into a logging landfill. Prefer Apple's unified
logging APIs and verify the events after a build/run loop.

## Core Guidelines

- Prefer `Logger` from the `OSLog` framework for structured app logs.
- Give each feature a clear subsystem/category pair so runtime filtering stays easy.
- Log meaningful user and app lifecycle events: window opening, sidebar selection changes, menu commands, menu bar extra actions, sync/load milestones, and unexpected fallback paths.
- Keep info logs concise and stable. Use debug logs for noisy state details.
- Do not log secrets, auth tokens, personal data, or raw document contents.
- Add signposts only when measuring timing or performance spans; do not overinstrument by default.

## Minimal Logger Pattern

```swift
import OSLog

private let logger = Logger(
  subsystem: Bundle.main.bundleIdentifier ?? "SampleApp",
  category: "Sidebar"
)

@MainActor
func selectItem(_ item: SidebarItem) {
  logger.info("Selected sidebar item: \(item.id, privacy: .public)")
  selection = item.id
}
```

Use feature-specific categories like `Windowing`, `Commands`, `MenuBar`, `Sidebar`,
`Sync`, or `Import` so logs can be filtered quickly.

## Workflow

1. Identify the behavior that needs observability.
   - Window open/close
   - Sidebar or inspector selection changes
   - Menu or keyboard command actions
   - Menu bar extra actions
   - Background load/sync/import events
   - Error and recovery paths

2. Add the smallest useful instrumentation.
   - Create one `Logger` per feature area or type.
   - Log action boundaries and key state transitions.
   - Prefer one high-signal line per user action over noisy value dumps.

3. Build and run the app.
   - Use `build-run-debug` for the build/run loop.
   - If `script/build_and_run.sh` exists, prefer `./script/build_and_run.sh --telemetry` for live telemetry checks or `./script/build_and_run.sh --logs` for broader process logs.
   - Exercise the UI or command path that should emit telemetry.

4. Read runtime logs and verify the event fired.
   - Use Console.app with a process/subsystem filter when that is the fastest manual check.
   - Use `log stream --style compact --predicate 'process == "AppName"'` for live terminal verification.
   - Prefer tighter predicates when you know the subsystem/category:
     `log stream --style compact --predicate 'subsystem == "com.example.app" && category == "Sidebar"'`

5. Tighten or remove instrumentation.
   - If the event fires, keep only the logs that remain useful for future debugging.
   - If it does not fire, move the log closer to the suspected control path and rerun.

## Verification Checklist

- The app builds after telemetry changes.
- The relevant action emits exactly one clear log line or a small bounded sequence.
- The log can be filtered by process, subsystem, or category.
- No sensitive payloads are written to unified logs.
- Noisy temporary debug logs are removed or demoted before finishing.

## Guardrails

- Do not use `print` as the primary app telemetry mechanism for macOS app code.
- Do not leave a dense trail of permanent debug logs around every state mutation.
- Do not claim an event is wired correctly until you have a concrete verification path through Console, `log stream`, or captured process output.
- If the debugging task is mostly about crash/backtrace analysis rather than action telemetry, switch to `build-run-debug`.
