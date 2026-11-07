# Slack

Slack 搜索、会话摘要、授权消息与文档 / 文件协作的原生工作流。

- 插件：cotree.slack，版本 0.2.0，CoTree Manifest v3。
- 分类：通信与日程；优先级 P0；第 6 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.slack.connect（显式调用）
- Skill：cotree.slack.search
- Skill：cotree.slack.summarize
- Skill：cotree.slack.message（显式调用）
- Skill：cotree.slack.documents（显式调用）
- Skill：cotree.slack.files（显式调用）

- MCP：cotree.slack.slack

## 改造内容

- 连接器来源补齐六个实际工作流，明确频道、线程、分页、引用、发送与恢复语义。
- 不继承来源公开 OAuth client_id；独立应用准入、OAuth 与用户 scope 记入认证清单。
- 加入消息链接解析器，保留 message / thread 时间戳字符串和所属会话，不用浮点数转换。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- Slack MCP 需要注册的内部应用或 Marketplace 应用；CoTree 的应用身份、管理员授权及 OAuth / PKCE 接入尚待完成，不支持靠来源 client_id 或任意 Bot token 直接接入。
- COTREE_SLACK_MCP_AUTHORIZATION 仅转发独立有效的用户 OAuth Bearer header；实际可用工具受 scopes、频道成员资格与工作区策略限制。
- 真实搜索、读取、发送、定时消息、Canvas / Lists 与文件上传均未进行账户验收；本批没有发送消息或创建工作区对象。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
