# Linear

通过 Linear 官方 MCP 完成任务分诊、Issue 维护和项目规划。

- 插件：cotree.linear，版本 0.2.0，CoTree Manifest v3。
- 分类：团队协作与知识；优先级 P0；第 3 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.linear.connect（显式调用）
- Skill：cotree.linear.triage
- Skill：cotree.linear.manage（显式调用）
- Skill：cotree.linear.plan（显式调用）

- MCP：cotree.linear.linear

## 改造内容

- 两个来源的 Linear 服务与连接器合并为一个 CoTree MCP；保留来源资源和许可。
- 加入连接诊断、只读分诊、任务维护、项目拆解四个工作流，并核对团队和工作区身份。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- COTREE_LINEAR_MCP_AUTHORIZATION 保存完整 Bearer header，可使用 Linear API key 或独立 OAuth access token；见 references/connection.md。
- 工具、字段及可见范围取决于当前认证的工作区、团队与权限；不自动切换或合并不同账户。
- 未实现插件内交互 OAuth 登录 / 刷新；本批未取得账户，真实任务和项目读写未验收。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
