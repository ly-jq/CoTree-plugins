# Canva 接入与验收

唯一服务 cotree.canva.canva，https://mcp.canva.com/mcp；使用 COTREE_CANVA_MCP_AUTHORIZATION 完整 Bearer header。CoTree 的环境绑定不负责 OAuth 注册、回调或刷新。先核实 Canva Developer Portal 的 MCP 自助入口是否对该应用开放，再配置独立应用与 redirect URI；尚未开放时按官方访问页申请准入，CIMD 客户端另核实 redirect URI allowlist。官方访问页同时保留开放和即将开放的说明，不能把文档描述当本账户已获准。每个用户完成独立 OAuth，没有本包宣称的组织级服务账户。不能沿用 ChatGPT / Codex / Claude 内置连接器授权。

验证顺序：应用准入 → 用户 OAuth / scopes → 实际工具目录 → 指定设计只读 → 授权测试修改、提交与读回 → token 过期 / 撤销。工具可能按账户、权益与当前服务能力不同；60 秒连接配置不保证长作业已结束。403 只能证明拒绝，不能单凭其推断原因。

2026-10-07：[官方快速开始](https://www.canva.dev/docs/apps/quickstart/)、[MCP 接入排障](https://www.canva.dev/docs/apps/mcp/troubleshooting/)、[访问与权限](https://www.canva.dev/docs/apps/mcp/access/)。
