---
name: "import.codex.twilio-developer-kit.twilio-security-compliance-hipaa"
description: "Configure Twilio accounts for HIPAA compliance. Covers BAA requirements, HIPAA Project designation (self-service and support), eligible services list, per-product requirements (Voice, SMS, ConversationRelay, Conversation Intelligence, Flex, Verify), message redaction, and what is NOT eligible. Use this skill when developers are building healthcare workflows on Twilio."
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

HIPAA compliance on Twilio is a **shared responsibility** — Twilio provides eligible services and configuration tools, but your application must architect correctly. Getting this wrong means PHI exposure and compliance violations.

**Sequence:** Execute BAA → Designate HIPAA Project(s) → Use only eligible services → Follow per-product requirements

---

## Step 1: Execute a BAA

- Contact your Twilio Account Representative to execute a Business Associate Addendum
- Purchase a **Twilio Editions package** that includes HIPAA Accounts
- BAA is required before any PHI touches Twilio infrastructure

---

## Step 2: Designate HIPAA Project(s)

### Self-Service (BAA initiated after June 6, 2024)

1. Create an Organization in Twilio Console
2. Link accounts/projects/subaccounts to the Organization
3. Console → Twilio Admin → Accounts → Select account → Enable HIPAA flag
4. Save

### Support Ticket (BAA initiated before June 6, 2024)

Open a Support ticket through Console to request HIPAA designation for specific accounts/projects/subaccounts.

### Subaccount Behavior

- **Existing subaccounts are NOT auto-designated** — Must be individually flagged
- **New subaccounts created AFTER designation DO auto-inherit** HIPAA status
- Verify each subaccount's HIPAA flag — don't assume inheritance

### What Changes When HIPAA Is Enabled

- Console auto-logoff after 15 minutes of inactivity
- Account exempt from certain content moderation (but still subject to carrier complaint review)
- No PHI in support tickets — use SIDs (CallSid, MessageSid) instead of phone numbers

---

## HIPAA Eligible Services

### Eligible (use these for PHI workflows)

| Category | Services |
|----------|----------|
| **Voice** | Programmable Voice, Recordings*, Transcription*, Media Streams*, ConversationRelay*, Conversational Intelligence for Voice*, SIP Interface*, Elastic SIP Trunking*, Voice Insights, AMD, `<Pay>`, Conference, Coaching, Transfers |
| **SMS** | Programmable SMS, MMS, Long Codes, Toll-Free, Short Codes, Messaging Services (opt-out, fallback, geomatch, sticky sender, scheduling, link shortening) |
| **Identity** | Verify (SMS + Voice + Push only), Lookup |
| **Conversations** | Chat, SMS, MMS, Group Texting (NOT WhatsApp) |
| **Flex** | Voice, SMS, Chat, Conversations, Webchat 3.x.x*, TaskRouter, Proxy, Flex Insights* |
| **Segment** | Connections (Sources, Destinations*, Functions*), Reverse ETL*, Unify, Engage Foundations*, Protocols, Privacy Portal* |
| **Runtime** | Studio*, Functions, Debugger, API Explorer, Sync, Private Assets*, TwiML Bin* |
| **Data** | Event Streams |

*Items marked with * require additional configuration per "Architecting for HIPAA on Twilio" guidance.*

### NOT Eligible (do NOT use for PHI)

- **WhatsApp** — Meta does not offer a BAA
- **SendGrid Email** (including Email in Flex and Verify Email channel)
- **AI Assistants** (including Voice for AI Assistants)
- **Verify Fraud Guard**
- **Conversational Intelligence for Conversations** (only Voice channel is eligible)
- **Agent Copilot**, **Unified Profiles** in Flex
- **Engage Premier**, **Generative Audiences**, **Campaigns**
- **Twilio Marketplace add-ons** — even with third-party BAA
- **Autopilot**
- **Flex Webchat 2.x.x** (must migrate to 3.x.x)

**Geographic restriction:** Only US area codes for Voice and SMS HIPAA traffic.

---

## Per-Product Requirements

### Voice & Recordings

- **HTTP auth required for recording URLs** — Enable in Console → Voice Settings. Recording URLs are public by default.
- **Voice Recording Encryption recommended** — Encrypts with your public key before cloud storage
- **ConversationRelay:** Your AI Provider must have their own BAA. Cannot use for clinical/medical decision-making.
- **Conversation Intelligence for Voice:** Only Azure OpenAI for generative operators. No PHI in operator prompts. Data use auto-disabled for HIPAA accounts. PII Redaction recommended (auto-redacts 21 PHI field types).

### SMS & MMS

- **HTTP auth required for MMS Media URLs** — Enable in Console → Messaging → Settings → General
- **Message Redaction recommended** — Redacts message bodies and phone numbers from Console/API/support
- **No PHI in Message Tags** — custom attributes in Message Tagging must not contain PHI
- **Message Redaction prerequisites:**
  1. Disable Sticky Sender and Fallback to Long Code on Messaging Services
  2. Contact Support to disable built-in STOP filtering (then implement custom STOP handling)
  3. Set all webhooks to POST (GET logs params for 7 days, defeating redaction)
  4. Incompatible with Studio, Flex, and Conversations

### Verify

- **Only SMS, Voice, and Push channels** — Email channel is NOT eligible
- **Fraud Guard is NOT eligible** — do not enable for HIPAA workflows

### Flex

- **Flex Insights:** Twilio auto-redacts PII from TaskRouter attributes (names, phone, email). Visual waveform and speech metrics disabled.
- **Customer must:** Ensure no PHI in preserved Attribute fields, Comments, or Assessments. Implement session timeout (Flex has no built-in timeout). Secure Flex Plugins for HIPAA.
- **No WhatsApp, Facebook Messenger, or SendGrid Email** in Flex HIPAA workflows

### Event Streams

- Customer responsible for HIPAA-compliant sink configuration (e.g., AWS Kinesis requires Amazon's HIPAA architecture)
- Non-eligible product event types must not process PHI

---

## CANNOT

- **Cannot use WhatsApp for HIPAA workflows** — Meta does not offer a BAA. Applies to all Twilio products (Conversations, Flex, Frontline).
- **Cannot use SendGrid Email** — Not HIPAA eligible in any context (Verify, Flex, standalone).
- **Cannot use Verify Fraud Guard or Email channel** — Not eligible. Only SMS, Voice, Push.
- **Cannot use AI Assistants** — Even with ConversationRelay, AI Assistants integration is not eligible.
- **Cannot use non-US area codes** — Voice and SMS HIPAA traffic limited to US area codes.
- **Cannot put PHI in support tickets** — Use SIDs for troubleshooting. Use Console chat, email, or Support Center.
- **Cannot assume subaccount HIPAA inheritance** — Existing subaccounts must be individually flagged.
- **Cannot use GET webhooks with Message Redaction** — GET parameters are logged for 7 days.
- **Cannot use Marketplace add-ons** — Even with a third-party BAA, Marketplace is not eligible.
- **Cannot use Conversation Intelligence for Conversations** — Only Voice channel is HIPAA eligible.

---

## Next Steps

- **Authentication setup:** `twilio-security-api-auth`
- **Account structure for HIPAA isolation:** `twilio-account-setup`
- **Credential security:** `twilio-security-hardening`
- **Traffic compliance (TCPA, GDPR, PCI):** `twilio-compliance-traffic`

**Official docs:** [HIPAA Eligible Services (PDF)](https://www.twilio.com/content/dam/twilio-com/global/en/other/hipaa/pdf/HIPAA-Eligible-Services.pdf) | [Architecting for HIPAA (PDF)](https://www.twilio.com/content/dam/twilio-com/global/en/other/hipaa/pdf/Architecting-for-HIPAA.pdf) | [HIPAA account flag](https://www.twilio.com/docs/iam/organizations#turn-on-hipaa-and-eligible-accounts) | [Message Redaction](https://www.twilio.com/docs/messaging/guides/privacy-message-redaction)
