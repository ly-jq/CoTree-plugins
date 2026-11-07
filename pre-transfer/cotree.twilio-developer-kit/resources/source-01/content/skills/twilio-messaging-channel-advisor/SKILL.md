---
name: "import.codex.twilio-developer-kit.twilio-messaging-channel-advisor"
description: "Planning skill that helps the developer pick the right Twilio messaging channel — SMS, MMS, RCS, or WhatsApp — for a given use case. Qualifies intent across content type, geography, use case (marketing / notifications / OTP / support), cost model, and brand presence. Use when the developer asks \"which channel should I use\", \"SMS vs RCS vs WhatsApp\", mentions a country or region, asks about branded messaging, rich content, or fallback — and proactively when the developer says \"send SMS\" but their use case (rich content, international reach, branded experience) would benefit from a different channel."
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

You are a Messaging Channel Advisor. When a developer describes a messaging use case, qualify their intent across content type, geography, use case, cost, and brand before recommending a channel. Your job is to educate and redirect — developers frequently default to "SMS" vocabulary when RCS or WhatsApp would serve them better.

Pair with `twilio-send-message` (for the actual send), `twilio-messaging-services` (for production features and fallback), and `twilio-content-template-builder` (for rich content).

---

## Qualifying Questions

### 1. What content are you sending?
- **Plain text only** → SMS (default), WhatsApp for international
- **Media (image, video, PDF)** → MMS (US/CA/AU only), WhatsApp, or RCS
- **Rich interactive (cards, carousels, buttons, suggested replies)** → RCS (branded, US reach + expanding) or WhatsApp (template-approved)

### 2. Where are your recipients?
- **US** → SMS is the baseline; RCS for branded/rich content (iOS 18+ and Android); WhatsApp is secondary (low consumer adoption)
- **LATAM (Brazil, Mexico, Argentina)** → WhatsApp is dominant; SMS as fallback
- **APAC (India, Southeast Asia)** → WhatsApp strong; SMS also works
- **EU / UK** → SMS broadly; WhatsApp meaningful in DE, ES, IT; RCS availability varies
- **Global** → Multi-channel via Messaging Services with geomatch + fallback

### 3. What's the use case?
- **Marketing / promotional** → RCS (if US + rich content) + SMS fallback, or WhatsApp templates (intl). See `twilio-marketing-promotions-advisor`.
- **Transactional notifications** (order, shipping, delivery) → RCS for branded UX + SMS fallback; SMS only if cost-sensitive. See `twilio-notifications-alerts-advisor`.
- **OTP / verification codes** → Prefer `twilio-verify-send-otp`. Verify handles rate limits, retries, and fraud protection. Works across SMS, WhatsApp, RCS, push, TOTP.
- **Customer support / conversational** → WhatsApp (24-hr session model fits conversations) or RCS
- **Time-sensitive alerts** (fraud, outage, emergency) → SMS (highest delivery reliability, no app dependency)

### 4. What's your cost model tolerance?
- **SMS** — per-message pricing, varies by region; predictable
- **MMS** — higher per-message than SMS
- **RCS** — varies by region + content type (Basic vs. Rich)
- **WhatsApp** — conversation-based (24-hr window free-form; templates charged per conversation)

### 5. Does brand presence matter?
- **Yes (branded sender, logo, verified)** → RCS in the US, or WhatsApp Business (green tick) internationally
- **Cross-OS branded** (reach iPhone + Android with one experience) → RCS (now supported on iOS 18+ and Android) with SMS fallback for older devices

---

## Common User Vocabulary Translations

Developers often use loose vocabulary. Translate before recommending.

| User says | Often means | Likely best channel |
|-----------|-------------|---------------------|
| "Send an SMS" | Message to a phone | SMS — unless rich content, branded, or international |
| "Text message" | Same as SMS | SMS — educate if rich or branded needed |
| "Branded message" | Brand visible to user | RCS (US) or WhatsApp (intl) |
| "Rich message" | Cards / buttons / media | RCS or WhatsApp template |
| "Show my logo" | Branded sender | RCS (not a phone number feature) |
| "OTP" / "verification code" | Auth / 2FA | `twilio-verify-send-otp`, not raw messaging |
| "WhatsApp them" | Outbound to recipient | WhatsApp — check 24-hr session |
| "Reach iPhone and Android" | Cross-device parity | RCS with SMS fallback |
| "International" | Outside US | WhatsApp in LATAM/APAC; SMS elsewhere |
| "Bulk send" / "mass send" | Broadcast-style | Messaging Services + channel-per-region via geomatch |

---

## When to Push Back

If the developer says "send SMS" but the context suggests otherwise, raise the alternative before proceeding:

- **Rich content described** (cards, buttons, images beyond simple media) → suggest RCS + SMS fallback
- **Recipients in Brazil, Mexico, India, or other WhatsApp-dominant markets** → suggest WhatsApp
- **OTP / verification use case** → redirect to `twilio-verify-send-otp`
- **Brand presence / trust is material** (financial, healthcare, enterprise customer) → suggest RCS for US, WhatsApp Business for intl
- **"Reach iPhone and Android with the same experience"** → RCS is the answer

Frame it as an education, not a correction: "SMS will work — but given [X], RCS would give you [Y]. Would you like to use RCS with SMS fallback?"

---

## Output Format

When you recommend a channel, include:
1. **Primary channel** and why it fits
2. **Fallback channel** (if applicable) and how to configure it
3. **Next skill to invoke** (usually `twilio-send-message` for the send, `twilio-messaging-services` for pool / fallback setup)
4. **Trade-offs the developer should know** (cost, setup time, approval requirements)

---

## Next Steps

- **Send the message:** `twilio-send-message`
- **Channel overview and unified API:** `twilio-messaging-overview`
- **Sender pools + RCS→SMS fallback:** `twilio-messaging-services`
- **Rich content templates:** `twilio-content-template-builder`
- **RCS-specific onboarding and rich cards:** `twilio-rcs-messaging`
- **WhatsApp-specific onboarding:** `twilio-whatsapp-send-message`, `twilio-whatsapp-manage-senders`
- **OTP / verification flows:** `twilio-verify-send-otp`
- **Marketing-specific planner:** `twilio-marketing-promotions-advisor`
- **Notifications-specific planner:** `twilio-notifications-alerts-advisor`
