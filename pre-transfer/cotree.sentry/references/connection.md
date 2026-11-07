# Sentry 接入

MCP 服务 cotree.sentry.sentry → https://mcp.sentry.dev/mcp。官方托管 MCP 使用 OAuth，COTREE_SENTRY_MCP_AUTHORIZATION 接受完整有效 OAuth header；插件没有登录 / 刷新。需要项目约束时可按官方组织 / 项目路径，通过 CoTree 正常 MCP 配置流程覆盖同名服务，独立覆盖在插件卸载时需另外移除。

随包 API 脚本是独立只读路径。COTREE_SENTRY_API_TOKEN 保存裸 API token，脚本加 Bearer header，按端点选择最少的 event:read / 必要项目读取权限；DSN 不能代替 API token。先在本地凭据流程配置，禁止把值写进命令参数、插件或聊天。指定 org / project，地区或自托管环境须明确 --base-url，脚本仅接受 HTTPS origin，不自动重定向凭据。

验收：最小读取 → 范围与分页 → 实际 Issue / event → 401 / 403 / 429 / 过期恢复。当前测试只含合成协议数据和匿名端点边界，尚无账户数据验收。

2026-10-06 核对：[Sentry MCP](https://mcp.sentry.dev/)、[API 认证](https://docs.sentry.io/api/auth/)。
