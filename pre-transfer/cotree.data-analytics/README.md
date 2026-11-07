# 数据分析

完成有证据的数据分析、指标、报告和看板；含本地校验 MCP 与离线 HTML 阅读器。

- 插件：cotree.data-analytics，版本 0.2.0，CoTree Manifest v3。
- 分类：数据与商业；优先级 P0；第 9 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.data-analytics.analyze
- Skill：cotree.data-analytics.context（显式调用）
- Skill：cotree.data-analytics.quality
- Skill：cotree.data-analytics.kpis
- Skill：cotree.data-analytics.diagnose
- Skill：cotree.data-analytics.market
- Skill：cotree.data-analytics.report
- Skill：cotree.data-analytics.dashboard
- Skill：cotree.data-analytics.visualize
- Skill：cotree.data-analytics.notebook
- Skill：cotree.data-analytics.validate
- Skill：cotree.data-analytics.export（显式调用）

- MCP：cotree.data-analytics.analytics

## 改造内容

- 15 个顶层及 3 个嵌套方法归并为 12 个原生技能，移除宿主模式、自动分享和账户继承。
- 保留 canonical 校验器和完整阅读器，以可审计字面补丁适配路径和元数据，原快照不变。
- 原生 MCP 公开四个纯计算 JSON 工具，独立 CLI 生成只读自包含 HTML 并拒绝覆盖。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 需要 Node 22+；普通 stdio 子进程不是 OS 沙箱。报告是离线快照，不刷新云数据。
- CoTree 未提供来源 MCP Apps iframe bridge；render_* 返回 JSON，不声称内嵌图形已显示。Sites 导出工具不注册，发布走用户所选平台。
- 数据库、Google、发布需独立身份。PDF / Docs / Slides 方法已改造，真实账户、所有格式和模型分析质量需具体任务验收。
- 来源许可与第三方通知保留，本地迁移不授予额外对外分发权。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
