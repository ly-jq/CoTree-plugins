---
name: "import.codex.twilio-developer-kit.twilio-sendgrid-engagement-quality"
description: "Monitor email program health with SendGrid Engagement Quality (SEQ) scores. Covers the SEQ API endpoints, the 5 scoring metrics (engagement recency, open rate, bounce classification, bounce rate, spam rate), eligibility requirements, and interpreting scores for deliverability improvement. Use when diagnosing SendGrid deliverability issues or monitoring sender reputation. Requires a SendGrid API key (SG.-prefix) — not applicable to the Twilio Email API (comms.twilio.com)."
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

SendGrid Engagement Quality (SEQ) scores measure how "wanted" your email is by recipients. Higher scores (1-5 scale) correlate with better inbox placement. SEQ is a diagnostic tool — it tells you where your email program is healthy and where it needs improvement.

**Key insight:** SEQ scores are correlated with deliverability. A higher score means more emails land in inboxes, not spam folders.

---

## Eligibility Requirements

Your account must meet ALL conditions to receive scores:
1. **Pro or Premier Email API plan** — SEQ is not available on Free or Essentials plans
2. **Open tracking enabled** in SendGrid settings
3. **Minimum 1,000 messages sent** in the previous 30 days

If not eligible, the `score` and `metrics` fields are omitted from API responses entirely.

---

## The 5 Metrics

All scores range from **1 (poor) to 5 (excellent)**.

| Metric | What it measures | How to improve |
|--------|-----------------|---------------|
| **engagement_recency** | Are you sending to an engaged audience? Based on how regularly messages are opened and clicked. | Remove inactive subscribers. Implement re-engagement campaigns before pruning. |
| **open_rate** | Degree to which your audience opens your messages. | Improve subject lines. Segment audiences by engagement level. |
| **bounce_classification** | Rejection by mailbox providers due to reputation or spam-like content. | Fix content triggering spam filters. Warm IPs properly. Monitor domain reputation. |
| **bounce_rate** | Are you sending to addresses that don't exist? Based on permanent bounces to invalid mailboxes. | Implement double opt-in. Clean lists quarterly. Use Email Validation API before sending. |
| **spam_rate** | Are recipients marking your email as spam? Based on recipients who open then report spam. | Only send to opted-in recipients. Make unsubscribe easy. Match content to expectations set at signup. |

**Note:** The overall `score` is NOT a simple average of the 5 metrics — the weighting formula is opaque. A single low metric (e.g., spam_rate = 1) can drag the overall score significantly.

---

## API Endpoints

### Get Your Scores (Date Range)

`GET /v3/engagementquality/scores`

| Parameter | Required | Description |
|-----------|----------|-------------|
| `from` | Yes | Start date (YYYY-MM-DD, UTC) |
| `to` | Yes | End date (YYYY-MM-DD, UTC) |

**Python**
```python
import os, requests

headers = {"Authorization": f"Bearer {os.environ['SENDGRID_API_KEY']}"}
response = requests.get(
    "https://api.sendgrid.com/v3/engagementquality/scores",
    params={"from": "2026-04-01", "to": "2026-04-23"},
    headers=headers
)

if response.status_code == 200:
    for entry in response.json()["result"]:
        print(f"Date: {entry['date']}, Score: {entry.get('score', 'N/A')}")
        metrics = entry.get("metrics", {})
        for metric, value in metrics.items():
            print(f"  {metric}: {value}")
elif response.status_code == 202:
    print("Scores not yet calculated — try again later")
```

### Get Subuser Scores (Single Date)

`GET /v3/engagementquality/subusers/scores`

| Parameter | Required | Description |
|-----------|----------|-------------|
| `date` | Yes | Date (YYYY-MM-DD, UTC) |
| `limit` | No | Results per page (default 1000, max 1000) |
| `after_key` | No | Pagination cursor |

Returns paginated results with `_metadata.next_params.after_key` for pagination.

---

## Response Patterns

**200 OK** — Scores available:
```json
{
    "result": [{
        "user_id": "12345",
        "username": "myaccount",
        "date": "2026-04-22",
        "score": 4,
        "metrics": {
            "engagement_recency": 4,
            "open_rate": 5,
            "bounce_classification": 3,
            "bounce_rate": 4,
            "spam_rate": 5
        }
    }]
}
```

**202 Accepted** — Scores are calculated asynchronously. Not yet available for the requested date. Retry later.

**Score or metrics omitted** — Account/subuser is not eligible (open tracking off or <1,000 sends in 30 days).

---

## CANNOT

- **Cannot get scores without open tracking enabled** — This is a hard prerequisite. No tracking = no score.
- **Cannot get scores with fewer than 1,000 messages in 30 days** — Low-volume senders are ineligible.
- **Cannot query more than 90 days in the past** — Date range is limited to the last 90 days.
- **Cannot get real-time scores** — Scores are calculated asynchronously (daily). A `202` response means "not ready yet."
- **Cannot determine the exact weighting formula** — The overall score is not a simple average. Individual metric weights are not published.
- **Email Validation API is a separate paid feature** — Referenced in bounce_rate improvement guidance, but requires Pro or Premier plan. Not included in base plan.
- **Subuser endpoint accepts only a single date** — Not a date range. Query one day at a time.

---

## Next Steps

- **Improve bounce rate:** `twilio-sendgrid-suppressions`
- **Track delivery events:** `twilio-sendgrid-webhooks`
- **Account setup:** `twilio-sendgrid-account-setup`
