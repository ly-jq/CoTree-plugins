# ClickUp 接入

MCP：https://mcp.clickup.com/mcp，独立 OAuth / PKCE 后的完整 header 绑定 COTREE_CLICKUP_MCP_AUTHORIZATION；CoTree 尚未实现该服务的自动登录 / 刷新。官方不接受拿普通 API key 或标准 API OAuth access token 替代 MCP OAuth。此绑定仅是传输能力，不表示登录已经完成。

独立 REST：COTREE_CLICKUP_API_TOKEN 保存裸 personal token 或标准 API OAuth token。脚本发送 Authorization 原值，不添加 Bearer。个人 token 从本人的 ClickUp Apps 设置获得；不继承来源连接器凭据。先 me、workspaces 检查用户 / 授权工作区，再读取指定 List。权限和套餐限制按实际响应核对，不将 403 / 429 归为同一原因。

见 [REST 操作](api.md)。后续验收：身份和层级 → 指定任务分页 → 授权测试任务 / 评论及读回 → 撤销和结果未知恢复。MCP 的 Docs、聊天、时间工具另做账户验证；REST 成功不证明这些已可用。工作数据不写进插件包，凭据不进入参数、配置示例或输出。

核对日期 2026-10-06：[MCP 及能力边界](https://developer.clickup.com/docs/connect-an-ai-assistant-to-clickups-mcp-server)、[REST 认证](https://developer.clickup.com/docs/authentication)。
