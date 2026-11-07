# Gmail 接入

MCP cotree.gmail.gmail → https://gmailmcp.googleapis.com/mcp/v1，COTREE_GMAIL_MCP_AUTHORIZATION 为完整 Bearer header。官方仍为开发者预览，需要资格、Cloud 项目启用 Gmail / Gmail MCP API、独立 OAuth 客户端与用户授权。CoTree 自动登录 / 刷新尚待接入，不借用原宿主 client_id / secret。

2026-10-06 匿名实测可发现 23 个工具，包含搜索、读取、草稿和标签，没有发送工具；没有调用工具或读取邮箱。目录公开不证明账户可用，不能编造 MCP send。发送可用下述独立 Gmail REST；后续实际目录变化应重新发现。

REST 使用裸 COTREE_GMAIL_ACCESS_TOKEN，只调用 users/me。profile 核对 mailbox，读取通常需要 gmail.readonly，草稿需要 gmail.compose，发送与修改分别核对 gmail.send / gmail.modify 等实际 endpoint scopes。gmail.metadata 不允许 q 搜索及完整正文；不默认申请 mail.google.com。应用发布、restricted scopes 验证与组织管理员政策另行跟进，服务账户 / 域级委托不自动配置。

验收：最小 profile / 指定消息 → 有界搜索和线程 → 明确授权测试草稿 → 明确收件人发送及读回 → 过期、限流与未知结果恢复。尚未进行真实邮箱读写。

2026-10-06 核对：[MCP 配置](https://developers.google.com/workspace/gmail/api/guides/configure-mcp-server)、[scopes](https://developers.google.com/workspace/gmail/api/auth/scopes)、[发送合同](https://developers.google.com/workspace/gmail/api/guides/sending)。
