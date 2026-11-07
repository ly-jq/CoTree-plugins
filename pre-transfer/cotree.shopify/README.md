# Shopify

开发和校验 Shopify 应用与店面，按独立 CLI 身份管理店铺和 UCP 购物流程。

- 插件：cotree.shopify，版本 0.2.0，CoTree Manifest v3。
- 分类：数据与商业；优先级 P0；第 23 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.shopify.connect（显式调用）
- Skill：cotree.shopify.develop
- Skill：cotree.shopify.graphql
- Skill：cotree.shopify.extensions
- Skill：cotree.shopify.storefront
- Skill：cotree.shopify.store（显式调用）
- Skill：cotree.shopify.shop（显式调用）

- MCP：cotree.shopify.dev

## 改造内容

- 20个技能按开发、API、扩展、店面、店铺与购物归并为7个原生入口，保留全部资源。
- 以固定公共Dev MCP替换来源专有setup连接器；CLI和UCP保留独立账户边界。
- 五种GraphQL校验器和2026-04 schema按摘要导入，增加默认关闭遥测的跨平台包装。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 原生加载和本地schema校验不证明真实店铺身份、权限、订单、支付或发布。
- GraphQL快照固定2026-04，当前API和其余代码验证要使用实际文档/MCP/CLI；UCP真实商家流程未验收。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
