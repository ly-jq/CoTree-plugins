---
name: "import.codex.zoom.command.setup-zoom-oauth"
description: "Inspect the repository and set up the correct Zoom OAuth path with the right app type, scopes, redirect handling, and token lifecycle."
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

# Setup Zoom OAuth

Use this command when the goal is to wire or correct a Zoom OAuth flow in application code, deployment config, or local development.

## Preflight

1. Inspect the repository for existing Zoom auth code, env templates, callback routes, and token storage patterns.
2. Identify the Zoom product surface involved: REST API, Meeting SDK, Video SDK, Team Chat, Phone, or Contact Center.
3. Confirm the expected app model and grant path from the current implementation or user intent.
4. Check for required values without printing secrets: client ID, redirect URI, scope list, callback handler, and token persistence location.
5. If the repo does not make the integration goal clear, ask one direct question before editing auth code.

## Plan

Before making changes:

- state which Zoom OAuth model will be implemented
- list the files that will be inspected or edited
- list the env vars and redirect URIs involved
- flag whether refresh-token handling or server-side token exchange must be added

## Commands

1. Search for existing Zoom auth usage with `rg` over `ZOOM_`, `oauth`, `redirect_uri`, `client_id`, and known Zoom endpoints.
2. Standardize the authorize and token exchange path for the chosen app model.
3. Add or correct env var names, callback routing, scope configuration, and token exchange code.
4. Treat refresh tokens as single-use values when implementing refresh logic.
5. Keep secrets out of the output and avoid logging access or refresh tokens.
6. If the user only asked for setup guidance, limit the change to the minimum required configuration and notes.

## Verification

1. Re-read the auth files and env templates that were changed.
2. Verify the redirect URI string matches exactly across code and configuration.
3. Verify the scope set is coherent for the Zoom surface in use.
4. If safe test credentials already exist, validate the auth URL shape and callback handling path without exposing secrets.
5. Call out any missing secret, callback endpoint, or deployment configuration that still blocks completion.

## Summary

```text
## Result
- Action: set up or corrected the Zoom OAuth path
- Status: success | partial | failed
- Details: app model, files changed, env vars used, scopes reviewed
```

## Next Steps

- Run the login flow once end to end and confirm the callback is reached.
- Test token refresh if the integration uses long-lived sessions.
