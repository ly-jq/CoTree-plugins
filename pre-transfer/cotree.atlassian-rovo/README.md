# Atlassian Rovo

在 CoTree 中搜索 Jira 与 Confluence、维护事项和页面，并关联项目进度与知识文档。

- 插件：cotree.atlassian-rovo，版本 0.2.0，CoTree Manifest v3。
- 分类：团队协作与知识；优先级 P0；第 10 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.atlassian-rovo.connect（显式调用）
- Skill：cotree.atlassian-rovo.search
- Skill：cotree.atlassian-rovo.jira（显式调用）
- Skill：cotree.atlassian-rovo.confluence（显式调用）
- Skill：cotree.atlassian-rovo.link（显式调用）
- Skill：cotree.atlassian-rovo.report

- MCP：cotree.atlassian-rovo.atlassian-rovo

## 改造内容

- 来源连接器收敛为六个原生工作流，工具 schema 由现有 MCP 动态发现。
- 明确 OAuth 与组织管理员启用的非交互 API token 路径，区分 Basic 个人 token 与 Bearer 服务账户 key。
- 增加离线 Jira / Confluence 定位器，原图标 / 暗色图标保留；Cloud site 不冒充 cloudId。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 独立账户工具发现、Jira / Confluence 读写仍待验收；OAuth 自动登录 / 刷新未实现。
- 个人 API token 的 MCP scopes 及组织开关、服务账户可用性、IP / 域访问策略需实际核实，普通 API key 不保证可用。
- 本包面向 Atlassian Cloud；不自动接入 Data Center、Compass 或其他私有连接器。定位器只解析标识，不联网、不证明访问权限。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
