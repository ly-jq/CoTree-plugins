---
name: "import.codex.shopify.shopify-custom-data"
description: "MUST be used first when prompts mention Metafields or Metaobjects. Use Metafields and Metaobjects to model and store custom data for your app. Metafields extend built-in Shopify data types like products or customers, Metaobjects are custom data types that can be used to store bespoke data structures. Metafield and Metaobject definitions provide a schema and configuration for values to follow."
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

<critical-instructions>
# Best Practise for working with Metafields and Metaobjects

# ESSENTIAL RULES

- **ALWAYS** show creating metafield/metaobject definitions, then writing values, then retrieving values.
- **NEVER** show or offer alternate approaches to the same problem if not explicitly requested. It will only increase the user's confusion.
- Keep examples minimal -- avoid unnecessary prose and comments
- Remember the audience for this guidance is app developers -- they do not have access to the Shopify Admin site
- Follow this guidance meticulously and thoroughly

REMEMBER!!! Other documentation can flesh out this guidance, but the instructions here should be followed VERY CLOSELY and TAKE PRECEDENCE!

# ALWAYS: First, create definitions

## with TOML (99.99% of apps)

```toml
# shopify.app.toml

# Metafield definition -- owner type is PRODUCT, namespace is $app, key is care_guide
[product.metafields.app.care_guide]
type = "single_line_text_field"
name = "Care Guide"
access.admin = "merchant_read_write"

# Metaobject definition -- type is $app:author
[metaobjects.app.author]
name = "Author"
display_name_field = "name"
access.storefront = "public_read"

[metaobjects.app.author.fields.name]
name = "Author Name"
type = "single_line_text_field"
required = true

# Link metaobject to product
[product.metafields.app.author]
type = "metaobject_reference<$app:author>"
name = "Book Author"
```

Why: Version controlled, auto-installed, type-safe. GraphQL (Admin/Storefront) is used for reading or writing values after the TOML definitions already exist. Fields/objects can be edited by merchants when `access.admin = "merchant_read_write"` is set.

**NEVER** include `metafieldDefinitionCreate`, `metaobjectDefinitionCreate` GraphQL if TOML is the correct fit.

### Exceptions (0.01% of apps)

**NEVER, EVER** show these unless strictly required:

- Apps that **REQUIRE** creating definitions at **runtime** (i.e. types are configured dynamically by merchants) should use `metafieldDefinitionCreate`, `metaobjectDefinitionCreate`
- Apps that want **other apps** to read/write their data should use the above GraphQL, and "merchant-owned" namespace

# CRITICAL: App-Owned Metaobject and Metafield identification

- Metaobjects defined with `[metaobjects.app.example...]` in `shopify.app.toml`, MUST be accessed using `type: $app:example`
- Metafields defined with `[product.metafields.app.example]` MUST be accessed using `namespace: $app` and `key: example`
  - The same applies to other owner types, like customers, orders, etc.
- Avoid customizing namespaces for metafields.
- Avoid the common mistake of using `namespace: app`. This is profoundly incorrect.

# NEXT: demonstrate writing metafield and metaobject values via Admin API

## Writing metafields

**ALWAYS** use `metafieldsSet` to write metafields. `namespace` should normally be excluded as the default is $app.

```graphql
mutation {
  metafieldsSet(metafields:[{
    ownerId: "gid://shopify/Product/1234",
    key: "example",
    value: "Hello, World!"
  }]) { ... }
}
```

## Writing metaobjects

**ALWAYS** use `metaobjectUpsert` to write metaobjects.

```graphql
mutation {
  metaobjectUpsert(handle: {
    type: "$app:author",
    handle: "my-metaobject",
  }, metaobject: {
    fields: [{
      key: "example",
      value: "Hello, world!"
    }]
  }) { ... }
}
```

# FINALLY: demonstrate reading metafield and metaobject values

## Loading metafields

Metafields are accessed via their owning type (e.g. a Product). `namespace` should normally be excluded as the default is $app.

- Always prefer `jsonValue` where possible as it better serialises complex types
- Always alias metafield loads for easy reference

```graphql
# Admin API
query {
  product(id: "gid://shopify/Product/1234") {
    example: metafield(key: "example") {
      jsonValue
    }
  }
}
# Storefront API
query {
  product(handle: "wireless-headphones-1") {
    example: metafield(key: "example") {
      value
    }
  }
}
```

## Loading metaobjects

```graphql
# Admin API
query {
  metaobjects(type: "$app:author", first: 10) {
    nodes {
      handle
      example: field(key: "example") {
        jsonValue
      }
    }
  }
}
# Storefront API
query {
  metaobjects(type: "$app:author", first: 10) {
    nodes {
      handle
      example: field(key: "example") {
        value
      }
    }
  }
}
```

### Access Metafields directly in checkout extensions

**DO**: Access app-owned metafields directly (NO network call):

```tsx
function Extension() {
  // ESSENTIAL: Register this metafield in `shopify.extension.toml`
  const [energyRating] = useAppMetafields({
    namespace: "$app",
    key: "energy-rating",
    type: "product",
  }).filter((entry) => entry.target.id === productVariantId);
}
```

**DON'T**: Make network calls for app-owned metafields.

### Access Metafields in Shopify Functions

Use the GraphQL input query to select metafields to load:

```graphql
query Input {
  cart {
    lines {
      merchandise {
        __typename
        ... on ProductVariant {
          example: metafield(namespace: "$app", key: "example") {
            jsonValue
          }
        }
      }
    }
  }
}
```

Docs: [Metafields & Metaobjects](https://shopify.dev/docs/apps/build/custom-data)
</critical-instructions>

### Always use Shopify CLI

- **CLI:** ALWAYS use Shopify CLI to scaffold apps and extensions. Never hand-roll files: `shopify app init`, `shopify app generate extension`, `shopify app dev`, `shopify app deploy`.
- For CLI installation, setup, upgrade, or troubleshooting, use `shopify-use-shopify-cli`.
