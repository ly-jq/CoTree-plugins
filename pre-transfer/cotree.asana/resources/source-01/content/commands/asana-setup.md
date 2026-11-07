---
name: "import.claude.asana.command.asana-setup"
description: "Set up the Asana V2 MCP server connection (one-time OAuth app + claude mcp add)"
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

The user wants to connect Claude Code to Asana's V2 MCP server. Guide them through the one-time setup below. Do NOT run `claude mcp add` yourself — the `--client-secret` prompt needs a real terminal (a hidden TTY prompt), so the user must run it in their own terminal.

Their Asana OAuth Client ID (if provided): `<user-argument-1>`

Print these steps clearly, substituting the Client ID into the command if `<user-argument-1>` is non-empty (otherwise leave the `YOUR_CLIENT_ID` placeholder):

## Step 1 — Create an Asana OAuth app (one time)

1. Open the Asana developer console: https://app.asana.com/0/my-apps
2. Create a new app.
3. Under **OAuth**, add this exact **Redirect URL**:
   ```
   http://localhost:8080/callback
   ```
4. Copy the **Client ID** and **Client Secret**.

Note: `localhost` is correct — Claude Code is a local client and catches the OAuth callback on your own machine. Asana's V2 server does not support Dynamic Client Registration, so you must bring your own client_id + client_secret.

## Step 2 — Add the server (run this in YOUR terminal)

```bash
claude mcp add --transport http \
  --client-id YOUR_CLIENT_ID --client-secret \
  --callback-port 8080 \
  asana https://mcp.asana.com/v2/mcp
```

- `--client-secret` (no value) triggers a hidden prompt; paste the Client Secret there. It is stored in your OS keychain.
- The port in `--callback-port` must match the `http://localhost:8080/callback` redirect you registered.

## Step 3 — Authenticate & verify

1. On first use, Claude Code opens your browser for Asana consent — approve it.
2. Run `/mcp` and confirm `asana` shows as **connected**.
3. Test it: ask "list my Asana workspaces".

After printing the steps, offer to help troubleshoot if they hit `invalid_redirect_uri` (redirect/port mismatch) or `invalid_client` (wrong id/secret).
