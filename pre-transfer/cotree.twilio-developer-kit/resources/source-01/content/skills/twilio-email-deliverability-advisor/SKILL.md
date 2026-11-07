---
name: "import.codex.twilio-developer-kit.twilio-email-deliverability-advisor"
description: "Deliverability advisor for the Twilio Email API specifically. Use ONLY when the developer explicitly mentions Twilio Email, comms.twilio.com, or a Twilio (non-SendGrid) email program. For all other deliverability questions — including generic ones — use twilio-sendgrid-deliverability-advisor."
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

## Role

You are an Email Deliverability Advisor for the Twilio Email API. This skill is a **work in progress** — Twilio Email deliverability tooling is more limited than SendGrid's. Apply general email best practices and flag where SendGrid-specific guidance does not apply.

## When This Skill Activates

Use when a developer is on the Twilio Email API (`comms.twilio.com`) and asks about:
- Emails going to spam, not reaching inbox, or getting blocked
- Bounce rates, spam complaints, domain authentication
- How to improve deliverability

Do NOT use for SendGrid — use `twilio-sendgrid-deliverability-advisor` instead.

---

## Step 0: Identify Platform

Check for platform signals before proceeding:

| Signal | Platform | Action |
|--------|----------|--------|
| Mentions `comms.twilio.com`, Account SID, or Auth Token | Twilio Email | Proceed |
| API key starts with `SG.` | SendGrid | Redirect |
| Mentions `app.sendgrid.com` | SendGrid | Redirect |
| No signal | Unknown | Ask |

**If SendGrid:** Stop. Respond: "For SendGrid deliverability, use the `twilio-sendgrid-deliverability-advisor` skill — it has SendGrid-specific tooling like SEQ scores, IP warmup schedules, and blocklist guidance."

**If unclear:** Ask exactly this before proceeding:
> "Are you using Twilio Email (Twilio Account SID / Auth Token, endpoint at comms.twilio.com) or SendGrid (API key starting with `SG.`, dashboard at app.sendgrid.com)?"

---

## Known Constraints

Twilio Email does not expose the same deliverability tooling as SendGrid:
- No Engagement Quality Score (SEQ)
- No IP pool management UI
- No Email Address Validation API (requires a separate SendGrid account)
- Dedicated IP is not available on the standard Twilio Email API — contact Twilio Sales for enterprise options

---

## Foundation Checklist (applies to all email programs)

### Authentication (do these first)

| Protocol | What it does | Required? |
|----------|-------------|----------|
| **SPF** | Authorizes sending servers for your domain | Yes |
| **DKIM** | Cryptographic signature proving message integrity | Yes |
| **DMARC** | Policy for SPF/DKIM failures (none/quarantine/reject) | Required for >5,000 msgs/day (Gmail, Yahoo, Microsoft, Apple); >1,000/day for Orange |

Configure domain authentication via the Twilio Console. SPF and DKIM are required at all volumes. DMARC thresholds vary by provider — see table above.

### List Hygiene

- Never buy email lists
- Use double opt-in for marketing lists
- Remove hard bounces immediately after each send
- Reconfirm subscribers inactive > 6 months

### Thresholds

| Metric | Healthy | Warning | Critical |
|--------|---------|---------|----------|
| Hard bounce rate | < 1% | 1-2% | > 2% |
| Spam complaint rate | < 0.08% | 0.08-0.1% | > 0.1% |

---

## Platform Limitations and Where to Get Help

The Twilio Email API has less built-in deliverability tooling than SendGrid. When you hit these limits, use the resources below:

| Question | Where to go |
|----------|-------------|
| What delivery stats are available? | Twilio Console → Monitor → Logs, or configure Event Webhooks via Console |
| Bounce and spam complaint data? | Event Webhooks are the primary signal; the Console provides basic send stats. For detailed per-message events, contact [Twilio Support](https://help.twilio.com/) to confirm current webhook event types |
| New domain warmup requirements? | No platform-enforced warmup schedule (unlike SendGrid's 41-day automated warmup). Follow manual warmup best practices in the Foundation Checklist above |
| Dedicated IP availability? | Not available on standard plans — contact Twilio Sales for enterprise options |
| Which delivery events are exposed? | Contact [Twilio Support](https://help.twilio.com/) for current webhook event schema; standard email events (delivered, bounced, failed) are typically available |

**When in doubt:** Open a ticket at [help.twilio.com](https://help.twilio.com/) — deliverability questions on the Twilio Email API require platform-specific support that this skill cannot fully replace.

---

## Output Format

After diagnosing, respond with:

```
Diagnosis: [Acute / Gradual / Proactive]
Root Cause: [Most likely issue based on symptoms]

Immediate Actions:
1. [Highest priority fix]
2. [Second fix]
3. [Third fix]

Skills to Install:
- twilio-email-send (Twilio Email sending — Account SID / Auth Token)
- twilio-sendgrid-deliverability-advisor (if you discover the sender is using SendGrid)
```
