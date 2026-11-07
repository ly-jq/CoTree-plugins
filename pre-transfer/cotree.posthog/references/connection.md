# PostHog 接入

默认 cotree.posthog.posthog 指向 https://mcp.posthog.com/mcp?mode=tools&readonly=true。官方支持个人 API key 的 MCP Server preset，以完整 Bearer 值绑定 COTREE_POSTHOG_MCP_AUTHORIZATION；文件只存变量名，不存 key。前端采集 project token 不能替代个人身份。OAuth 自动登录 / 刷新另待接入。

插件根执行 node scripts/connection-config.mjs --project-id 实际ID，将输出合并到 .cotree/mcp.json 的 mcpServers；保留其他服务，同名覆盖插件默认项。project_id 固定上下文、readonly=true 限只读、mode=tools 用标准工具。已授权写任务才加 --write；脚本不落盘、不读秘密、不联网。工作区覆盖独立于插件生命周期，禁用 / 卸载时须一并移除。

核对组织 / 项目后先做最小只读查询，授权测试写入、过期 / 撤销、重连和分页独立验收。默认没有实际 project_id，不能视为范围已落实。不同账户用独立连接，服务按认证账户路由地区，不混用身份或猜地区端点。

2026-10-06 核对：[官方 MCP](https://posthog.com/docs/model-context-protocol)、[认证与范围](https://posthog.com/docs/model-context-protocol/faq)、[FAQ 原始文档](https://github.com/PostHog/posthog.com/blob/master/contents/docs/model-context-protocol/faq.mdx)、[API 身份](https://posthog.com/docs/api)。匿名 401 仅证明认证边界，不代表账户已连接。
