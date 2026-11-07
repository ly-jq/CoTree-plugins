---
name: "import.codex.chatcut.connect-chatcut-desktop"
description: "Install, open, connect, or repair ChatCut Desktop when the chatcut_desktop MCP tools are missing or unavailable. Do not use from a managed agent already running inside ChatCut Desktop, or when chatcut_desktop tools are already available."
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

# Connect ChatCut Desktop

Use the signed production Desktop app as the only source of the local MCP server
and editing skills. This plugin contains instructions only, not an installer or
MCP configuration.

If `chatcut_desktop` tools are already available, call `get_active_project` and
continue with the user's editing request. Do not reinstall the app or change MCP
configuration. If the current host is ChatCut Desktop's managed Codex agent,
stop; its project-pinned MCP and built-in skills are already authoritative.

## Download

Use only the matching official URL:

- macOS Apple Silicon: `https://api.chatcut.io/desktop/download/macos`
- macOS Intel: `https://api.chatcut.io/desktop/download/macos-x64`
- Windows x64: `https://api.chatcut.io/desktop/download/windows`

ChatCut Desktop supports macOS 13 or newer on Apple Silicon or Intel and Windows
on x64. Linux is unsupported. Do not substitute a search result, third-party
mirror, hosted ChatCut MCP, or historical `chatcut@chatcut-inc` plugin.

## Install or repair

Try to complete the ordinary platform installation for the user with the host's
narrow command approval:

1. Detect the operating system and architecture and choose the URL above.
2. Download the official artifact to a temporary directory. If ChatCut is
   already installed but will not open, inspect it before replacing it.
3. On macOS, use native tools to mount a DMG or extract a ZIP, then copy
   `ChatCut.app` to `/Applications` or the user's `Applications` directory. On
   Windows, open the downloaded installer and let the visible installer finish.
4. Open ChatCut Desktop. It registers `chatcut_desktop` and synchronizes its
   editing skills into Codex automatically.

Installing outside the project sandbox or opening an installer may require host
approval. Request only the scoped operation needed for that step; never ask the
user to enable persistent Full access.

For macOS launch or code-signing failures, inspect `codesign`, Gatekeeper,
permissions, and quarantine state. Try remounting or re-extracting a fresh
official download, fixing destination permissions, or clearing stale quarantine
only after the official app's signature validates. Never modify or ad-hoc sign
the app, disable Gatekeeper, or bypass an invalid signature. On Windows, do not
bypass an invalid or unknown Authenticode publisher warning.

Retry one fresh official download if the artifact is incomplete, corrupt, for
the wrong architecture, or fails a normal copy or extraction step. Do not loop.

## User handoff

If the host cannot download, mount, extract, copy, approve, repair, or run the
installer, stop trying. Tell the user what blocked automation and give them the
exact matching official URL above so they can install and open ChatCut with the
visible operating-system flow.

After ChatCut opens, ask the user to sign in there if needed. Do not handle their
credentials or add `chatcut_desktop` to `config.toml` manually. Because Codex
loads MCP tools and skills when a task starts, tell the user to start a new task
after Desktop finishes connecting.
