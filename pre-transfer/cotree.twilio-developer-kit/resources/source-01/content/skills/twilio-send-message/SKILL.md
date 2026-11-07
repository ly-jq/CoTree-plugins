---
name: "import.codex.twilio-developer-kit.twilio-send-message"
description: "Send messages via Twilio's Programmable Messaging API across all channels — SMS, MMS, RCS, and WhatsApp. Covers text messages, media, rich content (cards, carousels, buttons), template-based sends, Messaging Services, status callbacks, and WhatsApp's 24-hour service window. Use when the user wants to send a message — whether they say \"send SMS\", \"text message\", \"branded message\", \"rich message\", \"WhatsApp message\", \"RCS message\", \"notification\", or \"alert\". For picking the right channel for a use case, first consult twilio-messaging-channel-advisor."
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

**A single `messages.create()` call sends on any messaging channel — SMS, MMS, RCS, or WhatsApp.** The channel is determined by the sender address and the recipient's capabilities. For channel selection guidance and the full onboarding sequence, see `twilio-messaging-overview` and `twilio-messaging-channel-advisor`.

| Channel | `to` format | Notes | Template required? |
|---------|-------------|-------|--------------------|
| SMS/MMS | `+15551234567` | MMS: US/CA/AU only | No |
| RCS (with SMS fallback) | `+15551234567` | Send via Messaging Service that has both an RCS sender and an SMS sender — Twilio attempts RCS first, falls back to SMS on failure | No |
| RCS (no fallback) | `rcs:+15551234567` | Forces RCS only — fails if recipient isn't RCS-capable | No |
| WhatsApp | `whatsapp:+15551234567` | Send via `whatsapp:`-prefixed `from` | Outside 24-hr window: yes |

**For production:** Send via `messagingServiceSid` instead of `from`. This enables sender pool management, RCS→SMS fallback, SMS pumping protection, link shortening, compliance toolkit, and scheduling. See `twilio-messaging-services`.

---

## Prerequisites

- Twilio account — New to Twilio? See `twilio-account-setup`
- Environment variables: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` — see `twilio-iam-auth-setup`
- SDK: `pip install twilio` / `npm install twilio`
- Channel-specific senders:
  - SMS/MMS: a Twilio phone number (see `twilio-account-setup`)
  - RCS: an RCS sender added to a Messaging Service (see `twilio-rcs-messaging`)
  - WhatsApp: an active WhatsApp sender (see `twilio-whatsapp-send-message` for sandbox, `twilio-whatsapp-manage-senders` for production)

---

## Quickstart

**Python**
```python
import os
from twilio.rest import Client

client = Client(os.environ["TWILIO_ACCOUNT_SID"], os.environ["TWILIO_AUTH_TOKEN"])

# SMS
sms = client.messages.create(
    from_="+15017122661",
    to="+15558675310",
    body="Your order has shipped."
)

# RCS — forces RCS only, no fallback
rcs = client.messages.create(
    messaging_service_sid="MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    to="rcs:+15558675310",
    body="Your order has shipped."
)

# WhatsApp
whatsapp = client.messages.create(
    from_="whatsapp:+15017122661",
    to="whatsapp:+15558675310",
    body="Your order has shipped."
)

# Via Messaging Service (recommended — attempts RCS first, falls back to SMS)
msg = client.messages.create(
    messaging_service_sid="MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    to="+15558675310",
    body="Your order has shipped."
)
```

**Node.js**
```javascript
const client = require("twilio")(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// SMS
const sms = await client.messages.create({
    from: "+15017122661",
    to: "+15558675310",
    body: "Your order has shipped.",
});

// RCS — forces RCS only, no fallback
const rcs = await client.messages.create({
    messagingServiceSid: "MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    to: "rcs:+15558675310",
    body: "Your order has shipped.",
});

// WhatsApp
const whatsapp = await client.messages.create({
    from: "whatsapp:+15017122661",
    to: "whatsapp:+15558675310",
    body: "Your order has shipped.",
});

// Via Messaging Service (attempts RCS first, falls back to SMS)
const msg = await client.messages.create({
    messagingServiceSid: "MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    to: "+15558675310",
    body: "Your order has shipped.",
});
```

---

## Key Patterns

### Send with media (MMS, WhatsApp, RCS)

```python
client.messages.create(
    from_="+15017122661",
    to="+15558675310",
    body="Here is your invoice.",
    media_url=["https://example.com/invoice.pdf"]
)
```

Supported: images (JPEG, PNG, GIF), PDF, audio, video. 5 MB max per attachment.

### Send a template (WhatsApp required outside 24-hr window; RCS rich content)

```python
client.messages.create(
    messaging_service_sid="MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    to="+15558675310",
    content_sid="HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    content_variables='{"1": "Sarah", "2": "12345"}'
)
```

See `twilio-content-template-builder` for building templates.

### Track delivery status

```python
client.messages.create(
    messaging_service_sid="MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    to="+15558675310",
    body="Hello!",
    status_callback="https://yourapp.com/status"
)
```

Twilio POSTs at each state transition: `queued → sent → delivered` (or `failed`/`undelivered`).

### Configure RCS→SMS fallback

Configured on the Messaging Service, not per-message. Add both an RCS sender and an SMS sender to the same Messaging Service. Twilio attempts RCS first and falls back to SMS on failure. See `twilio-messaging-services` and `twilio-rcs-messaging`.

---

## Common Errors

| Code | Meaning | Fix |
|------|---------|-----|
| 21211 | Invalid `to` number | Validate E.164 format |
| 21408 | Region not permitted | Enable geo-permissions in Console |
| 21610 | Recipient opted out | Do not retry; respect opt-out |
| 21664 | `FallbackFrom` cannot be used with `From` sender | Use `messaging_service_sid` instead of `from` |
| 21666 | `FallbackFrom` requires `MessagingServiceSid` | Send via a Messaging Service |
| 21667 | `FallbackFrom` requires an RCS Sender on the Messaging Service | Add an RCS sender before configuring fallback |
| 30003 | Unreachable destination | Carrier cannot deliver |
| 30007 | Message filtered as spam | Review content and sender reputation |
| 30034 | US A2P 10DLC — sender not registered | Register brand + campaign. See `twilio-compliance-onboarding` |
| 30036 | Validity Period expired | Message aged out. Often indicates RCS fallback is misconfigured |
| 63036 | RCS recipient unreachable | Configure SMS fallback on the Messaging Service |

---

## CANNOT

- **Cannot send cross-channel in a single API call.** One `messages.create()` = one channel. For multi-channel fallback, use RCS→SMS via a Messaging Service, or implement sequencing in your app.
- **Cannot send WhatsApp free-form outside the 24-hour service window.** Use a pre-approved template (`content_sid`). See `twilio-whatsapp-send-message`.
- **Cannot send MMS outside US/Canada.** For international rich media, use WhatsApp or RCS.
- **Cannot configure RCS→SMS fallback without a Messaging Service.** Raw `from` sends don't support `FallbackFrom`.
- **Cannot guarantee delivery on any channel.** Always implement status callbacks.

---

## Next Steps

- **Pick a channel for your use case:** `twilio-messaging-channel-advisor`
- **Full messaging platform overview:** `twilio-messaging-overview`
- **Channel-specific deep dives:** `twilio-sms-send-message`, `twilio-rcs-messaging`, `twilio-whatsapp-send-message`
- **Sender pools, fallback, production features:** `twilio-messaging-services`
- **Build templates (cards, carousels, quick replies):** `twilio-content-template-builder`
- **Handle inbound messages and status callbacks:** `twilio-messaging-webhooks`
- **US A2P 10DLC compliance:** `twilio-compliance-onboarding`
- **OTP / verification use cases:** `twilio-verify-send-otp`
