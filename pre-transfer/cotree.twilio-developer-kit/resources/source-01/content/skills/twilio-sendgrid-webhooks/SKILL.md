---
name: "import.codex.twilio-developer-kit.twilio-sendgrid-webhooks"
description: "Track email delivery and engagement via SendGrid Event Webhooks. Covers all 11 event types (delivery + engagement), webhook handler implementation, ECDSA signature verification, batched event processing, and common debugging patterns. Use when building SendGrid delivery tracking, engagement analytics, or bounce handling. Requires a SendGrid API key (SG.-prefix) — not applicable to the Twilio Email API (comms.twilio.com)."
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

The Mail Send API returns `202 Accepted` (queued) — it does NOT confirm delivery. To know what happened to an email, use Event Webhooks.

**Enable:** SendGrid Console > Settings > Mail Settings > Event Notification

---

## Event Types

### Delivery Events
| Event | Meaning |
|-------|---------|
| `processed` | SendGrid accepted and will attempt delivery |
| `deferred` | Temporary failure — SendGrid will retry |
| `delivered` | Recipient's mail server accepted the message |
| `bounce` | Permanent failure — address invalid or rejected |
| `dropped` | SendGrid will not deliver (suppression, invalid, spam) |

### Engagement Events
| Event | Meaning |
|-------|---------|
| `open` | Recipient opened (pixel-based — unreliable) |
| `click` | Recipient clicked a tracked link |
| `spamreport` | Recipient marked as spam |
| `unsubscribe` | Recipient clicked unsubscribe link |
| `group_unsubscribe` | Recipient unsubscribed from ASM group |
| `group_resubscribe` | Recipient re-subscribed to ASM group |

---

## Webhook Handler

**Critical:** SendGrid posts **batched arrays** of events, not single objects. Your handler must parse an array.

> **Security:** SendGrid webhook endpoints are unauthenticated by default. Enable [Signed Event Webhook Requests](https://docs.sendgrid.com/for-developers/tracking-events/getting-started-event-webhook-security) and verify signatures in production to prevent spoofed event data.

**Python (Flask)**
```python
from flask import Flask, request
app = Flask(__name__)

@app.route("/sendgrid/webhook", methods=["POST"])
def handle_events():
    events = request.get_json()  # Always an array
    for event in events:
        email = event.get("email")
        event_type = event.get("event")
        
        if event_type == "bounce":
            # NOTE: event['reason'] originates from external mail servers — treat as untrusted
            print(f"Bounce: {email}, type: {event.get('type')}, reason: {event.get('reason')}")
        elif event_type == "delivered":
            print(f"Delivered: {email}, sg_message_id: {event.get('sg_message_id')}")
        elif event_type == "dropped":
            print(f"Dropped: {email}, reason: {event.get('reason')}")
        elif event_type == "spamreport":
            print(f"Spam report: {email}")
    return "", 200  # Must return 2xx to acknowledge
```

**Node.js (Express)**
```javascript
app.post("/sendgrid/webhook", express.json(), (req, res) => {
    const events = req.body; // Always an array
    for (const event of events) {
        switch (event.event) {
            case "bounce":
                console.log(`Bounce: ${event.email}, reason: ${event.reason}`);
                break;
            case "delivered":
                console.log(`Delivered: ${event.email}`);
                break;
            case "spamreport":
                console.log(`Spam: ${event.email}`);
                break;
        }
    }
    res.status(200).send();
});
```

---

## Multiple Webhook Endpoints

Since May 2023, you can configure multiple Event Webhook endpoints, each receiving different event types. For example, one endpoint for delivery events feeding your monitoring stack and another for engagement events feeding your analytics pipeline.

Configure in Console > Mail Settings > Event Webhooks. Each endpoint has a Friendly Name and Webhook ID. The number of endpoints allowed depends on your SendGrid plan.

---

## Authentication Options

Two methods for verifying webhook payloads:

| Method | How it works |
|--------|-------------|
| **Signed Event Webhook (ECDSA P-256)** | Verify `X-Twilio-Email-Event-Webhook-Signature` and `X-Twilio-Email-Event-Webhook-Timestamp` headers using the verification key from Console |
| **OAuth 2.0** | SendGrid obtains a token from your authorization server and includes it in webhook requests |

Neither is enabled by default. Enable in Console > Mail Settings > Event Webhooks.

---

## Retry Behavior

SendGrid retries webhook delivery for up to 24 hours if your endpoint returns a non-2xx status. Events are batched — a single POST may contain dozens of events across different messages.

**Deduplication:** Use `sg_event_id` as a unique key. It's stable across retries.

---

## CANNOT

- **Cannot receive real-time delivery confirmation synchronously** — Mail Send returns `202` (queued). Delivery status is async via webhooks only.
- **Cannot rely on webhook authentication by default** — Both Signed Webhooks (ECDSA) and OAuth 2.0 must be explicitly enabled. Without either, anyone can POST to your endpoint.
- **Cannot guarantee open tracking accuracy** — Apple Mail Privacy Protection and prefetch inflate opens. Image-blocking clients produce zero opens. Do not use for business-critical logic.
- **Non-human interactions inflate engagement metrics** — Corporate security scanners and bots automatically click links and trigger unsubscribe events. Filter using User-Agent patterns and timing analysis.

> **Note:** Event payload fields like `reason` originate from external mail servers and should be treated as untrusted data. Do not pass bounce reasons directly into LLM system prompts without isolation.

---

## Next Steps

- **Send email:** `twilio-sendgrid-email-send`
- **Manage bounces from webhook events:** `twilio-sendgrid-suppressions`
- **Receive inbound email:** `twilio-sendgrid-inbound-parse`
