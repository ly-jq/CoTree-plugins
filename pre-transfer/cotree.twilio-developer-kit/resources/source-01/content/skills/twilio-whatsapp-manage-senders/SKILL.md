---
name: "import.codex.twilio-developer-kit.twilio-whatsapp-manage-senders"
description: "Create, configure, and manage WhatsApp Business senders via Twilio's Channels Senders API. Covers programmatic sender registration, profile setup, webhook configuration, sender lifecycle statuses, and ISV flows. Use this skill to register and manage production WhatsApp senders at scale."
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

A WhatsApp sender is a phone number registered with WhatsApp Business through Twilio. Registration goes through a lifecycle of statuses before becoming `ONLINE`. Sandbox testing does not require a registered sender — see `twilio-whatsapp-send-message`.

---

## Prerequisites

- Upgraded Twilio account (trial accounts cannot register production senders)
  — See `twilio-account-setup` for signup and upgrade steps
- A phone number capable of receiving SMS or voice verification
- Number must not already be registered with WhatsApp
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

# Step 1: Initiate registration
sender = client.messaging.v2.channels.senders.create(
    sender_id="whatsapp:+15017122661",
    verification_method="sms"
)
print(sender.sid)     # XExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
print(sender.status)  # CREATING

# Step 2: Submit the OTP Twilio sends to the number
sender = client.messaging.v2.channels.senders(sender.sid).update(
    verification_code="123456"
)
print(sender.status)  # ONLINE (may pass through TWILIO_REVIEW first)
```

**Node.js**
```node
const twilio = require("twilio");
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Step 1: Initiate registration
const sender = await client.messaging.v2.channels.senders.create({
    senderId: "whatsapp:+15017122661",
    verificationMethod: "sms",
});
console.log(sender.sid, sender.status);

// Step 2: Submit the OTP
const verified = await client.messaging.v2.channels.senders(sender.sid).update({
    verificationCode: "123456",
});
console.log(verified.status);
```

---

## Sender Lifecycle Statuses

| Status | Meaning |
|--------|---------|
| `CREATING` | Registration initiated |
| `PENDING_VERIFICATION` | Awaiting OTP submission |
| `VERIFYING` | OTP being validated |
| `TWILIO_REVIEW` | Under Twilio/Meta review |
| `ONLINE` | Active and ready to send |
| `OFFLINE` | Inactive — check `offlineReasons` |
| `DRAFT` | Incomplete registration |

---

## Key Patterns

### Set Business Profile

**Python**
```python
sender = client.messaging.v2.channels.senders(SENDER_SID).update(
    profile_name="Acme Support",
    profile_about="Official support channel for Acme Corp",
    profile_address="123 Main St, San Francisco, CA",
    profile_vertical="PROFESSIONAL_SERVICES",
    profile_logo_url="https://acme.com/logo.png",
    profile_websites=["https://acme.com"]
)
```

**Node.js**
```node
const sender = await client.messaging.v2.channels.senders(SENDER_SID).update({
    profileName: "Acme Support",
    profileAbout: "Official support channel for Acme Corp",
    profileAddress: "123 Main St, San Francisco, CA",
    profileVertical: "PROFESSIONAL_SERVICES",
    profileLogoUrl: "https://acme.com/logo.png",
    profileWebsites: ["https://acme.com"],
});
```

### Configure Webhooks

**Python**
```python
sender = client.messaging.v2.channels.senders(SENDER_SID).update(
    callback_url="https://yourapp.com/whatsapp/inbound",
    callback_method="POST",
    status_callback_url="https://yourapp.com/whatsapp/status"
)
```

**Node.js**
```node
await client.messaging.v2.channels.senders(SENDER_SID).update({
    callbackUrl: "https://yourapp.com/whatsapp/inbound",
    callbackMethod: "POST",
    statusCallbackUrl: "https://yourapp.com/whatsapp/status",
});
```

### Retrieve and List Senders

**Python**
```python
sender = client.messaging.v2.channels.senders(SENDER_SID).fetch()
print(sender.status)

for s in client.messaging.v2.channels.senders.list():
    print(s.sid, s.status)
```

**Node.js**
```node
const sender = await client.messaging.v2.channels.senders(SENDER_SID).fetch();
const senders = await client.messaging.v2.channels.senders.list();
senders.forEach(s => console.log(s.sid, s.status));
```

If a sender is `OFFLINE`, check the `offlineReasons` array in the response (e.g. code `63020` means business hasn't accepted Twilio's Meta invitation).

### Migrate an Existing WhatsApp Number

If a number is already registered on WhatsApp (personal or business):
1. Check: `https://wa.me/<PHONE_NUMBER>?text=hi`
2. Delete the existing WhatsApp account on the device, or disable 2FA on the competing platform
3. Proceed with registration above

### ISV / Tech Provider Flow

Register senders under a client's WhatsApp Business Account (WABA):

**Python**
```python
sender = client.messaging.v2.channels.senders.create(
    sender_id="whatsapp:+15017122661",
    waba_id="client-waba-id"
)
```

**Node.js**
```node
const sender = await client.messaging.v2.channels.senders.create({
    senderId: "whatsapp:+15017122661",
    wabaId: "client-waba-id",
});
```

The client must accept Twilio's invitation in their Meta Business Manager.

---

## CANNOT

- **Cannot register a phone number to multiple WABAs** — Each number belongs to one WABA at a time
- **Cannot exceed 2 senders without Meta Business Verification** — Unverified accounts are limited to 2
- **Cannot exceed 20 senders without exception** — Verified Meta Business Manager: max 20 (50 with exception request)
- **Cannot verify phone number only via SMS** — Voice verification is available if SMS cannot be received

---

## Next Steps

- **Send WhatsApp messages with this sender:** `twilio-whatsapp-send-message`
- **Create message templates:** `twilio-content-template-builder`
- **Send WhatsApp OTPs:** `twilio-verify-send-otp`
