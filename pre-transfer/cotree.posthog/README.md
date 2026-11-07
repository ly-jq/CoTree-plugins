# PostHog

用独立 PostHog MCP 身份分析产品数据、管理开关和实验、调查错误与组织洞察。

- 插件：cotree.posthog，版本 0.2.0，CoTree Manifest v3。
- 分类：数据与商业；优先级 P0；第 9 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.posthog.connect（显式调用）
- Skill：cotree.posthog.analyze
- Skill：cotree.posthog.flags
- Skill：cotree.posthog.experiments
- Skill：cotree.posthog.observe
- Skill：cotree.posthog.manage

- MCP：cotree.posthog.posthog

## 改造内容

- 原连接器改为标准 Streamable HTTP 与独立项目级个人 API key。
- 默认只读 tools 模式，生成配置固定项目；脚本不读秘密、不写配置、不联网。
- 复合技能拆为六个领域工作流，发现真实工具，移除原宿主连接停止门。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 真实账户业务未验收。个人 API key 可手动绑定；OAuth 自动授权 / 刷新未由本包实现，来源登录不可继承。
- 默认没有用户 project_id，操作数据前须生成应用项目配置；--write 改工具范围，不代替用户授权。
- 工具随权限与服务版本变化，CoTree MCP Apps bridge 不可用，使用 tools 模式的标准结果。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
