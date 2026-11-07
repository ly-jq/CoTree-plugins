# Slack 接入

服务 cotree.slack.slack → https://mcp.slack.com/mcp，使用 Streamable HTTP。官方要求有固定身份的注册内部应用或 Marketplace 应用，非上架的外部分发应用不能据此使用 MCP。来源插件的公开 client_id 只归档，不能当成 CoTree 身份。

按独立 Slack 应用选择受支持 OAuth / 桌面 PKCE 流程；Slack 不提供这里所需的动态客户端注册。CoTree 的应用注册、管理员授权、回调 / PKCE 与刷新尚待接入，插件不另写登录循环或保存 client_secret。COTREE_SLACK_MCP_AUTHORIZATION 接收有效用户 OAuth Bearer header，不保证任意已有 Bot token 可用。

工具 scopes 分别申请：消息 / 文件 / 频道搜索、频道或线程历史、发送、Canvas / Lists、文件上传按任务需要区分；还要核对频道成员与企业 / IP 策略。读权限不代表发消息权限。实测顺序：工具发现 → 工作区和目标核对 → 指定只读内容 → 明确授权测试会话的消息 / 文件并读回 → 过期 / 限流 / 重连。

2026-10-06 核对：[Slack MCP](https://docs.slack.dev/ai/slack-mcp-server/)。用户消息、定时发送和文档创建都不在本次迁移测试中执行。
