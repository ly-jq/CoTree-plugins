---
name: "import.codex.twilio-developer-kit.twilio-security-api-auth"
description: "Choose the right Twilio authentication method and implement it correctly. Covers Auth Token (testing only), API Keys (production standard), OAuth2 client_credentials (time-limited bearer tokens), Access Tokens (client-side SDKs), and test credentials. Use this skill before making any Twilio API calls in production."
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

Twilio supports four authentication methods. Choosing the wrong one is a security risk — Auth Tokens in production code are the most common credential leak.

| Method | Use for | Token lifetime | Revocable individually |
|--------|---------|---------------|----------------------|
| **Auth Token** | Local testing only | Permanent (until rotated) | No — rotation breaks ALL API keys |
| **API Key + Secret** | Production server-side | Permanent (until deleted) | Yes |
| **OAuth2 Bearer Token** | Production server-side (enhanced) | 1 hour | Expires automatically |
| **Access Token (JWT)** | Client-side SDKs (Voice, Video, Chat) | Up to 24 hours | No — delete issuing API key |

**Decision framework:**
- **Building a quick prototype?** → Auth Token (but switch to API Key before deploying)
- **Production server-side code?** → API Key + Secret (simplest production auth) or OAuth2 (time-limited tokens)
- **Browser/mobile client needs to connect?** → Access Token (JWT) generated server-side
- **Running tests without charges?** → Test credentials with magic numbers

---

## API Key Authentication (Production Standard)

**Create:** Console → Account → API keys & tokens → Create API key

| Key type | Access | Create via |
|----------|--------|-----------|
| **Main** | Full account access | Console only |
| **Standard** | All resources except /Accounts and /Keys endpoints | Console or API |
| **Restricted** | Specific resources only (up to 100 permissions) | Console or v1 IAM API only |

**Python**
```python
import os
from twilio.rest import Client

client = Client(
    os.environ["TWILIO_API_KEY"],      # SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    os.environ["TWILIO_API_SECRET"],
    os.environ["TWILIO_ACCOUNT_SID"]   # required as third argument
)
```

**Node.js**
```node
const client = require("twilio")(
    process.env.TWILIO_API_KEY,
    process.env.TWILIO_API_SECRET,
    { accountSid: process.env.TWILIO_ACCOUNT_SID }
);
```

---

## OAuth2 Authentication (Client Credentials)

Time-limited bearer tokens that expire after 1 hour. More secure than permanent API keys for server-to-server communication.

### Step 1 — Create an OAuth App

Create an OAuth App in the Twilio Console to get a Client ID and Client Secret.

### Step 2 — Request a Bearer Token

**cURL**
```bash
curl -X POST 'https://oauth.twilio.com/v2/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'client_id={ClientID}' \
  -d 'client_secret={ClientSecret}' \
  -d 'grant_type=client_credentials'
```

**Response:**
```json
{
    "access_token": "{BearerToken}",
    "token_type": "Bearer",
    "expires_in": 3600
}
```

### Step 3 — Use the Bearer Token

```bash
curl 'https://api.twilio.com/2010-04-01/Accounts/{AccountSID}/Messages.json' \
  -H 'Authorization: Bearer {BearerToken}'
```

### SDK Support

OAuth2 is supported in all Twilio SDKs:

| Language | Minimum version |
|----------|----------------|
| Java | 10.6.0 |
| C#/.NET | 7.6.0 |
| Node.js | 5.4.0 |
| Python | 9.4.1 |
| Ruby | 7.4.0 |
| PHP | 8.5.0 |
| Go | 1.25.1 |

**Docs:** [OAuth access tokens](https://www.twilio.com/docs/iam/oauth-apps/oauth-access-token) | [Segment OAuth connections](https://www.twilio.com/docs/segment/connections/oauth)

---

## Access Tokens (Client-Side SDKs)

Short-lived JWTs for authenticating browser/mobile clients. Generate server-side, pass to the client.

**Python**
```python
from twilio.jwt.access_token import AccessToken
from twilio.jwt.access_token.grants import VoiceGrant

token = AccessToken(
    os.environ["TWILIO_ACCOUNT_SID"],
    os.environ["TWILIO_API_KEY"],
    os.environ["TWILIO_API_SECRET"],
    identity="user-123",
    ttl=3600
)
token.add_grant(VoiceGrant(outgoing_application_sid="APxxxx"))
print(token.to_jwt())
```

Grant types: `VoiceGrant`, `VideoGrant`, `ChatGrant` (Conversations), `SyncGrant`

---

## Test Credentials

Make API calls without charges. Find at Console → Account → API keys & tokens → Test credentials.

Magic numbers: `+15005550006` (valid), `+15005550001` (invalid, error 21211), `+15005550007` (no SMS, error 21612)

---

## CANNOT

- **Standard keys cannot access /Accounts or /Keys endpoints** — Returns 20003 (401). Use Auth Token or Main key.
- **Cannot create restricted keys via v2010 API** — Silently creates a standard key instead. Use v1 IAM API.
- **Restricted keys cannot generate Access Tokens** — Only Standard and Main keys can.
- **Cannot revoke individual Access Tokens** — Valid until expiration (max 24h). Delete the issuing API key to revoke all.
- **OAuth2 only supports `client_credentials` grant** — No refresh tokens, no authorization code flow.
- **OAuth2 tokens expire after 1 hour** — Your application must handle token refresh.
- **API Key Secret shown only at creation** — Cannot be retrieved afterward.
- **Auth Token rotation breaks ALL API keys** — One-way door. This is why you should use API keys from day one.
- **Test credentials work with only 4 endpoints** — Messages, Calls, IncomingPhoneNumbers, Lookups. All others return 403.

---

## Next Steps

- **Account setup and sub-accounts:** `twilio-account-setup`
- **HIPAA account configuration:** `twilio-security-compliance-hipaa`
- **Webhook signature validation:** `twilio-webhook-architecture`
- **Credential security patterns:** `twilio-security-hardening`
