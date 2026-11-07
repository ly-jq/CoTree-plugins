# openai-ads-conversions

按现行 OpenAI Ads 合同接入 Pixel 与服务端转化，保持去重、同意和核心业务失败隔离。

- 插件：cotree.openai-ads-conversions，版本 0.2.0，CoTree Manifest v3。
- 分类：数据与商业；优先级 P0；第 30 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.openai-ads-conversions.inspect
- Skill：cotree.openai-ads-conversions.pixel
- Skill：cotree.openai-ads-conversions.capi
- Skill：cotree.openai-ads-conversions.verify



## 改造内容

- 将来源单技能拆成检查、Pixel、CAPI与验证，复用当前应用分析层。
- 按官方现行字段更新合同，提供零网络验证器、明确远端发送和可测试Pixel示例。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 独立广告账户/Pixel ID/CAPI key及真实事件接收和归因尚未验收，不读取或创建凭据。
- 示例只覆盖明确合同子集，接入具体框架与新字段须在目标仓库按官方文档核对。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
