---
name: "import.codex.twilio-developer-kit.twilio-whatsapp-send-message"
description: "WhatsApp messaging deep-dive reference. Covers the 24-hour service window rules (free-form vs template mode), sandbox setup for testing, template approval workflow, production sender requirements, and WhatsApp-specific error handling. For sending WhatsApp messages, use twilio-send-message instead. Use this skill when setting up WhatsApp for the first time or debugging WhatsApp-specific delivery behavior."
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

**WhatsApp is one channel in Twilio's Messaging platform.** All channels share the same `messages.create()` API — see `twilio-messaging-overview` for the full channel comparison and onboarding sequence.

Twilio routes WhatsApp through the Programmable Messaging API — all numbers use `whatsapp:+E.164` prefix. Two sending modes apply: **free-form** (within 24 hrs of last inbound) and **template** (anytime). Sending free-form outside the window causes silent delivery failure — always check which mode is required.

| Mode | When allowed | Parameters |
|------|-------------|------------|
| Free-form | Within 24 hrs of last inbound from user | `body`, optional `mediaUrl` |
| Template | Anytime | `contentSid` + `contentVariables` |

---

## Prerequisites

- Twilio account with WhatsApp enabled
  — New to Twilio? See `twilio-account-setup`
- Environment variables:
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  — See `twilio-iam-auth-setup` for credential setup and best practices
- SDK: `pip install twilio` / `npm install twilio`
- Recipient opted in to receive messages from your WhatsApp Business Account

**Testing (sandbox):** Join by texting `join <your-code>` to `+14155238886`. No registration needed — see [Console > Messaging > Try it out > Send a WhatsApp message](https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn). Sandbox participants must re-join every 3 days.

**Production:** Register a WhatsApp Business sender first — see `twilio-whatsapp-manage-senders`.

---

## Quickstart

**Python**
```python
import os
from twilio.rest import Client

client = Client(os.environ["TWILIO_ACCOUNT_SID"], os.environ["TWILIO_AUTH_TOKEN"])

message = client.messages.create(
    from_="whatsapp:+14155238886",   # Sandbox sender (or your production number)
    to="whatsapp:+15005550006",      # Must have joined the sandbox
    body="Your order has been confirmed."
)

print(message.sid)     # MMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
print(message.status)  # queued | sent | delivered | failed
```

**Node.js**
```node
const twilio = require("twilio");
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const message = await client.messages.create({
    from: "whatsapp:+14155238886",
    to: "whatsapp:+15005550006",
    body: "Your order has been confirmed.",
});

console.log(message.sid);
console.log(message.status);
```

---

## Key Patterns

### Send a Template Message (outside service window)

Templates are created in Console > Messaging > Content Template Builder and must be approved by Meta. See `twilio-content-template-builder` for template creation.

**Python**
```python
message = client.messages.create(
    from_="whatsapp:+14155238886",
    to="whatsapp:+15005550006",
    content_sid="HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    content_variables='{"1": "March 25", "2": "2:00 PM"}'
)
```

**Node.js**
```node
const message = await client.messages.create({
    from: "whatsapp:+14155238886",
    to: "whatsapp:+15005550006",
    contentSid: "HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    contentVariables: JSON.stringify({ "1": "March 25", "2": "2:00 PM" }),
});
```

### Send Media (free-form only)

Max file size: 16 MB.

**Python**
```python
message = client.messages.create(
    from_="whatsapp:+14155238886",
    to="whatsapp:+15005550006",
    body="Here is your invoice.",
    media_url=["https://example.com/invoice.pdf"]
)
```

**Node.js**
```node
const message = await client.messages.create({
    from: "whatsapp:+14155238886",
    to: "whatsapp:+15005550006",
    body: "Here is your invoice.",
    mediaUrl: ["https://example.com/invoice.pdf"],
});
```

---

## Response Fields

| Field | Description |
|-------|-------------|
| `sid` | Unique message identifier (`MM...`) |
| `status` | `queued`, `sent`, `delivered`, `read`, `failed`, `undelivered` |
| `error_code` | Populated on failure |
| `error_message` | Human-readable error description |
| `date_sent` | UTC timestamp |

---

## Common Errors

| Code | Meaning | Fix |
|------|---------|-----|
| 63003 | Invalid WhatsApp destination number | Verify number is WhatsApp-enabled and correctly formatted |
| 63018 | Rate limit exceeded on sender | Reduce send rate; default is 80 MPS |
| 63020 | Business hasn't accepted Twilio's Meta invitation | Accept invite in Meta Business Manager |
| N/A | Free-form outside window | Switch to a template message |

---

## CANNOT

- **Cannot exceed 80 messages/second per sender** — Text-only can be raised to 400 MPS on request
- **Cannot queue messages beyond 4 hours** — Undelivered messages fail after 4 hours
- **Cannot exceed sandbox throttle limits** — 1 message per 3 seconds, 50 messages/day on trial, participants expire after 3 days
- **Cannot send without opt-in** — Sending without recipient opt-in risks account suspension
- **Cannot use WhatsApp Groups API** — Deprecated April 2020. Use Conversations API instead.

---

## Next Steps

- **Channel overview and onboarding guide:** `twilio-messaging-overview`
- **Register a production WhatsApp sender:** `twilio-whatsapp-manage-senders`
- **Create and manage message templates:** `twilio-content-template-builder`
- **Multi-channel conversations with history:** `twilio-conversations-api`
