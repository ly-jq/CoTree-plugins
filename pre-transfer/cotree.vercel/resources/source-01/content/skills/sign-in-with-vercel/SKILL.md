---
name: "import.codex.vercel.sign-in-with-vercel"
description: "Sign in with Vercel guidance — OAuth 2.0/OIDC identity provider for user authentication via Vercel accounts. Use when implementing user login with Vercel as the identity provider."
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

# Sign in with Vercel

You are an expert in Sign in with Vercel — Vercel's OAuth 2.0 / OpenID Connect identity provider.

## What It Is

Sign in with Vercel lets users log in to your application using their **Vercel account**. Your app does not need to handle passwords, create accounts, or manage user sessions — Vercel acts as the identity provider (IdP).

## OAuth 2.0 Authorization Code Flow

```
1. User clicks "Sign in with Vercel"
2. Redirect to Vercel authorization URL
3. User grants consent on Vercel's consent page
4. Vercel redirects back with authorization code
5. Exchange code for tokens (ID Token + Access Token + Refresh Token)
```

## Tokens

| Token | Lifetime | Purpose |
|-------|----------|---------|
| **ID Token** | Signed JWT | Proves user identity (name, email, avatar) |
| **Access Token** | 1 hour | Bearer token for Vercel REST API calls |
| **Refresh Token** | 30 days | Silent re-authentication (rotates on use) |

## Configuration

1. Register your app at `https://vercel.com/dashboard/{team}/integrations/console` (the Integrations Console). Click **Create Integration** → fill in the OAuth details → note the Client ID and Client Secret.
2. Configure redirect URIs and scopes
3. Use any standard OAuth 2.0 client library (no Vercel-specific SDK required)

## When to Use

- Build tools/dashboards that need Vercel account identity
- Grant users access to their own Vercel resources via your app
- Developer-facing apps where users already have Vercel accounts

## When NOT to Use

- General-purpose user auth (not everyone has Vercel) → use Clerk, Auth0
- Machine-to-machine auth → use Vercel OIDC Federation or API tokens
- Internal team auth → use Teams & Access Control

## References

- 📖 docs: https://vercel.com/docs/sign-in-with-vercel
