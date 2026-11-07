---
name: "import.codex.twilio-developer-kit.twilio-sendgrid-account-setup"
description: "Set up a SendGrid account for email delivery. Covers API key creation (SG.-prefix), domain authentication (DKIM/SPF via CNAME records), Single Sender Verification for testing, SDK installation, and the relationship between SendGrid and Twilio credentials. Use before any other SendGrid skill. This skill is for SendGrid only — not the Twilio Email API (comms.twilio.com)."
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

## Overview

SendGrid is Twilio's email delivery engine but uses a **completely separate authentication system** — SendGrid API keys (starting with `SG.`) are not Twilio API keys. You cannot use Account SID/Auth Token for SendGrid, and no Twilio MCP tools wrap SendGrid.

---

## Quickstart

1. Get your API key from [SendGrid Console > Settings > API Keys](https://app.sendgrid.com/settings/api_keys)
2. Set environment variable:

```bash
export SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

3. Install SDK:

| Language | Install | Package |
|----------|---------|---------|
| Python | `pip install sendgrid` | `sendgrid` |
| Node.js | `npm install @sendgrid/mail` | `@sendgrid/mail` (v8.x) |
| Java | Maven | `com.sendgrid:sendgrid-java` |
| C# | `dotnet add package SendGrid` | `SendGrid` |
| Ruby | `gem install sendgrid-ruby` | `sendgrid-ruby` |
| PHP | `composer require sendgrid/sendgrid` | `sendgrid/sendgrid` |
| Go | `go get github.com/sendgrid/sendgrid-go` | `sendgrid-go` |

4. Authenticate your sending domain (see below)

---

## API Key Scopes

| Scope | Use for | Risk |
|-------|---------|------|
| **Full Access** | Development only | Can do everything — never deploy with this |
| **Restricted Access** | Production | Scope to only what your app needs (e.g., Mail Send only) |
| **Billing Access** | Account management | Separate from mail operations |

A "Mail Send" restricted key can send email but cannot read suppressions, manage templates, or access stats. If you get `403 Forbidden`, check key permissions.

---

## SMTP Relay (Alternative to API)

SendGrid also supports SMTP for sending. Useful for frameworks with built-in SMTP support (e.g., Laravel, Django, Rails).

| Setting | Value |
|---------|-------|
| **Server** | `smtp.sendgrid.net` |
| **Port** | `587` (TLS) or `465` (SSL) |
| **Username** | `apikey` (literal string, not your key name) |
| **Password** | Your SendGrid API key (`SG.xxx`) |

---

## Domain Authentication (Required for Production)

Single Sender Verification is for testing only. Production requires domain authentication for deliverability.

**Setup:** SendGrid Console > Settings > Sender Authentication > Authenticate Your Domain

Create 3 CNAME DNS records:
1. `s1._domainkey.yourdomain.com` → `s1.domainkey.u1234.wl.sendgrid.net` (DKIM)
2. `s2._domainkey.yourdomain.com` → `s2.domainkey.u1234.wl.sendgrid.net` (DKIM)
3. `em1234.yourdomain.com` → `u1234.wl.sendgrid.net` (return path)

Verify via API: `GET /v3/whitelabel/domains/{id}/validate`

**DMARC:** After setting up DKIM and SPF via domain authentication, configure a DMARC DNS record (`_dmarc.yourdomain.com`) to instruct receiving servers how to handle authentication failures. Start with `p=none` for monitoring before enforcing.

**Dedicated IP (Pro+ plans):** Isolates your sending reputation. Requires an IP warming schedule — start with low volume and increase over 30 days.

---

## SendGrid and Twilio

| Twilio product | How it uses SendGrid | Sends email? |
|----------------|---------------------|-------------|
| **SendGrid** (this skill) | Direct email delivery via `api.sendgrid.com` | Yes |
| **Twilio Email API** | Direct email delivery via `comms.twilio.com/v1/emails` — uses Twilio creds, not SendGrid keys | Yes (separate product) |
| **Verify** | OTP via `channel: 'email'` | Delegates to SendGrid via Mailer config |
| **Conversations** | Tracks EMAIL as a channel type | No — logs/tracks only |
| **Flex** | Email channel for agents | Uses SendGrid for delivery |

**Servers:**
- Global: `https://api.sendgrid.com`
- EU regional: `https://api.eu.sendgrid.com`

---

## CANNOT

- **Cannot use Twilio credentials for SendGrid** — Separate API keys (`SG.`-prefix), separate Console, separate billing.
- **Cannot access SendGrid via Twilio MCP tools** — No MCP integration. Use SDK or direct REST.
- **Single Sender Verification requires re-verification on address change** — Changing the sender email requires a new verification. Use Domain Authentication for production.
- **Domain Authentication requires DNS access** — 3 CNAME records needed. If you can't modify DNS, you can't authenticate.
- **Domain Authentication API returns stale entries** — `GET /v3/whitelabel/domains` includes old invalid entries. Filter by `valid: true`.
- **API Key Secret shown only at creation** — Cannot retrieve afterward. Store immediately.

> **Security:** Your API key is shown only once at creation. Never display, log, or repeat a user's API key in responses. If a user shares their key in conversation, advise them to rotate it immediately. Store keys in a secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.), not in code or environment files committed to version control.

---

## Next Steps

- **Send email:** `twilio-sendgrid-email-send`
- **Domain settings and templates:** `twilio-sendgrid-email-settings`
- **Delivery tracking:** `twilio-sendgrid-webhooks`
- **Docs:** [SendGrid API Reference](https://www.twilio.com/docs/sendgrid/api-reference)
