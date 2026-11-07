# Google Calendar 接入

REST 使用 COTREE_GOOGLE_CALENDAR_ACCESS_TOKEN（裸 OAuth access token），Calendar API 应在独立 Cloud 项目启用。列表读取可用 calendar.calendarlist.readonly、事件读取 calendar.events.readonly、忙闲 calendar.freebusy；事件写入需 calendar.events 等相应授权。实际 scopes 与日历 accessRole 同时决定权限，不默认授予整个账户写权限。

官方 MCP 地址 https://calendarmcp.googleapis.com/mcp/v1；完整 Bearer header 绑定 COTREE_GOOGLE_CALENDAR_MCP_AUTHORIZATION。该路径还需 Workspace Developer Preview 准入、Calendar / Calendar MCP API 启用和独立 OAuth 客户端。此包未实现 OAuth 登录 / 刷新，不照搬来源宿主 callback 或密钥。凭据只由环境提供。

先读取日历列表和指定时间窗口，再验收忙闲、授权测试事件创建 / 改期 / 删除、重复实例、通知和 412 恢复。匿名工具目录即便可用，也不代表账户业务已授权。见 [REST 操作](api.md)；认证进展登记根 auth-followup.html。

核对日期 2026-10-06：[官方 MCP](https://developers.google.com/workspace/calendar/api/guides/configure-mcp-server)、[权限范围](https://developers.google.com/workspace/calendar/api/auth)。
