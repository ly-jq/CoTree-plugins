# public-equity-investing

有来源的上市股票研究、财务模型、估值、事件、风险与研究交付工作流。

- 插件：cotree.public-equity-investing，版本 0.2.0，CoTree Manifest v3。
- 分类：数据与商业；优先级 P0；第 30 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.public-equity-investing.context
- Skill：cotree.public-equity-investing.research
- Skill：cotree.public-equity-investing.coverage
- Skill：cotree.public-equity-investing.normalize
- Skill：cotree.public-equity-investing.models
- Skill：cotree.public-equity-investing.valuation
- Skill：cotree.public-equity-investing.update-model
- Skill：cotree.public-equity-investing.earnings
- Skill：cotree.public-equity-investing.events
- Skill：cotree.public-equity-investing.scenarios
- Skill：cotree.public-equity-investing.risk
- Skill：cotree.public-equity-investing.pitch
- Skill：cotree.public-equity-investing.memo
- Skill：cotree.public-equity-investing.monitor
- Skill：cotree.public-equity-investing.audit



## 改造内容

- 23项来源按研究能力归并为15个CoTree原生入口，完整计算资源、工作簿模板和共享依赖保持。
- 以明确JSON输入、新输出目录和本地桥接提供归一化、DCF、三报表、事件计算；主模型负责研究判断。
- 上下文/调度复用CoTree现有合同，不继承来源专属账号/状态和固定认证流程。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 真实市场数据、付费来源、账户、模型重算和投资判断未验收；离线模板通过不认证外部结果。
- 源helper仍有特定财务输入与模板范围，其他领域模块须按其实际依赖/数据逐项执行验证。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
