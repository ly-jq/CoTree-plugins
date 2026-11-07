---
name: "import.codex.twilio-developer-kit.twilio-messaging-overview"
description: "Twilio Messaging channel overview and onboarding guide. Covers all channels (SMS, WhatsApp, RCS, Facebook Messenger), the unified Messages API, channel selection guidance, and the recommended setup sequence from first message to production monitoring. Start here before choosing a specific messaging channel."
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

Twilio's Messaging platform sends and receives messages across multiple channels through a single API. All channels use `client.messages.create()` — only the address format changes.

| Channel | Address format | Rich media | Template required? | Reach | Skill |
|---------|---------------|------------|-------------------|-------|-------|
| **SMS/MMS** | `+15551234567` (E.164) | MMS: images/video, US/CA/AU only | No | Global (180+ countries) | `twilio-sms-send-message` |
| **WhatsApp** | `whatsapp:+15551234567` | Yes (images, docs, video, location) | Outside 24hr window: yes | 190+ countries | `twilio-whatsapp-send-message` |
| **RCS** | Same number (via Messaging Service) | Yes (rich cards, carousels, video) | No | US + expanding globally | `twilio-rcs-messaging` |
| **Facebook Messenger** | `messenger:{page-scoped-id}` | Yes | No | Global | — |

---

## Which Channel Should I Use?

| If you need to... | Use | Why |
|-------------------|-----|-----|
| Reach any phone number | SMS | Universal — works on every phone, no app needed |
| Send rich media globally | WhatsApp | Images, docs, video work worldwide (MMS is US/CA/AU only) |
| Send time-sensitive alerts (OTP, outages) | SMS | Highest open rates, no app dependency |
| Reach opted-in audience at lower cost | WhatsApp | No per-message fee in many markets |
| Run marketing campaigns across channels | Start with `twilio-marketing-promotions-advisor` | Planner skill handles channel mix, compliance, and fallback |
| Send transactional notifications | Start with `twilio-notifications-alerts-advisor` | Planner skill handles urgency-based channel routing |

**Not sure?** Use a Planner skill first — it will qualify your use case and recommend the right channel combination.

---

## Unified API

All channels share `messages.create()`. The only difference is the address format in `from` and `to`.

**Python**
```python
import os
from twilio.rest import Client

client = Client(os.environ["TWILIO_ACCOUNT_SID"], os.environ["TWILIO_AUTH_TOKEN"])

# SMS
sms = client.messages.create(
    from_="+15017122661",
    to="+15558675310",
    body="Your order shipped."
)

# WhatsApp — same API, prefixed addresses
whatsapp = client.messages.create(
    from_="whatsapp:+15017122661",
    to="whatsapp:+15558675310",
    body="Your order shipped."
)
```

**Node.js**
```javascript
const client = require("twilio")(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// SMS
const sms = await client.messages.create({
    from: "+15017122661",
    to: "+15558675310",
    body: "Your order shipped.",
});

// WhatsApp — same API, prefixed addresses
const whatsapp = await client.messages.create({
    from: "whatsapp:+15017122661",
    to: "whatsapp:+15558675310",
    body: "Your order shipped.",
});
```

---

## Onboarding Sequence

Set up messaging in this order. Each step builds on the previous.

### Step 1: Foundation
Get a Twilio number, send your first SMS.
- `twilio-account-setup` → `twilio-sms-send-message`

### Step 2: Sender Strategy
Create a Messaging Service and add your numbers to a sender pool. Use `messagingServiceSid` instead of `from` for all production sends — this enables geo-match, sticky sender, and unlocks compliance features.
- `twilio-messaging-services`

### Step 3: Compliance
Register for A2P 10DLC (required for US SMS traffic). Set up opt-out handling.
- `twilio-compliance-onboarding` → `twilio-compliance-traffic`

### Step 4: Protect
Enable SMS pumping protection (prevents artificial traffic inflation) and compliance toolkit (quiet hours, reassigned number detection) on your Messaging Service.
- `twilio-messaging-services` (Compliance Toolkit + SMS Pumping Protection sections)

### Step 5: Add Channels
Add WhatsApp or other channels. Use Content Templates for cross-channel message formatting.
- `twilio-whatsapp-send-message` → `twilio-content-template-builder`

### Step 6: Monitor
Enable intelligent alerts for error pattern detection. Set up status callbacks for delivery tracking.
- `twilio-messaging-services` (Intelligent Alerts section) → `twilio-messaging-webhooks`

---

## CANNOT

- **Cannot send cross-channel in a single API call** — Each `messages.create()` targets one channel. For multi-channel fallback, implement sequencing in your application (e.g., try SMS, on failure send WhatsApp).
- **Cannot use WhatsApp free-form messages outside the 24-hour window** — After 24 hours since the user's last inbound message, you must use a pre-approved template. See `twilio-whatsapp-send-message`.
- **Cannot send MMS outside US, Canada, and Australia** — MMS is only supported on US/CA/AU numbers. For international rich media, use WhatsApp.
- **Cannot use SMS pumping protection or compliance toolkit without a Messaging Service** — These features are configured per Messaging Service. Raw `from` number sends don't get these protections.
- **Cannot mix channels in a single Messaging Service sender pool** — A Messaging Service manages phone numbers for SMS/MMS. WhatsApp senders are configured separately.
- **Cannot guarantee delivery on any channel** — SMS can be carrier-filtered, WhatsApp can queue-timeout (4 hours). Always implement status callbacks to track delivery.

---

## Next Steps

- **Send SMS:** `twilio-sms-send-message`
- **Send RCS:** `twilio-rcs-messaging`
- **Send WhatsApp:** `twilio-whatsapp-send-message`
- **Set up sender pools and production features:** `twilio-messaging-services`
- **Channel selection for marketing:** `twilio-marketing-promotions-advisor`
- **Channel selection for notifications:** `twilio-notifications-alerts-advisor`
