# Vercel 接入

服务 cotree.vercel.vercel 指向 https://mcp.vercel.com/。官方远程 MCP 使用 OAuth 且审核客户端，CoTree 准入尚未确认。COTREE_VERCEL_MCP_AUTHORIZATION 只转发独立有效的 OAuth Bearer header，不包含登录或刷新，不借用其他产品的 client_id。公共工具与账户工具应按实际发现结果分别验收。

MCP 未就绪时可继续本地开发，或使用用户已经独立配置的 Vercel CLI / REST。按当前 CLI 帮助检查版本和身份，核对 team / project；CLI token、REST 身份、应用的 Sign in with Vercel、AI Gateway 与 MCP OAuth 不是同一个合同。不把 CLI token 当作 MCP token 测试。

node scripts/inspect-project.mjs --workspace <目录> 只读 package.json、.vercel/project.json、vercel.json 的必要元数据。输出脚本名称、已知依赖版本、项目标识和变量名，省略脚本正文与环境值；不读取 .env，不联网、不运行 package scripts。本地关联不证明远端可访问。

账户验收：身份与团队 → 指定项目只读 → 授权预览部署 → 查询终态 / 页面与 API → 必要时生产操作 → 过期 / 重连。实际部署不是本次迁移的一部分。第三方集成分别记录权限、账户和测试对象。

2026-10-06 核对：[Vercel MCP](https://vercel.com/docs/agent-resources/vercel-mcp)、[CLI](https://vercel.com/docs/cli)。
