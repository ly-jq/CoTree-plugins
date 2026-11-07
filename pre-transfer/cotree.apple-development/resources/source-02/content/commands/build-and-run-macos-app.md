---
name: "import.codex.build-macos-apps.command.build-and-run-macos-app"
description: "Explicit build-macos-apps command: build-and-run-macos-app"
disable-model-invocation: true
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

Resource root: resolve `..` from this file's directory to locate `content/`. Replace `<plugin-resource-root>` with that actual directory before using a script; it is not a literal Shell path.

This former slash command is an explicitly requested Elyra Skill. Bind <user-supplied-arguments> / <user-argument-N> from the actual request; ask only for required missing values. There is no import-time Shell or automatic slash-command expansion.

## 工作内容

# /build-and-run-macos-app

Create or update the project-local macOS `build_and_run.sh` script, wire the
Codex app Run button, then use that script as the default build/run entrypoint.

## Arguments

- `scheme`: Xcode scheme name (optional)
- `workspace`: path to `.xcworkspace` (optional)
- `project`: path to `.xcodeproj` (optional)
- `product`: SwiftPM executable product name (optional)
- `mode`: `run`, `debug`, `logs`, `telemetry`, or `verify` (optional, default: `run`)
- `app_name`: process/app name to stop before relaunching (optional)

## Workflow

1. Detect whether the repo uses an Xcode workspace, Xcode project, or SwiftPM package.
2. If the workspace is not inside git yet, run `git init` at the project root so Codex app git-backed features unlock.
3. Create or update `script/build_and_run.sh` so it always stops the current app, builds the macOS target, and launches the fresh result.
4. For SwiftPM, keep raw executable launch only for true CLI tools; for AppKit/SwiftUI GUI apps, create a project-local `.app` bundle and launch it with `/usr/bin/open -n`.
5. Support optional script flags for `--debug`, `--logs`, `--telemetry`, and `--verify`.
6. Follow the canonical bootstrap contract in `../skills/build-run-debug/references/run-button-bootstrap.md` for the exact script shape and `.codex/environments/environment.toml` format.
7. Run the script in the requested mode and summarize any build, script, or launch failure.

## Guardrails

- Do not initialize a nested git repo inside an existing parent checkout.
- Do not leave stale `Run` actions pointing at old script paths.
- Keep the no-flag script path simple: kill, build, run.
- Use `--debug`, `--logs`, `--telemetry`, or `--verify` only when the user asks for those modes.
