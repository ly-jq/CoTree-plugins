# Stripe

Stripe 集成、账单、Connect、Apps、升级与账户排查的原生工作流，统一支付最佳实践。

- 插件：cotree.stripe，版本 0.2.0，CoTree Manifest v3。
- 分类：数据与商业；优先级 P0；第 7 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.stripe.connect（显式调用）
- Skill：cotree.stripe.integrate
- Skill：cotree.stripe.billing
- Skill：cotree.stripe.platforms
- Skill：cotree.stripe.apps（显式调用）
- Skill：cotree.stripe.upgrade（显式调用）
- Skill：cotree.stripe.inspect
- Skill：cotree.stripe.reference
- Skill：cotree.stripe.directory
- Skill：cotree.stripe.projects（显式调用）

- MCP：cotree.stripe.stripe

## 改造内容

- 七个来源 Skill 按集成领域改造为十个原生工作流，网页开发来源的 Stripe 最佳实践仅归档，避免重复入口。
- 移除自动最新版本、强制固定提问和 .claude/skills 接力；按当前 SDK、官方文档及授权处理平台和服务。
- 新增 connected account 配置输出器及原始字节 Webhook 签名校验工具，认证变更与账户模式单独登记。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- MCP 的 OAuth 或 Agent API key 需独立配置。官方公告自 2026-10-31 起拒绝非 Agent 标记的普通 restricted / full-access key，不能沿用来源旧建议。真实账户尚未验收。
- Connected account 需明确 Stripe-Account 与平台 key 权限；配置脚本只输出同名服务覆盖，不修改用户配置。模式、账户、权限以实际服务返回为准。
- Webhook 校验仅证明签名 / 时间窗口，不证明业务处理或防重放；真实收款、退款、订阅、税务设置、Apps 发布、Projects / MPP 采购均未执行。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
