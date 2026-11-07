# Dropbox 接入

官方端点 https://mcp.dropbox.com/mcp；COTREE_DROPBOX_MCP_AUTHORIZATION 注入完整 Bearer header。DCR 官方支持特定客户端，CoTree 不据此声明获准；其他客户端按官方说明注册独立 Scoped access 应用，核实管理员策略、访问范围和必要 scopes，取得有效 token 后再验收。短期 token 到期需要重新签发或独立合法刷新；本包不保存 app secret、不实现登录 / 刷新。

凭据只注入当前 CoTree 进程的对应环境变量，值是完整 Authorization header（Bearer 加合法访问令牌），不要写入包、项目文件、日志或 HTML。使用现有 MCP 配置和原生启停 / 重连机制，不另外启动来源 CLI 服务，不安装另一份相同 MCP。配置声明、协议连通、工具发现、账户访问和业务完成分别报告。

先验证实际工具目录、身份和指定目标只读；再在授权测试对象验证必要写入及读回。401 / 403 分别核查身份、scope、资源访问及管理员策略，429 按实际重试提示退避；写入错误不能直接自动重发。工具 schema 和账户权限会变化，以运行时事实为准。

先以 account_info.read / files.metadata.read 等任务所需权限验证身份和只读目录，内容、分享、写入与 file_requests 权限按任务另配。官方完整示例给 Full Dropbox 并列出读写 scopes，不能当所有任务都需全部权限。团队 root / home namespace 与 app 可见范围需实读，不能用路径猜。

来源保留的限制属于历史快照，运行时按当前 tools/list。官方工具已覆盖部分恢复 / 邀请 / Paper 路径，但不保证所有客户端和账户一致。参见 [官方 MCP 接入](https://help.dropbox.com/integrations/connect-dropbox-mcp-server?fallback=true)、[管理员应用策略](https://help.dropbox.com/integrations/app-integrations)（2026-10-06 核对）。
