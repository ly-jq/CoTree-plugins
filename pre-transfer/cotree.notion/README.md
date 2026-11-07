# Notion

面向 Notion 的知识整理、会议准备、研究文档和需求落地工作流。

- 插件：cotree.notion，版本 0.2.0，CoTree Manifest v3。
- 分类：团队协作与知识；优先级 P0；第 5 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.notion.connect（显式调用）
- Skill：cotree.notion.capture（显式调用）
- Skill：cotree.notion.meeting
- Skill：cotree.notion.research
- Skill：cotree.notion.plan（显式调用）

- MCP：cotree.notion.notion

## 改造内容

- 四种来源工作流重写为五个 CoTree Skill；保留引用、任务关联、分页和恢复语义。
- 增加本地模板与独立认证接入说明，移除来源宿主的固定工具前缀和强制结束会话规则。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 托管 Notion MCP 需要 OAuth；普通 Notion integration secret 不等于此端点可用的 access token。
- headersEnv 仅转发独立取得的有效 OAuth Bearer header。CoTree 的 PKCE / discovery / 客户端注册集成及本插件登录 / 刷新仍待完成，不能声称配置变量就已支持登录。
- 没有账户工具发现或真实页面 / 数据库读写验收；连接说明见 references/connection.md。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
