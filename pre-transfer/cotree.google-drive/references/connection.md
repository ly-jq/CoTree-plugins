# Google Drive 接入

MCP：cotree.google-drive.google-drive → https://drivemcp.googleapis.com/mcp/v1，COTREE_GOOGLE_DRIVE_MCP_AUTHORIZATION 为完整 Bearer header。官方目前是 Workspace Developer Preview，需要准入、Cloud 项目启用 Drive / Drive MCP API 及独立 OAuth；插件没有自动登录 / 刷新。来源中的 OAuth 占位或原宿主身份不能沿用。

2026-10-06 匿名实测可发现 8 个文件工具，未调用工具或访问账户数据。目录公开不证明 OAuth / 预览资格已满足，也不等于 Docs / Sheets / Slides 完整编辑能力；使用时重新发现真实 schema，编辑可走下述独立 API。

REST：COTREE_GOOGLE_DRIVE_ACCESS_TOKEN 为裸 OAuth access token。随包脚本向固定 Google API 地址请求，不读取浏览器 cookies / 原宿主配置。启用需要的 Drive、Docs、Sheets、Slides API，按任务申请最小 scopes；drive.file 只覆盖应用创建 / 用户向应用开放的文件，不能认为能搜索整个 Drive。广泛读取的 scopes、对外分发应用验证与组织策略另行核对。服务账户共享与域级委托不自动开通。

先核对实际账户和已知目标文件，再做元数据、内容、指定测试对象写入与读回，最后验证过期、限流和断线恢复。REST 不要求 MCP 预览资格，但仍需要上述独立 OAuth 和 API 授权，当前真实账户均未验收。

2026-10-06 核对：[Drive MCP 配置](https://developers.google.com/workspace/drive/api/guides/configure-mcp-server)、[工具目录](https://developers.google.com/workspace/drive/api/reference/mcp)、[OAuth scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)。
