# Asana 接入

官方 MCP 为 https://mcp.asana.com/v2/mcp。预注册 MCP app，不支持动态注册；独立 OAuth 流程完成后，将完整 Bearer header 绑定 COTREE_ASANA_MCP_AUTHORIZATION。MCP app token 与标准 API token 隔离；CoTree 尚未提供此服务的自动登录、交换和刷新，不能复制来源宿主密钥链 / 会话。回调 URL 必须与实际 OAuth 客户端一致。本包不启动回调监听器。

独立 REST：把裸 PAT 或标准 API app access token 注入 COTREE_ASANA_API_TOKEN。先用 me 核实用户、workspaces 核实目标；需要最小匹配 API scopes 和对象权限。凭据不写入包、示例、查询文件或日志。客户端能连通 / 匿名 401 不证明账户可用。

使用说明见 [REST 操作](api.md)。验收：身份与工作区 → 指定项目只读和分页 → 用户授权测试任务创建 / 局部修改 / 评论及读回 → 过期、撤销和结果未知恢复。OAuth 与真实业务验收记入根 auth-followup.html。

核对日期 2026-10-06：[官方 MCP](https://developers.asana.com/docs/integrating-with-asanas-mcp-server)、[PAT](https://developers.asana.com/docs/personal-access-token)。
