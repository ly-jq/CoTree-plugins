---
name: "import.codex.stripe.upgrade-stripe"
description: "Guide for upgrading Stripe API versions and SDKs"
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

The latest Stripe API version is 2026-07-29.dahlia - use this version when upgrading unless the user specifies a different target version.

# Upgrading Stripe Versions

This guide covers upgrading Stripe API versions, server-side SDKs, Stripe.js, and mobile SDKs.

## Understanding Stripe API Versioning

Stripe uses date-based API versions (e.g., `2026-07-29.dahlia`, `2025-08-27.basil`, `2024-12-18.acacia`). Your account’s API version determines request/response behavior.

### Types of Changes

**Backward-Compatible Changes** (don’t require code updates):

- New API resources
- New optional request parameters
- New properties in existing responses
- Changes to opaque string lengths (e.g., object IDs)
- New webhook event types

**Breaking Changes** (require code updates):

- Field renames or removals
- Behavioral modifications
- Removed endpoints or parameters

Review the [API Changelog](https://docs.stripe.com/changelog.md) for all changes between versions.

## Server-Side SDK Versioning

See [SDK Version Management](https://docs.stripe.com/sdks/set-version.md) for details.

### Dynamically-Typed Languages (Ruby, Python, PHP, Node.js)

These SDKs offer flexible version control:

**Global Configuration:**

```python
import stripe
stripe.api_version = '2026-07-29.dahlia'
```

```ruby
Stripe.api_version = '2026-07-29.dahlia'
```

```javascript
const stripe = require('stripe')('sk_test_xxx', {
  apiVersion: '2026-07-29.dahlia'
});
```

**Per-Request Override:**

```python
stripe.Customer.create(
  email="customer@example.com",
  stripe_version='2026-07-29.dahlia'
)
```

### Strongly-Typed Languages (Java, Go, .NET)

These use a fixed API version matching the SDK release date. Don’t set a different API version for strongly-typed languages because response objects might not match the strong types in the SDK. Instead, update the SDK to target a new API version.

### Best Practice

Always specify the API version you’re integrating against in your code instead of relying on your account’s default API version:

```javascript
// Good: Explicit version
const stripe = require('stripe')('sk_test_xxx', {
  apiVersion: '2026-07-29.dahlia'
});

// Avoid: Relying on account default
const stripe = require('stripe')('sk_test_xxx');
```

## Stripe.js Versioning

See [Stripe.js Versioning](https://docs.stripe.com/sdks/stripejs-versioning.md) for details.

Stripe.js uses an evergreen model with major releases (Acacia, Basil, Clover, Dahlia) on a biannual basis.

### Loading Versioned Stripe.js

**Via Script Tag:**

```html
<script src="https://js.stripe.com/dahlia/stripe.js"></script>
```

**Via npm:**

```bash
npm install @stripe/stripe-js
```

Major npm versions correspond to specific Stripe.js versions.

### API Version Pairing

Each Stripe.js version automatically pairs with its corresponding API version. For instance:

- Dahlia Stripe.js uses `2026-07-29.dahlia` API
- Acacia Stripe.js uses `2024-12-18.acacia` API

You can’t override this association.

### Migrating from v3

1. Identify your current API version in code
2. Review the changelog for relevant changes
3. Consider gradually updating your API version before switching Stripe.js versions
4. Stripe continues supporting v3 indefinitely

## Mobile SDK Versioning

See [Mobile SDK Versioning](https://docs.stripe.com/sdks/mobile-sdk-versioning.md) for details.

### iOS and Android SDKs

Both platforms follow **semantic versioning** (MAJOR.MINOR.PATCH):

- **MAJOR**: Breaking API changes
- **MINOR**: New functionality (backward-compatible)
- **PATCH**: Bug fixes (backward-compatible)

New features and fixes release only on the latest major version. Upgrade regularly to access improvements.

### React Native SDK

Uses a different model (0.x.y schema):

- **Minor version changes** (x): Breaking changes AND new features
- **Patch updates** (y): Critical bug fixes only

### Backend Compatibility

All mobile SDKs work with any Stripe API version you use on your backend unless documentation specifies otherwise.

## Upgrade Checklist

1. Review the [API Changelog](https://docs.stripe.com/changelog.md) for changes between your current and target versions
2. Check [Upgrades Guide](https://docs.stripe.com/upgrades.md) for migration guidance
3. Update server-side SDK package version (e.g., `npm update stripe`, `pip install --upgrade stripe`)
4. Update the `apiVersion` parameter in your Stripe client initialization
5. Test your integration against the new API version using the `Stripe-Version` header
6. Update webhook handlers to handle new event structures
7. Update Stripe.js script tag or npm package version if needed
8. Update mobile SDK versions in your package manager if needed
9. Store Stripe object IDs in databases that accommodate up to 255 characters (case-sensitive collation)

## Testing API Version Changes

Use the `Stripe-Version` header to test your code against a new version without changing your default:

```bash
curl https://api.stripe.com/v1/customers \
  -u sk_test_xxx: \
  -H "Stripe-Version: 2026-07-29.dahlia"
```

Or in code:

```javascript
const stripe = require('stripe')('sk_test_xxx', {
  apiVersion: '2026-07-29.dahlia'  // Test with new version
});
```

## Important Notes

- Your webhook listener should handle unfamiliar event types gracefully
- Test webhooks with the new version structure before upgrading
- Breaking changes are tagged by affected product areas (Payments, Billing, Connect, etc.)
- Multiple API versions coexist simultaneously, enabling staged adoption
