---
name: "import.codex.twilio-developer-kit.twilio-regulatory-compliance-bundles"
description: "Manage regulatory compliance for international phone numbers. Covers what bundles are, which countries require them, how to create End-Users and Supporting Documents, evaluate and submit bundles, fix evaluation failures, update bundles when regulations change, and ISV multi-account patterns. Use this skill when provisioning numbers outside the US."
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

Phone numbers are national resources — many countries require **identity verification of the end-user** before provisioning. A Regulatory Bundle is a container holding an End-User record + Supporting Documents that proves your right to use numbers in a specific country.

**Not all countries require bundles** — check the [Regulatory Guidelines page](https://www.twilio.com/en-us/guidelines/regulatory) for country-specific requirements. If a country requires a bundle, provisioning fails without one.

---

## Key Concepts

| Resource | What it is |
|----------|-----------|
| **Regulation** | Country-specific requirement defining what End-User types and document types are needed |
| **Bundle** | Container that holds an End-User + Supporting Documents for a specific regulation |
| **End-User** | The entity answering calls or receiving messages (`individual` or `business` type) |
| **Supporting Document** | Identity/address verification documents (business registration, proof of address, etc.) |
| **Evaluation** | Synchronous check that validates a bundle against its regulation before submission |
| **Item Assignment** | Links an End-User or Supporting Document to a Bundle |

---

## Quickstart: Provision a Number with a Bundle

### Step 1 — Query the Regulation

Find out what's required for the country and number type:

**Python**
```python
import os, requests

account_sid = os.environ["TWILIO_ACCOUNT_SID"]
auth_token = os.environ["TWILIO_AUTH_TOKEN"]

# What does Germany require for local business numbers?
regulations = requests.get(
    "https://numbers.twilio.com/v2/RegulatoryCompliance/Regulations",
    params={"IsoCountry": "DE", "NumberType": "local", "EndUserType": "business"},
    auth=(account_sid, auth_token)
).json()

for reg in regulations["results"]:
    print(f"Regulation: {reg['sid']}")
    print(f"Requirements: {reg['requirements']}")
```

### Step 2 — Create an End-User

**Python**
```python
end_user = requests.post(
    "https://numbers.twilio.com/v2/RegulatoryCompliance/EndUsers",
    data={
        "FriendlyName": "Acme GmbH",
        "Type": "business",
        "Attributes": '{"business_name": "Acme GmbH", "business_registration_number": "HRB12345"}'
    },
    auth=(account_sid, auth_token)
).json()
```

### Step 3 — Upload Supporting Documents

**Python**
```python
document = requests.post(
    "https://numbers.twilio.com/v2/RegulatoryCompliance/SupportingDocuments",
    data={
        "FriendlyName": "Acme Business Registration",
        "Type": "business_registration",
        "Attributes": '{"business_name": "Acme GmbH"}'
    },
    auth=(account_sid, auth_token)
).json()
```

### Step 4 — Create a Bundle and Assign Items

**Python**
```python
# Create the bundle
bundle = requests.post(
    "https://numbers.twilio.com/v2/RegulatoryCompliance/Bundles",
    data={
        "FriendlyName": "Germany Local - Acme",
        "RegulationSid": regulations["results"][0]["sid"],
        "IsoCountry": "DE",
        "EndUserType": "business",
        "Email": "compliance@acme.com"
    },
    auth=(account_sid, auth_token)
).json()

bundle_sid = bundle["sid"]

# Assign End-User to bundle
requests.post(
    f"https://numbers.twilio.com/v2/RegulatoryCompliance/Bundles/{bundle_sid}/ItemAssignments",
    data={"ObjectSid": end_user["sid"]},
    auth=(account_sid, auth_token)
)

# Assign Supporting Document to bundle
requests.post(
    f"https://numbers.twilio.com/v2/RegulatoryCompliance/Bundles/{bundle_sid}/ItemAssignments",
    data={"ObjectSid": document["sid"]},
    auth=(account_sid, auth_token)
)
```

### Step 5 — Evaluate and Submit

**Python**
```python
# Run evaluation (synchronous — returns field-level failures)
evaluation = requests.post(
    f"https://numbers.twilio.com/v2/RegulatoryCompliance/Bundles/{bundle_sid}/Evaluations",
    auth=(account_sid, auth_token)
).json()

if evaluation["status"] == "noncompliant":
    for violation in evaluation["results"]:
        print(f"Field: {violation['friendly_name']} — {violation['description']}")
    # Fix the issues, then re-evaluate
else:
    # Submit for review
    requests.post(
        f"https://numbers.twilio.com/v2/RegulatoryCompliance/Bundles/{bundle_sid}",
        data={"Status": "pending-review"},
        auth=(account_sid, auth_token)
    )
```

### Step 6 — Provision Number with Bundle

Once the bundle is approved:

**Python**
```python
from twilio.rest import Client
client = Client(account_sid, auth_token)

number = client.incoming_phone_numbers.create(
    phone_number="+4930xxxxxxx",
    bundle_sid=bundle_sid
)
```

---

## Updating an Approved Bundle

When regulations change, you'll receive an email. Update without deprovisioning numbers:

1. **Copy** the approved bundle into a mutable state via the Bundle Copies resource
2. **Update** the End-User or Supporting Document on the copy
3. **Re-evaluate** the copy
4. **Replace** items in the original bundle via the Replace Items resource

Phone numbers remain provisioned throughout this process.

**Alternative:** Create a new bundle → get it approved → remap numbers to the new bundle.

**Docs:** [Bundle Copies](https://www.twilio.com/docs/phone-numbers/regulatory/api/bundles-copies) | [Replace Items](https://www.twilio.com/docs/phone-numbers/regulatory/api/bundles-replace-items)

---

## ISV / Multi-Account Pattern

If managing Twilio subaccounts for multiple customers:

- **Each customer needs their own bundle** — Do not reuse your business information in customer bundles
- Use the **Bundle Clones** resource to duplicate bundle structures across subaccounts
- End-User records must reflect the actual end-user (your customer), not you

**Docs:** [Bundle Clones](https://www.twilio.com/docs/phone-numbers/regulatory/api/bundles-clones)

---

## CANNOT

- **Cannot provision numbers without required bundles** — Provisioning fails immediately. Check Regulations resource first.
- **Cannot reuse one bundle across different number types** — Each bundle is tied to a specific regulation (country + number type + end-user type).
- **Locality-matching addresses required in ~33 countries** — Germany (and others) require the End-User address to be within the region of the phone number prefix, not just any address in the country. US HQ address will fail for a Berlin number.
- **Cannot hardcode regulation requirements** — Regulations change periodically. Always query the Regulations resource dynamically.
- **Do not create a new bundle when evaluation fails** — Fix the existing bundle. Creating new ones wastes time and clutters your account.
- **Cannot reuse your ISV info in customer bundles** — Bundles must represent the actual end-user. Twilio audits this.
- **Some markets are business-only** — Individual provisioning not allowed. Check the `EndUserType` in the Regulation.

---

## Next Steps

- **Choose number type before provisioning:** `twilio-numbers-senders`
- **Register numbers after provisioning:** `twilio-compliance-onboarding`
- **Country-specific requirements:** [Regulatory Guidelines](https://www.twilio.com/en-us/guidelines/regulatory)
- **API reference:** [Regulatory Compliance API](https://www.twilio.com/docs/phone-numbers/regulatory/api)
