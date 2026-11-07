# Consensus 接入

唯一服务 cotree.consensus.consensus，https://mcp.consensus.app/mcp，路径 /mcp 不能省略。未设置环境绑定时不发送 Authorization。官方文档介绍匿名试用，但本轮 2026-10-07 实际匿名 MCP 初始化返回 401，当前 CoTree 路径的匿名目录与检索未验收；本包按独立认证继续接入，不能把文档可用性当当前实测结果。

独立 API key 在官方 API & MCP Dashboard 的 Keys and clients 管理；COTREE_CONSENSUS_MCP_AUTHORIZATION 为完整 Bearer header，不能将 key 放命令参数。也可使用独立 OAuth，自动注册 / 回调 / 刷新需宿主另行实现。官方说明无效或已撤销的 key 可能回退匿名额度，不能仅凭 HTTP 成功确认身份，真实套餐 / 账户证据另验。API 和 MCP 可能共享配额，未获授权不购买额外额度。

按实际工具目录及字段判断 search、全文摘录、DOI 或其他能力；原宿主 Deep Research 的专属行为不推断为 CoTree 能力。读取摘要、拿到正文、论文质量与业务结论是不同证据。

2026-10-07：[当前官方 MCP 与认证说明](https://docs.consensus.app/consensus-mcp)。
