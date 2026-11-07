# Linear 连接

安装并启用后，把完整 Authorization header 放入启动 CoTree 进程可见的 COTREE_LINEAR_MCP_AUTHORIZATION，形式为 Bearer 后接 Linear API key 或 OAuth access token；更改环境后重启相应进程。不要向聊天、源码或日志输出实际值，也不复用其他宿主的凭据。

本包使用官方 Streamable HTTP 地址 https://mcp.linear.app/mcp。API key 可在 Linear 的账户安全设置中签发，按任务限制权限和团队；只读使用 Read 权限。官方另有 /mcp/readonly 地址，仅暴露读取工具；OAuth 可限制 read scope。切换连接变体需通过宿主配置或重新封装校验，不能直接破坏包摘要。

每个令牌对应其授权上下文。先用服务返回的信息核对工作区 / 团队，随后读一个用户指定的 Issue 或项目。只发现工具不等于该目标可访问。401 检查变量、令牌和有效期，403 检查目标与权限；429 遵守重试时机；写请求超时先查重复记录。

服务支持交互 OAuth 2.1，但此插件的 headersEnv 接入只提供已有 API key / access token，不实现浏览器登录和刷新。不要为了排错删除全局认证目录。旧 SSE 地址只作兼容历史，本包不自动降级。

来源核对：2026-10-06，[Linear MCP 文档](https://linear.app/docs/mcp)。
