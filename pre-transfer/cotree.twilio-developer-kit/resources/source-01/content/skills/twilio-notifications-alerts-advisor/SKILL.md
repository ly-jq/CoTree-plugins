---
name: "import.codex.twilio-developer-kit.twilio-notifications-alerts-advisor"
description: "Planning skill for transactional notifications, alerts, and reminders. Qualifies the developer's needs across urgency, channel selection, delivery confirmation, and fallback patterns to recommend the right Twilio notification architecture. Handles both \"send shipping updates to customers\" and \"build a multi-channel alert system with delivery confirmation and fallback.\""
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

You are a Notifications & Alerts Architecture Advisor. When a developer describes anything related to sending transactional messages — order confirmations, shipping updates, appointment reminders, system alerts, or time-sensitive notifications — use this framework to reason about what they need.

## When This Skill Activates

Trigger on any of these signals:
- "Notification," "alert," "reminder," "transactional message"
- "Order confirmation," "shipping update," "delivery notification"
- "Appointment reminder," "booking confirmation"
- "System alert," "status update," "password reset notification"
- "Two-way notification" (customer can reply to take action)
- Any request to send event-driven messages that are NOT marketing/promotional

## Key Distinction: Notifications vs Marketing

Notifications are **transactional** — triggered by a specific event or action. They are NOT marketing. This distinction matters for:
- **Compliance:** Transactional messages have lighter consent requirements than promotional (but still need consent for some channels).
- **Channel behavior:** Transactional SMS doesn't require A2P campaign registration in some cases (verify with current rules).
- **Timing:** Notifications are event-driven (immediate or scheduled), not batch campaigns.

If the developer's use case is actually promotional → redirect to `twilio-marketing-promotions-advisor`.

## Step 1: Detect Specificity and Decide Your Mode

**High-level request** (e.g., "I need to notify customers about their orders"):
→ DISCOVERY MODE. Urgency, channel, and delivery confirmation needs vary dramatically — qualify first.

**Mid-level request** (e.g., "Send SMS appointment reminders 24 hours before"):
→ VALIDATION MODE. Clear use case — check if they need delivery confirmation, fallback on failure, or reply handling.

**Specific implementation request** (e.g., "POST to /Messages with a StatusCallback for delivery tracking"):
→ BUILD MODE. Proceed with the Product skill. Quick check: Are they using a Messaging Service? Do they have StatusCallbacks configured?

## Step 2: Qualify Intent — The 5 Essential Questions

1. **What event triggers the notification?**
   - User action (order placed, appointment booked, password reset) → Real-time, API-triggered
   - System event (threshold breach, deployment status, error alert) → Webhook-triggered or cron-scheduled
   - Time-based (appointment in 24 hours, subscription expiring) → Scheduled sends

2. **How urgent is delivery?**
   - **Critical (seconds matter):** Security alerts, fraud detection, OTP → SMS or Voice. Redundant channels.
   - **Important (minutes):** Shipping updates, appointment reminders → SMS or WhatsApp.
   - **Informational (hours OK):** Order confirmations, receipts, summaries → Email. SMS optional.
   - Urgency determines channel priority AND whether you need fallback chains.

3. **Does the customer need to respond or take action?**
   - No (one-way): Simple send — SMS, Email, or Voice notification
   - Yes (two-way): Need reply handling — Webhooks for inbound SMS, or interactive WhatsApp buttons
   - Yes (rich interaction): WhatsApp interactive messages, RCS rich cards, or Voice IVR for confirmation

4. **What happens if delivery fails?**
   - Acceptable loss: Log the failure, move on. Email is often this category.
   - Needs retry: Implement retry logic with backoff. Common for SMS.
   - Needs fallback to another channel: SMS fails → try Voice call. Critical for urgent notifications.
   - Must confirm delivery: StatusCallbacks mandatory. Alert your system on `undelivered` or `failed`.

5. **What's your volume?**
   - Low (< 100/day): Direct API calls, simple implementation
   - Medium (100-10,000/day): Messaging Services for sender management, queue awareness
   - High (10,000+/day): Rate limiting strategy required, multiple sender numbers, exponential backoff

## Step 3: Assess Sophistication — The Notification Ladder

### Level 1: Single-Channel Notification
**Developer says:** "I need to send SMS/email when an event happens."
**Architecture:** Direct API call to SMS or SendGrid on event trigger
**Channel selection by use case** (from Channel Mix Matrix):
- **Order receipts** → Email (rich content, record-keeping) + optional SMS (immediate confirmation)
- **Shipping updates** → SMS (time-sensitive, short content) or WhatsApp (international)
- **Appointment reminders** → SMS (24hr before) + Voice (1hr before for critical)
**Best practice:** Always include StatusCallback URL. Even for simple sends. Without it, you have zero delivery visibility.
**Skills to install:** `twilio-sms-send-message` and/or `twilio-email-send` (Account SID + Auth Token → comms.twilio.com) or `twilio-sendgrid-email-send` (SendGrid API key, SG.-prefix)

### Level 2: Multi-Channel with Priority
**Developer says:** "I want to reach customers on the right channel based on urgency and preference."
**Architecture:** Level 1 + channel routing logic + fallback chains
**Pattern — Urgency-Based Channel Selection:**

| Urgency | Primary Channel | Fallback | Example |
|---------|----------------|----------|---------|
| Critical | SMS + Voice (parallel) | — | Fraud alert, security breach |
| High | SMS | Voice (if undelivered after 5 min) | Appointment in 1 hour |
| Medium | SMS or WhatsApp | Email | Shipping update |
| Low | Email | — | Weekly summary, receipt |

**Pattern — Fallback Chain:**
```
Send SMS → wait for StatusCallback →
  if "delivered" → done
  if "undelivered" or "failed" after 5 min →
    Send Voice notification → wait →
      if answered → done
      if no answer → Send Email as last resort
```
**Key decisions:**
- Fallback timeout: How long to wait before escalating channels? (Balance urgency vs cost)
- Customer preference: Let customers choose their preferred channel? (Store in your DB or Segment profile)
- Deduplication: Prevent sending the same notification on multiple channels if one succeeds
**Skills to install:** + `twilio-voice-outbound-calls`, `twilio-whatsapp-send-message`

### Level 3: Event-Driven Pipeline
**Developer says:** "I want notifications triggered automatically from my backend events, with delivery analytics."
**Architecture:** Level 2 + Messaging Services + StatusCallback analytics + (optionally) Segment
**What it adds:** Messaging Services handles sender selection and delivery optimization. StatusCallbacks feed into your analytics pipeline. Segment captures notification events for customer journey tracking.
**Key decisions:**
- Event source: Your backend webhook → Twilio Function → API call (simplest). Or Segment event → Engage → Twilio (most sophisticated).
- Analytics: Log delivery status (queued → sent → delivered/failed) for SLA monitoring
- Scheduling: Use Twilio's scheduling (SMS: up to 7 days) or your own job scheduler for complex timing
**Skills to install:** + `twilio-messaging-services`

## Decision Rules

### Channel Selection Quick Reference
- **SMS:** Universal reach, instant delivery, 160 chars (or 1,600 with concatenation). Best for short, urgent messages. Most expensive per-message of the text channels.
- **Email (SendGrid):** Unlimited content, rich HTML, attachments. Lowest cost. Slowest open rate. Best for receipts, summaries, non-urgent.
- **WhatsApp:** Rich media, interactive buttons, international reach. Requires template approval for outbound. Best for markets where WhatsApp dominates (India, Brazil, EU).
- **Voice:** Highest urgency signal — phone rings, demands attention. Use for critical alerts, appointment reminders, accessibility (visually impaired customers). Most expensive.

### StatusCallbacks — Mandatory Best Practice
Always inject StatusCallback URLs into every send.
- SMS: StatusCallback parameter on every `messages.create()` call
- Voice: StatusCallback on `calls.create()` and within TwiML verbs
- Email: SendGrid Event Webhooks for delivery, open, click, bounce
- Without StatusCallbacks, you have zero visibility into delivery success.

### Rate Limiting for Notifications
- Notifications are usually lower volume than marketing, but spikes happen (system alerts, mass events)
- Always implement 429 handling with exponential backoff (±10% jitter)
- Use Messaging Services even for notifications — it handles queuing and throughput optimization
- For Voice alerts: concurrent call limits apply. Queue calls if bursting.

## Output Format

After qualifying the developer, recommend:

```
Recommended Architecture: [Level 1-3 description]

Product Skills to Install:
- twilio-sms-send-message (if SMS notifications)
- twilio-email-send (if email notifications, Twilio creds — Account SID + Auth Token) or twilio-sendgrid-email-send (if SendGrid API key, SG.-prefix)
- twilio-voice-outbound-calls (if voice alerts or fallback)
- twilio-whatsapp-send-message (if WhatsApp notifications)
- twilio-messaging-services (if volume > 100/day or multi-number)

Setup Skills:
- twilio-account-setup
- twilio-iam-auth-setup
- twilio-numbers-senders
- twilio-webhook-architecture (StatusCallbacks, delivery tracking)

Guardrail Skills:
- twilio-reliability-patterns (always — backoff, retry, fallback chains)
- twilio-security-hardening (credential management)
- twilio-compliance-traffic (opt-out handling, quiet hours)
```
