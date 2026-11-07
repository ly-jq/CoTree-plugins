---
name: "import.codex.twilio-developer-kit.twilio-sendgrid-suppressions"
description: "Manage SendGrid email suppressions: bounces, blocks, spam reports, invalid emails, global unsubscribes, and ASM suppression groups. Covers when and how to remove suppressions, reputation impact, and category-based unsubscribe management. Use when debugging SendGrid delivery issues or building unsubscribe flows. Requires a SendGrid API key (SG.-prefix) — not applicable to the Twilio Email API (comms.twilio.com)."
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

Suppressions prevent SendGrid from sending to addresses that have bounced, reported spam, or unsubscribed. They protect your sender reputation but can also block legitimate re-sends if not managed correctly.

---

## Suppression Types

| Type | Endpoint | What triggers it | Auto-added? |
|------|----------|-----------------|-------------|
| **Hard Bounces** | `/v3/suppression/bounces` | Permanent delivery failure (invalid mailbox, domain doesn't exist) | Yes |
| **Soft Bounces** | No management API — automatic retry only | Temporary failure (mailbox full, server down) — SendGrid auto-retries before suppressing | Yes, after repeated failures |
| **Blocks** | `/v3/suppression/blocks` | Temporary rejection by receiving server (reputation, policy, content) | Yes |
| **Spam Reports** | `/v3/suppression/spam_reports` | Recipient marks email as spam | Yes |
| **Invalid Emails** | `/v3/suppression/invalid_emails` | Malformed email address | Yes |
| **Global Unsubscribes** | `/v3/suppression/unsubscribes` | Recipient unsubscribes from all email | Yes |
| **Group Unsubscribes (ASM)** | `/v3/asm/groups/{id}/suppressions` | Recipient unsubscribes from a category | Yes |

**Hard vs Soft bounces:** Hard bounces (permanent) immediately suppress the address. Soft bounces (temporary) trigger retries — SendGrid will retry delivery before eventually suppressing if the issue persists.

---

## Managing Suppressions

**List bounces (Python)**
```python
import os, requests

headers = {"Authorization": f"Bearer {os.environ['SENDGRID_API_KEY']}"}
response = requests.get("https://api.sendgrid.com/v3/suppression/bounces", headers=headers)
for bounce in response.json():
    print(f"{bounce['email']}: {bounce.get('reason', 'unknown')}")
```

**Remove a bounce (Python)**
```python
requests.delete(f"https://api.sendgrid.com/v3/suppression/bounces/{email}", headers=headers)
```

> **Caution:** Deleting suppression records (especially spam reports) allows re-sending to addresses that previously complained. Always confirm with the user before removal and document the business reason.

---

## ASM Suppression Groups

Use suppression groups for category-based unsubscribes (e.g., "Marketing", "Transactional", "Product Updates"). Recipients can unsubscribe from one category without being suppressed from all email.

**Create a group:**
```python
requests.post("https://api.sendgrid.com/v3/asm/groups",
    headers={**headers, "Content-Type": "application/json"},
    json={"name": "Marketing Emails", "description": "Promotional offers and updates"})
```

**Send with a suppression group:**
Include `asm.group_id` in your Mail Send request. Recipients see a "manage preferences" link instead of a global unsubscribe.

---

## Auto-Purge (Bounce & Block Cleanup)

Configure automatic purge schedules in Console > Settings > Mail Settings > Purge Bounces & Blocks:

- **Soft Bounces:** Auto-purge after N days (1–3,650 days)
- **Hard Bounces:** Auto-purge after N days (1–3,650 days)

**Caution:** Enabling auto-purge without a business reason allows re-sending to previously bounced addresses, which damages sender reputation. Do not use as a workaround to force delivery.

---

## Address Allow List

Console > Settings > Mail Settings > Address Allow List allows specific email addresses or domains to bypass all suppressions. Useful for internal testing addresses.

**Use with extreme caution** — never allowlist domains you don't control (e.g., `gmail.com`), and never use to bypass spam report suppressions.

---

## CANNOT

- **Suppressions are global by default** — A bounce or spam report on ANY email suppresses the address from ALL future sends. Use ASM groups to scope unsubscribes.
- **Removing a suppression does not fix the underlying issue** — Deleting a bounce record lets you retry, but the mailbox is likely still invalid. Re-sending to hard bounces damages sender reputation.
- **Cannot prevent spam report suppressions** — When a recipient marks you as spam, the suppression is automatic and cannot be overridden.
- **Cannot bulk-remove suppressions by domain** — Must remove individually by email address via API.

---

## Next Steps

- **Send email:** `twilio-sendgrid-email-send`
- **Delivery tracking:** `twilio-sendgrid-webhooks`
- **Account setup:** `twilio-sendgrid-account-setup`
