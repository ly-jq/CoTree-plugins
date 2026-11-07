# Granola 独立接入

服务 cotree.granola.granola，https://mcp.granola.ai/mcp。COTREE_GRANOLA_MCP_AUTHORIZATION 为独立 OAuth 得到的完整 Bearer header。宿主仍需实现客户端识别、元数据发现、登录回调和刷新；不复用其他产品的 client ID、cookie 或用户 token。MCP 的 API key / 服务账户路径不受支持，官方单独 REST API 与它不是同一个认证接口。企业 EMA 需支持该扩展的宿主与 IdP，本包没有实现。

核对所连接账户和 Granola 当前活动 workspace。可访问的个人 / 共享 / 公共笔记取决于真实权限和企业 scopes；跨 workspace 不能自动合并。免费计划时间窗口以及付费文件夹 / 搜索 / 转录能力须以实际工具目录与账户为准，不能把旧版“只读自有笔记”说明当当前全部规则。先读指定会议，确认来源 / 范围后验收其他能力和 token 过期 / 撤销。

2026-10-07：[当前官方接入、访问范围与工具说明](https://docs.granola.ai/help-center/sharing/integrations/mcp)。来源说明仅追溯，实际运行按本包 Skill。
