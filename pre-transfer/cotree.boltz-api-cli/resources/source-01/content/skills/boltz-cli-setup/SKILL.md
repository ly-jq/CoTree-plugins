---
name: "import.codex.boltz-api-cli.boltz-cli-setup"
description: "Boltz CLI setup and auth. Use when installing, updating, verifying, or authenticating `boltz-api`, or fixing missing CLI, PATH, sandbox, browser login, or auth errors."
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

# Boltz CLI Setup

Use this skill for `boltz-api` installation, version, PATH, and authentication issues. The workflow skills assume `boltz-api` is already installed.

## Verify Installation

Check that the CLI is available:

```sh
boltz-api --version
```

If `boltz-api` is missing or too old, prefer a version-pinned release artifact
whose checksum or signature can be verified. If Boltz does not publish one for
the user's platform, its official installer is the fallback.

Before downloading or running either installer, show the exact platform command
and obtain the user's explicit confirmation. Explain that the command downloads
mutable remote code, executes it as the user outside the sandbox, and therefore
trusts `install.boltz.bio` at execution time. A general request to use or install
Boltz is not confirmation for this specific risk.

macOS and Linux:

```sh
curl -fsSL https://install.boltz.bio/boltz-api/install.sh | sh
```

Windows PowerShell:

```powershell
irm https://install.boltz.bio/boltz-api/install.ps1 | iex
```

The installer updates an existing `boltz-api` on `PATH`. If no binary is found, it installs to a user-local bin directory. Add the installed binary to `PATH` if `boltz-api --version` is still not found after install.

The sandbox can block browser login, OAuth callbacks, temp files, credential
storage, and user-wide install paths. Request the host sandbox bypass/escalation
needed for installation only after the installer confirmation above. The host
approval must cover the exact command; do not treat an ordinary setup request as
authorization to execute mutable remote code outside the sandbox.

Read [references/sandbox.md](references/sandbox.md) when an agent sandbox blocks the installer, browser auto-open, OAuth callback, credential storage, temp files, or global install path.

## Authenticate

Check the current auth state with:

```sh
boltz-api auth status
```

If `auth status` reports unauthenticated, or any Boltz command fails because authentication is missing or expired, start device-code login on the user's behalf before retrying:

```sh
boltz-api auth login --device-code
```

Do not ask the user for permission before starting device-code login; relaying the login URL/code and waiting for the CLI to complete is part of auth recovery. When sharing the authentication login URL/code, tell the user to use exactly `boltz-api auth login --device-code`.

For auth recovery, assume the CLI can auto-open the browser and run the exact command above. In sandboxed environments, request the host sandbox bypass/escalation needed for browser auto-open, OAuth callbacks, credential storage, or temp files.

For automation, an API key is still supported when it is already provisioned in
the environment:

```sh
test -n "${BOLTZ_API_KEY:+configured}" && echo "BOLTZ_API_KEY is configured"
```

Never ask the user to paste an API key into chat or a command, and never print,
log, or persist it in shell history or generated files. If the variable is not
already provisioned, direct the user to their host's secret-management facility.

## Version Checks

Do not hard-code expected commands or minimum versions in this skill. Treat the CLI's own update check as the source of truth.

When `boltz-api` reports that an update is available or required, relay that message and the install command it provides. The CLI may get this from a Boltz-hosted version metadata endpoint such as `/cli/version`, returning latest version, minimum supported version, whether an update is required, and platform-appropriate install instructions.

If a user asks why the CLI thinks it is stale, explain the split:

- GitHub Releases define which CLI binaries are available to install.
- The Boltz version endpoint defines API compatibility, including the minimum supported CLI version.

Respect user or CI opt-outs such as `BOLTZ_API_NO_UPDATE_CHECK=1`; do not force update checks when the environment disables them.
