# monday.com

在 CoTree 中维护 monday.com 看板、任务和 CRM，处理更新、自动化及平台 Agent，并追溯实际结果。

- 插件：cotree.monday-com，版本 0.2.0，CoTree Manifest v3。
- 分类：团队协作与知识；优先级 P0；第 12 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.monday-com.connect（显式调用）
- Skill：cotree.monday-com.inspect
- Skill：cotree.monday-com.items（显式调用）
- Skill：cotree.monday-com.columns（显式调用）
- Skill：cotree.monday-com.updates（显式调用）
- Skill：cotree.monday-com.automate（显式调用）
- Skill：cotree.monday-com.agents（显式调用）
- Skill：cotree.monday-com.report

- MCP：cotree.monday-com.monday-com

## 改造内容

- 来源连接器改为八个原生工作流和唯一官方 Streamable HTTP MCP，独立个人 token / OAuth 路径分开。
- 覆盖核心看板、列类型、CRM、更新、自动化 / 工作流、可复用代码和平台 Agent，保留真实 schema 与预览能力边界。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 已适配原生 Skill 与官方 MCP 声明；真实账户读写、权限 / 过期恢复仍待验收。静态 headersEnv 不实现 OAuth 注册、登录、刷新或撤销，不读取来源宿主会话。
- 个人 token 路径用于个人 / 开发测试；组织或公开集成应采用各自 OAuth / DCR，不能共享个人身份。
- 远程自动化、workflow、agent 和某些上传能力使用预览 schema，实际暴露、付费能力与权限需要独立验收；本包不声明新的 CoTree Agent 或持续后台执行器。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
