---
name: "import.codex.twilio-developer-kit.twilio-sms-send-message"
description: "SMS and MMS deep-dive reference. Covers SMS-specific error codes, message filtering troubleshooting (\"Messages Being Filtered or Blocked?\" diagnostic checklist), MMS media support (US/CA/AU only), and SMS pumping indicators. For sending SMS, use twilio-send-message instead. Use this skill only when debugging SMS delivery issues or needing SMS-specific details not in the consolidated send skill."
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

**SMS is one channel in Twilio's Messaging platform.** All channels — SMS, WhatsApp, RCS, Facebook Messenger — share the same `messages.create()` API. See `twilio-messaging-overview` for the full channel comparison and onboarding sequence.

| When to use SMS | When to consider alternatives |
|----------------|------------------------------|
| Reach any phone number globally | Need rich media outside US/CA/AU → WhatsApp |
| No app install required | Opted-in audience prefers chat apps → WhatsApp |
| Time-sensitive alerts (OTP, outage) | Marketing campaigns → `twilio-marketing-promotions-advisor` |
| Regulatory/compliance requires SMS | Cost-sensitive high-volume → WhatsApp (lower per-msg cost in many markets) |

**For production SMS:** Use a Messaging Service (`messagingServiceSid`) instead of a raw `from` number. It enables sender pool management, compliance toolkit, SMS pumping protection, link shortening, and message scheduling. See `twilio-messaging-services`.

Every outbound SMS requires a `from` Twilio number (or `messagingServiceSid`) and a `to` recipient — both in E.164 format.

---

## Prerequisites

- Twilio account with an SMS-capable phone number
  — New to Twilio? See `twilio-account-setup` for signup, getting a number, and trial limitations
- Environment variables:
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  — See `twilio-iam-auth-setup` for credential setup and best practices
- SDK: `pip install twilio` / `npm install twilio`

---

## Quickstart

**Python**
```python
import os
from twilio.rest import Client

client = Client(os.environ["TWILIO_ACCOUNT_SID"], os.environ["TWILIO_AUTH_TOKEN"])

message = client.messages.create(
    from_="+15017122661",   # Your Twilio number (E.164)
    to="+15558675310",      # Recipient (E.164)
    body="Your appointment is confirmed for tomorrow at 2pm."
)

print(message.sid)     # SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
print(message.status)  # queued | sent | delivered | failed
```

**Node.js**
```node
const twilio = require("twilio");
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const message = await client.messages.create({
    from: "+15017122661",
    to: "+15558675310",
    body: "Your appointment is confirmed for tomorrow at 2pm.",
});

console.log(message.sid);
console.log(message.status);
```

---

## Key Patterns

### Send MMS (with media)

**Python**
```python
message = client.messages.create(
    from_="+15017122661",
    to="+15558675310",
    body="Here is your invoice.",
    media_url=["https://example.com/invoice.pdf"]
)
```

**Node.js**
```node
const message = await client.messages.create({
    from: "+15017122661",
    to: "+15558675310",
    body: "Here is your invoice.",
    mediaUrl: ["https://example.com/invoice.pdf"],
});
```

Supported media types: images (JPEG, PNG, GIF), PDF, audio, video. Max 5 MB per message.

### Send via Messaging Service (recommended for scale)

Use `messagingServiceSid` instead of `from` — Twilio picks the best sender automatically from your pool.

**Python**
```python
message = client.messages.create(
    messaging_service_sid="MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    to="+15558675310",
    body="Your order has shipped."
)
```

**Node.js**
```node
const message = await client.messages.create({
    messagingServiceSid: "MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    to: "+15558675310",
    body: "Your order has shipped.",
});
```

### Track Delivery Status

**Python**
```python
message = client.messages.create(
    from_="+15017122661",
    to="+15558675310",
    body="Hello!",
    status_callback="https://yourapp.com/sms-status"
)
```

**Node.js**
```node
const message = await client.messages.create({
    from: "+15017122661",
    to: "+15558675310",
    body: "Hello!",
    statusCallback: "https://yourapp.com/sms-status",
});
```

Twilio POSTs to your URL at each transition: `queued → sent → delivered` (or `failed`/`undelivered`).

---

## Response Fields

| Field | Description |
|-------|-------------|
| `sid` | Message identifier (`SM...`) |
| `status` | `queued`, `sent`, `delivered`, `undelivered`, `failed` |
| `error_code` | Populated on failure |
| `error_message` | Human-readable description |
| `price` | Cost (populated after delivery) |
| `date_sent` | UTC timestamp |

---

## Common Errors

| Code | Meaning | Fix |
|------|---------|-----|
| 21211 | Invalid `to` number | Validate E.164 format |
| 21408 | Permission to send to region not enabled | Enable geo-permissions in Console |
| 21610 | Number is on blocklist (opted out) | Do not retry; respect opt-out |
| 30003 | Unreachable destination | Carrier cannot deliver; try later |
| 30007 | Message filtered as spam | Review content and sender reputation |
| 30034 | Message from unregistered number | Complete A2P 10DLC registration — see `twilio-compliance-onboarding` |
| 30450 | SMS pumping detected | Message blocked by SMS pumping protection — see `twilio-messaging-services` |

### Messages Being Filtered or Blocked?

If your messages aren't being delivered, check these causes in order:

1. **Unregistered sender (error 30034)** — US 10DLC numbers must be registered. See `twilio-compliance-onboarding`
2. **Spam filtered (error 30007)** — Carrier flagged content. Check: opt-out language included? URL shorteners avoided? Content matches registered campaign?
3. **Opted-out recipient (error 21610)** — Recipient sent STOP. Do not retry. See `twilio-compliance-traffic`
4. **Geo-permissions disabled (error 21408)** — Enable the destination country in Console > Messaging > Settings > Geo Permissions. See `twilio-security-hardening`
5. **SMS pumping (error 30450)** — Artificial traffic detected. Whitelist known prefixes via Global Safe List. See `twilio-messaging-services`
6. **Account suspended** — Check Console for account status notifications. See `twilio-account-setup`

For delivery event tracking, set up StatusCallbacks or use `twilio-debugging-observability`.

---

## CANNOT

- **Cannot send without E.164 format** — Both `from` and `to` must be `+` followed by country code and number
- **Cannot send to unverified numbers on trial accounts** — Upgrade to paid or verify recipient numbers first
- **Cannot send MMS outside US, Canada, and Australia** — MMS is only supported on US/CA/AU numbers; for international rich media use WhatsApp
- **Cannot exceed 1,600 characters per message** — Longer messages are automatically split into segments (each billed separately)
- **Cannot prevent SMS pumping without a Messaging Service** — Enable SMS pumping protection via Messaging Services to prevent artificial traffic inflation. See `twilio-messaging-services`

---

## Next Steps

- **Channel overview and onboarding guide:** `twilio-messaging-overview`
- **Receive inbound SMS and delivery status:** `twilio-messaging-webhooks`
- **Manage sender pools at scale:** `twilio-messaging-services`
- **US compliance for A2P traffic:** `twilio-compliance-onboarding`
- **Send via WhatsApp instead:** `twilio-whatsapp-send-message`
