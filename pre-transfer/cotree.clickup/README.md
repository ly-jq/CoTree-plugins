# ClickUp

在 CoTree 中查找 ClickUp 工作、管理任务与协作信息，汇总项目风险，含独立 REST 入口。

- 插件：cotree.clickup，版本 0.2.0，CoTree Manifest v3。
- 分类：团队协作与知识；优先级 P0；第 10 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.clickup.connect（显式调用）
- Skill：cotree.clickup.discover
- Skill：cotree.clickup.tasks（显式调用）
- Skill：cotree.clickup.docs（显式调用）
- Skill：cotree.clickup.collaborate（显式调用）
- Skill：cotree.clickup.time（显式调用）
- Skill：cotree.clickup.report

- MCP：cotree.clickup.clickup

## 改造内容

- 来源连接器改为七个原生工作流，保留任务、文档、评论 / 聊天、时间与项目报告的能力边界。
- 新增十三项固定 REST 操作，覆盖工作区层级、任务读写、评论和分页，个人 token 与 MCP OAuth 严格区分。
- 保留原图标和来源声明，写后读回与部分失败恢复使用 CoTree 现有执行能力。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 托管 MCP 要求独立 OAuth / PKCE，自动登录和刷新仍待接入；普通 API key / 标准 API OAuth access token 不能替代 MCP OAuth。
- REST 使用 COTREE_CLICKUP_API_TOKEN（裸 personal token 或标准 API OAuth token）；真实账户业务未验收。
- 辅助 REST 每次一页，响应最多 4 MiB、请求 JSON 最多 256 KiB、15 秒超时；不跟随重定向，不自动重试，不支持任意 URL / DELETE。--apply 只是写入开关，不授予权限。其他操作通过已认证 MCP 的实际 schema，不能声称 REST 覆盖全部服务。
- REST 未封装 Docs、聊天、时间条目、自定义字段专用更新、附件或删除；由 MCP 实际工具决定可用性。MCP 不提供外部 Connected Search。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
