# Airtable 接入

官方端点为 https://mcp.airtable.com/mcp，Streamable HTTP；完整 Bearer header 绑定 COTREE_AIRTABLE_MCP_AUTHORIZATION。独立 PAT 需选定具体 base / workspace 及所需 scopes，旧 API key 不适用。只读从 data.records:read、schema.bases:read 开始，评论 / 工作区目录按需要添加相应 read scope；记录和 schema 写入另行授权。scope、用户权限、资源选择及组织策略同时影响访问。独立 OAuth 另按自己的客户端完成，不复制来源占位 client_id。

凭据只注入当前 CoTree 进程的对应环境变量，值是完整 Authorization header（Bearer 加合法访问令牌），不要写入包、项目文件、日志或 HTML。使用现有 MCP 配置和原生启停 / 重连机制，不另外启动来源 CLI 服务，不安装另一份相同 MCP。配置声明、协议连通、工具发现、账户访问和业务完成分别报告。

先验证实际工具目录、身份和指定目标只读；再在授权测试对象验证必要写入及读回。401 / 403 分别核查身份、scope、资源访问及管理员策略，429 按实际重试提示退避；写入错误不能直接自动重发。工具 schema 和账户权限会变化，以运行时事实为准。

PAT 不自动获得底表权限；界面访问、视图过滤和完整 base 权限不同。自动登录 / refresh 未实现，过期或撤销后重新签发 / 合法刷新并重连。参见 [官方 MCP 接入](https://support.airtable.com/articles/9897799762-using-the-airtable-mcp-server)、[PAT](https://support.airtable.com/articles/9934989703-creating-personal-access-tokens)（2026-10-06 核对）。
