---
name: "import.codex.twilio-developer-kit.twilio-content-template-builder"
description: "Create, manage, and send message templates using Twilio's Content API. Covers template creation for WhatsApp, SMS, RCS, and MMS; variable usage; WhatsApp Meta approval; and sending templates via ContentSid. Use this skill when building structured messages that require pre-approval or consistent formatting across channels."
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

The Content API creates channel-agnostic templates identified by a `ContentSid` (`HX...`). WhatsApp templates must be approved by Meta before use outside the 24-hour service window.

---

## Prerequisites

- Twilio account — New to Twilio? See `twilio-account-setup`
- For WhatsApp templates: active WhatsApp sender
  — See `twilio-whatsapp-send-message` (sandbox) or `twilio-whatsapp-manage-senders` (production)
- Environment variables:
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  — See `twilio-iam-auth-setup` for credential setup and best practices
- SDK: `pip install twilio` / `npm install twilio`

---

## Quickstart

**Step 1 — Create a template via Console** (simplest)

Console > Messaging > Content Template Builder > Create new. Use `{{1}}`, `{{2}}` for variables. Save to get a `ContentSid`.

**Step 2 — Send the template**

**Python**
```python
import os
from twilio.rest import Client

client = Client(os.environ["TWILIO_ACCOUNT_SID"], os.environ["TWILIO_AUTH_TOKEN"])

message = client.messages.create(
    from_="whatsapp:+14155238886",
    to="whatsapp:+15558675310",
    content_sid="HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    content_variables='{"1": "Sarah", "2": "March 28", "3": "10:00 AM"}'
)
print(message.sid)
```

**Node.js**
```node
const twilio = require("twilio");
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const message = await client.messages.create({
    from: "whatsapp:+14155238886",
    to: "whatsapp:+15558675310",
    contentSid: "HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    contentVariables: JSON.stringify({ "1": "Sarah", "2": "March 28", "3": "10:00 AM" }),
});
```

---

## Key Patterns

### Create a Template via API

**Python**
```python
template = client.content.v1.contents.create(
    friendly_name="appointment-reminder",
    language="en",
    types={
        "twilio/text": {
            "body": "Hi {{1}}, your appointment is on {{2}} at {{3}}. Reply YES to confirm."
        }
    }
)
print(template.sid)  # HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Node.js**
```node
const template = await client.content.v1.contents.create({
    friendlyName: "appointment-reminder",
    language: "en",
    types: {
        "twilio/text": {
            body: "Hi {{1}}, your appointment is on {{2}} at {{3}}. Reply YES to confirm.",
        },
    },
});
console.log(template.sid);
```

### Submit for WhatsApp Approval

**Python**
```python
approval = client.content.v1 \
    .contents(template.sid) \
    .approval_requests \
    .create(name="appointment-reminder", category="UTILITY")
print(approval.status)  # PENDING
```

**Node.js**
```node
const approval = await client.content.v1
    .contents(templateSid)
    .approvalRequests.create({ name: "appointment-reminder", category: "UTILITY" });
console.log(approval.status);
```

Categories: `UTILITY`, `MARKETING`, `AUTHENTICATION`

### Check Approval Status

**Python**
```python
content = client.content.v1.contents(template.sid).fetch()
print(content.approval_requests.status)  # APPROVED | REJECTED | PENDING
```

**Node.js**
```node
const content = await client.content.v1.contents(templateSid).fetch();
console.log(content.approvalRequests.status);
```

Approval typically takes under 1 hour.

### List and Delete Templates

**Python**
```python
for template in client.content.v1.contents.list():
    print(template.sid, template.friendly_name, template.language)

client.content.v1.contents("HXxxxxxxxxxx").delete()
```

**Node.js**
```node
const templates = await client.content.v1.contents.list();
templates.forEach(t => console.log(t.sid, t.friendlyName, t.language));

await client.content.v1.contents("HXxxxxxxxxxx").remove();
```

### Supported Content Types

| Type | `types` key | Channels |
|------|------------|---------|
| Plain text | `twilio/text` | All |
| Media (image, video) | `twilio/media` | WhatsApp, MMS, RCS |
| Quick reply buttons | `twilio/quick-reply` | WhatsApp, RCS |
| Call-to-action buttons | `twilio/call-to-action` | WhatsApp, RCS |
| List picker | `twilio/list-picker` | WhatsApp |
| Card | `twilio/card` | RCS |
| Carousel | `twilio/carousel` | RCS |

### RCS Fallback Text

When sending a rich RCS template (card, carousel, quick reply) via a Messaging Service with SMS fallback configured, Twilio uses the template's `twilio/text` body as the SMS fallback copy. Any template intended for RCS should include a `twilio/text` entry so recipients on non-RCS devices still receive a readable message.

---

## Variable Rules

- Use `{{1}}`, `{{2}}` — sequential, no skipping
- Max 100 variables per template
- Provide sample values for WhatsApp submissions
- Non-variable to variable ratio must be at least `(2x + 1) : x`

---

## CANNOT

- **Cannot use WhatsApp templates without Meta approval** — Plan for up to 24 hours review time
- **Cannot resubmit a rejected template with the same name** — Use a different name for resubmission
- **Cannot include custom variables in AUTHENTICATION templates** — Fixed format required by Meta

---

## Next Steps

- **Channel overview and onboarding guide:** `twilio-messaging-overview`
- **Send WhatsApp messages:** `twilio-whatsapp-send-message`
- **Register a production WhatsApp sender:** `twilio-whatsapp-manage-senders`
