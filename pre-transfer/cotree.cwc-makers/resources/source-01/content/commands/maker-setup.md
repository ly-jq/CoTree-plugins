---
name: "import.claude.cwc-makers.command.maker-setup"
description: "Onboard a Code-with-Claude Makers Cardputer — fetch the build-with-claude repo, flash firmware, and install the Claude Buddy apps."
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

The user has a Cardputer-Adv from claude.com/cwc-makers plugged in over USB-C.

1. Get https://github.com/moremas/build-with-claude into a `build-with-claude/` directory under cwd:
   - If `git` is available: `git clone` (or `git pull` if it already exists).
   - If `git` is **not** available: don't install it. Download the GitHub tarball instead — `curl` and `tar` ship with macOS, Linux, and Windows 10+ out of the box:
     - macOS / Linux: `curl -L https://github.com/moremas/build-with-claude/archive/refs/heads/main.tar.gz | tar xz && mv build-with-claude-main build-with-claude`
     - Windows (PowerShell): `curl.exe -L -o bwc.zip https://github.com/moremas/build-with-claude/archive/refs/heads/main.zip; tar -xf bwc.zip; Rename-Item build-with-claude-main build-with-claude`
   - Re-running `/maker-setup` later just re-downloads (~500KB) — no update mechanism needed.
2. Invoke the `m5-onboard` skill and follow it to run `onboard/scripts/onboard.py --apps buddy` from inside `build-with-claude/`, surfacing the download-mode button prompt to the user.
3. When done, tell the user how to launch Claude Buddy and ask what they want to build next (see the `cardputer-buddy` skill for iterating).
