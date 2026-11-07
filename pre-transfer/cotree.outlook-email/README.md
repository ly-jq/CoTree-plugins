# Outlook Email

在 CoTree 中检索和整理 Outlook 邮件、读取会话与附件，建立回复或转发草稿并按授权发送。

- 插件：cotree.outlook-email，版本 0.2.0，CoTree Manifest v3。
- 分类：通信与日程；优先级 P0；第 11 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.outlook-email.connect（显式调用）
- Skill：cotree.outlook-email.search
- Skill：cotree.outlook-email.read
- Skill：cotree.outlook-email.draft（显式调用）
- Skill：cotree.outlook-email.send（显式调用）
- Skill：cotree.outlook-email.organize（显式调用）



## 改造内容

- 私有 Outlook app 连接器改为独立 Graph v1.0 委托 REST，新增六个工作流和十四项操作。
- 草稿与发送分离、按 conversationId 查会话、稳定 ID、文件夹分页、正文 / 附件内容和写后核实纳入原生流程。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 随包 REST 客户端使用固定操作和固定 HTTPS origin，一次一页，1 MiB JSON 输入 / 8 MiB 响应、20 秒超时；不跟随重定向、不自动重试、不存储凭据。真实账户读写与 OAuth 获取 / 刷新仍待验收。
- 需要 COTREE_OUTLOOK_EMAIL_ACCESS_TOKEN；Mail.Read、Mail.ReadWrite、Mail.Send 与 User.Read 按实际操作分开授权。
- 脚本只支持当前用户邮箱；未封装大附件上传会话、原始 MIME、S/MIME、共享 / 代理发信、国别云、订阅 / delta 与永久删除。附件通过受限大小 JSON 读取，类型不等同文件内容。
- 发送的 202 和 Sent Items 副本不等于收件人实际收讫；不会自动重发或把草稿保存当发送成功。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
