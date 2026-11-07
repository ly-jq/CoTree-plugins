# Supabase 连接与验收

默认 cotree.supabase.supabase 指向官方 https://mcp.supabase.com/mcp，启用 read_only=true，功能组限 database,docs,debugging,development。尚未配置用户 project_ref，不能把此默认状态当项目范围已落实；数据操作前先配置项目。

在插件根运行 node scripts/connection-config.mjs --project-ref <实际项目ref>，输出 CoTree mcpServers 配置。脚本不读取账户、不连接、不写配置；通过项目正常配置流程将同名 cotree.supabase.supabase 项合并到 .cotree/mcp.json，保留其他服务。同名配置覆盖插件默认项，工作区覆盖独立于插件生命周期，禁用 / 卸载时需一并移除才会停止这个工作区服务。不要直接修改带完整性摘要的包。

认证变量 COTREE_SUPABASE_MCP_AUTHORIZATION 是完整 Bearer header。可选满足所需权限的独立 scoped Management PAT；托管 OAuth 也需要宿主单独接入。anon、publishable 或 service_role 项目密钥不是该管理端点身份。认证变量交由进程 / 系统的凭据流程提供，禁止记录实际值。

生成器只有显式 --write 才移除 read_only=true；默认不启用 account 功能组，也不设置 skip_elicitations。确有任务需要其他工具时先按官方文档增加最少功能组，不能把无工具理解为项目空数据。使用开发或测试项目验证，再依据授权决定其他环境。

验收：核对项目及身份 → tools/list → 有界只读 → 授权测试迁移或资源写入并读回 → 检查权限不足 / 令牌过期 / 重连。401 / 403 与 SQL / RLS 错误分别记录。当前只完成打包与协议验证，没有用户账户或数据业务验收。

2026-10-06 核对：[Supabase MCP](https://supabase.com/docs/guides/ai-tools/mcp)、[Personal access tokens](https://supabase.com/docs/guides/platform/personal-access-tokens)。
