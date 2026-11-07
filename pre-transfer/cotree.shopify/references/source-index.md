# Shopify 来源与能力覆盖

原始资源、许可、品牌与版本证据完整保留在 resources/source-01 和 provenance；仅根 plugin.json 声明的原生入口加载。下表是人工归并后的导航，语义选择由主模型完成，不是运行时路由规则。

| 原生入口 | 来源技能 | 合并命令 |
|---|---|---|
| connect | [shopify-onboarding-dev](../resources/source-01/content/skills/shopify-onboarding-dev/SKILL.md)、[shopify-onboarding-merchant](../resources/source-01/content/skills/shopify-onboarding-merchant/SKILL.md) | — |
| develop | [shopify-dev](../resources/source-01/content/skills/shopify-dev/SKILL.md)、[shopify-custom-data](../resources/source-01/content/skills/shopify-custom-data/SKILL.md)、[shopify-app-store-review](../resources/source-01/content/skills/shopify-app-store-review/SKILL.md) | — |
| graphql | [shopify-admin](../resources/source-01/content/skills/shopify-admin/SKILL.md)、[shopify-storefront-graphql](../resources/source-01/content/skills/shopify-storefront-graphql/SKILL.md)、[shopify-customer](../resources/source-01/content/skills/shopify-customer/SKILL.md)、[shopify-partner](../resources/source-01/content/skills/shopify-partner/SKILL.md)、[shopify-payments-apps](../resources/source-01/content/skills/shopify-payments-apps/SKILL.md) | — |
| extensions | [shopify-functions](../resources/source-01/content/skills/shopify-functions/SKILL.md)、[shopify-polaris-admin-extensions](../resources/source-01/content/skills/shopify-polaris-admin-extensions/SKILL.md)、[shopify-polaris-app-home](../resources/source-01/content/skills/shopify-polaris-app-home/SKILL.md)、[shopify-polaris-checkout-extensions](../resources/source-01/content/skills/shopify-polaris-checkout-extensions/SKILL.md)、[shopify-polaris-customer-account-extensions](../resources/source-01/content/skills/shopify-polaris-customer-account-extensions/SKILL.md)、[shopify-pos-ui](../resources/source-01/content/skills/shopify-pos-ui/SKILL.md) | — |
| storefront | [shopify-liquid](../resources/source-01/content/skills/shopify-liquid/SKILL.md)、[shopify-hydrogen](../resources/source-01/content/skills/shopify-hydrogen/SKILL.md) | — |
| store | [shopify-use-shopify-cli](../resources/source-01/content/skills/shopify-use-shopify-cli/SKILL.md) | — |
| shop | [ucp](../resources/source-01/content/skills/ucp/SKILL.md) | — |

20 个来源 Skill 归并为7个入口。Shopify 官方现已将旧独立技能合并，不在 CoTree 再创建20套默认触发。18份压缩 schema、所有验证器 / 搜索脚本、Liquid样例和UCP视图原样归档；五种 GraphQL 验证器另以摘要导入 references/validators。不要直接执行归档脚本的遥测 / staging 入口。其他代码验证用实际 Dev MCP / CLI 能力，不把本机 GraphQL 校验称为全栈校验。
