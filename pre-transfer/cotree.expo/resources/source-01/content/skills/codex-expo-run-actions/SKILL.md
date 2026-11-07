---
name: "import.codex.expo.codex-expo-run-actions"
description: "Wire Expo projects into the Codex app with project-local run scripts and .codex/environments/environment.toml actions. Use when the user wants the Codex app Run button, build/run actions, action buttons, or a stable Expo start/run workflow from Codex."
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

# Codex Run Actions for Expo

Use this skill to connect an Expo project to the Codex app action bar.

The goal is one project-local script plus `.codex/environments/environment.toml`,
so the user can press `Run` in the Codex app and see the Expo CLI / Metro logs in
an action terminal.

## Workflow

1. Confirm the current workspace is an Expo app.
   - Look for `package.json`.
   - Look for `app.json`, `app.config.js`, `app.config.ts`, or `expo` in `package.json`.
   - Do not wire the Codex action at a monorepo root if the Expo app is in a child package.

2. Discover the package runner.
   - Prefer the package manager declared in `packageManager`.
   - Otherwise infer from lockfiles.
   - The generated run script should still have a safe fallback to `npx expo`.

3. Create or update `script/build_and_run.sh`.
   - Use the reference file for the script shape.
   - Default no-argument mode starts the Expo dev server: `expo start`.
   - Keep the dev server in the foreground so the Codex action terminal owns logs and Ctrl-C behavior.
   - Support optional modes for direct buttons:
     - `--ios` starts Expo and opens iOS simulator.
     - `--android` starts Expo and opens Android.
     - `--web` starts Expo for web.
     - `--dev-client` starts in dev-client mode.
     - `--tunnel` starts a tunnel.
     - `--export-web` exports web.

4. Write `.codex/environments/environment.toml`.
   - Always add or update one primary action named `Run`.
   - Wire `Run` to `./script/build_and_run.sh`.
   - Add direct `Run iOS`, `Run Android`, `Run Web`, or `Run Dev Client`
     actions only when the user asks for those buttons or the project clearly needs them.
   - If the environment file already exists, update the existing matching action instead of duplicating it.

5. Use the action script as the default local run path.
   - After wiring, run `./script/build_and_run.sh --help` or a short non-server mode if you need to sanity-check syntax.
   - Do not start a long-lived Metro server during a setup-only task unless the user asked you to run the app.

## References

- `references/expo-run-button-bootstrap.md`: canonical Expo `script/build_and_run.sh` and Codex environment action examples.

## Guardrails

- Try Expo Go / `expo start` first; do not default the Codex Run button to `expo run:ios`, `expo run:android`, prebuild, or EAS Build.
- Do not wire cloud actions such as `eas build`, `eas submit`, or store deployment into Codex buttons unless the user explicitly asks and accepts the auth / time / cost tradeoff.
- Do not create a nested git repo.
- Do not put secrets in `.codex/environments/environment.toml` or in the run script.
- Do not background Metro from the run script; the action terminal should show the active server logs.
- Do not hard-code npm if the project uses pnpm, yarn, or bun.

## Output Expectations

When setup changes are made, summarize:

- the Expo app root you wired
- the run script path
- the Codex environment file path
- the actions added or updated
- how to launch the same path from shell
