---
name: "import.codex.build-ios-apps.ios-debugger-agent"
description: "Build, run, and debug iOS apps on Simulator with XcodeBuildMCP. Use when launching an app, inspecting simulator UI or logs, or diagnosing runtime behavior."
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

# iOS Debugger Agent

## Overview
Use XcodeBuildMCP to build and run the current project scheme on a booted iOS simulator, interact with the UI, and capture logs. Prefer the MCP tools for simulator control, logs, and view inspection.

## Core Workflow
Follow this sequence unless the user asks for a narrower action.

### 1) Discover the booted simulator
- Call `mcp__XcodeBuildMCP__list_sims` and select the simulator with state `Booted`.
- If none are booted, ask the user to boot one (do not boot automatically unless asked).

### 2) Set session defaults
- Call `mcp__XcodeBuildMCP__session-set-defaults` with:
  - `projectPath` or `workspacePath` (whichever the repo uses)
  - `scheme` for the current app
  - `simulatorId` from the booted device
  - Optional: `configuration: "Debug"`, `useLatestOS: true`

### 3) Build + run (when requested)
- Call `mcp__XcodeBuildMCP__build_run_sim`.
- **If the build fails**, check the error output and retry (optionally with `preferXcodebuild: true`) or escalate to the user before attempting any UI interaction.
- **After a successful build**, verify the app launched by calling `mcp__XcodeBuildMCP__describe_ui` or `mcp__XcodeBuildMCP__screenshot` before proceeding to UI interaction.
- If the app is already built and only launch is requested, use `mcp__XcodeBuildMCP__launch_app_sim`.
- If bundle id is unknown:
  1) `mcp__XcodeBuildMCP__get_sim_app_path`
  2) `mcp__XcodeBuildMCP__get_app_bundle_id`

## UI Interaction & Debugging
Use these when asked to inspect or interact with the running app.

- **Describe UI**: `mcp__XcodeBuildMCP__describe_ui` before tapping or swiping.
- **Tap**: `mcp__XcodeBuildMCP__tap` (prefer `id` or `label`; use coordinates only if needed).
- **Type**: `mcp__XcodeBuildMCP__type_text` after focusing a field.
- **Gestures**: `mcp__XcodeBuildMCP__gesture` for common scrolls and edge swipes.
- **Screenshot**: `mcp__XcodeBuildMCP__screenshot` for visual confirmation.

## Logs & Console Output
- Start logs: `mcp__XcodeBuildMCP__start_sim_log_cap` with the app bundle id.
- Stop logs: `mcp__XcodeBuildMCP__stop_sim_log_cap` and summarize important lines.
- For console output, set `captureConsole: true` and relaunch if required.

## Troubleshooting
- If build fails, ask whether to retry with `preferXcodebuild: true`.
- If the wrong app launches, confirm the scheme and bundle id.
- If UI elements are not hittable, re-run `describe_ui` after layout changes.
