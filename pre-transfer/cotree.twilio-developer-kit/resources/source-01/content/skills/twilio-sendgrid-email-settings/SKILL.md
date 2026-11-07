---
name: "import.codex.twilio-developer-kit.twilio-sendgrid-email-settings"
description: "Configure SendGrid dynamic templates (Handlebars), tracking settings (opens, clicks, subscriptions), link branding for custom tracking domains, and content types (HTML, plain text, AMP). Use when customizing SendGrid email content, tracking behavior, or branded links. Requires a SendGrid API key (SG.-prefix) — not applicable to the Twilio Email API (comms.twilio.com)."
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

SendGrid email settings control how your messages are constructed, personalized, and tracked. Most configuration happens in the SendGrid Console, but templates and tracking can also be managed via API.

---

## Dynamic Templates

Templates use Handlebars syntax and are managed in Console > Email API > Dynamic Templates. Template IDs start with `d-`.

**Supported Handlebars helpers:**

| Helper | Use | Example |
|--------|-----|---------|
| `if` / `unless` | Conditional | `{{#if premium}}Welcome back!{{/if}}` |
| `each` | Iteration | `{{#each items}}{{this.name}}{{/each}}` |
| `equals` / `notEquals` | Comparison | `{{#equals status "active"}}...{{/equals}}` |
| `and` / `or` | Boolean logic | `{{#and premium verified}}...{{/and}}` |
| `greaterThan` / `lessThan` | Numeric | `{{#greaterThan count 5}}...{{/greaterThan}}` |
| `length` | Array/string | `{{length items}}` |
| `formatDate` | Date format | `{{formatDate date "MM/DD/YYYY"}}` |
| `insert` | Module insert | `{{insert "module_name"}}` |

**NOT supported:** Custom helpers, inline partials, `lookup`, `log`, `with`, `blockHelperMissing`. SendGrid implements a subset of Handlebars.js.

### Template Versions

- **Dynamic templates** (IDs starting with `d-`): Support Handlebars
- **Legacy transactional templates**: Use `-substitution-` syntax — not interchangeable with Handlebars

---

## Tracking Settings

| Setting | What it does | Caveat |
|---------|-------------|--------|
| **Open tracking** | Inserts a tracking pixel | Unreliable: Apple Mail Privacy Protection inflates opens; image-blocking clients produce false negatives |
| **Click tracking** | Rewrites URLs through SendGrid's redirect | Can trigger spam filters on some domains |
| **Subscription tracking** | Adds unsubscribe footer | Required for CAN-SPAM compliance |
| **Google Analytics** | Adds UTM parameters | Only for marketing campaigns |

Configure per-message or account-wide in Console > Settings > Tracking.

---

## Link Branding (Custom Tracking Domains)

By default, click-tracked links route through `url####.ct.sendgrid.net`. Link Branding lets you use your own domain (e.g., `links.yourdomain.com`) instead, which improves deliverability and builds trust.

**Setup:** Console > Settings > Sender Authentication > Link Branding

Requires a CNAME DNS record pointing your subdomain to `sendgrid.net`. Validate via API: `GET /v3/whitelabel/links/{id}/validate`

---

## Content Type Priority

When sending multiple content types, email clients display in this priority:

1. `text/x-amp-html` (AMP — only in supporting clients, requires sender registration)
2. `text/html` (standard — most clients)
3. `text/plain` (fallback)

Always include at least `text/plain` and `text/html`.

---

## CANNOT

- **Cannot use custom Handlebars helpers** — Only the built-in set listed above.
- **Cannot guarantee open tracking accuracy** — Pixel-based tracking is fundamentally unreliable. Do not use for business-critical logic.
- **Personalizations `subject` is a plain string override** — It bypasses the template subject. To use dynamic subjects, set Handlebars variables (e.g., `{{{subject}}}`) in the Dynamic Template's subject field and pass values via `dynamic_template_data`.
- **Undefined template variables are silent** — Missing keys in `dynamic_template_data` render as empty strings with no error.

---

## Next Steps

- **Send email:** `twilio-sendgrid-email-send`
- **Delivery tracking:** `twilio-sendgrid-webhooks`
- **Manage bounces/unsubscribes:** `twilio-sendgrid-suppressions`
