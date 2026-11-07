# Stripe 认证与账户范围

服务 cotree.stripe.stripe → https://mcp.stripe.com，COTREE_STRIPE_MCP_AUTHORIZATION 转发完整 Bearer header；不会获取 / 刷新 OAuth。官方推荐交互式客户端 OAuth，不能使用 OAuth 的独立 Agent 可用最小权限 Agent API key。2026-10-31 起 MCP 拒绝未带 Agent 标记的普通 restricted / full-access key；不要只根据 rk_ 前缀判断满足新要求。首选沙箱核验后再处理实际生产任务。

Connected account 场景官方要求平台 API key 与 Stripe-Account，不能假设普通 OAuth 可代替。结合上述新要求核对 Agent key 的 connected-account 权限及实际能力。运行 node scripts/connection-config.mjs --account acct_实际ID 只输出同名服务配置；通过 CoTree 正常 MCP 配置应用，不修改封装包。覆盖项生命周期独立，插件禁用 / 卸载后按正常流程移除。省略 --account 表示当前身份账户，不意味着模式已核实。

真实验收：账户 ID / 环境 → 最小只读 → 有界资源和事件 → 明确授权沙箱写入及读回 → 过期 / 401 / 限流恢复。服务返回人工确认 URL 时必须完成该服务要求并核对目标，不能伪造 approval token。本批尚未执行账户业务。

2026-10-06 核对：[MCP 认证、工具及账户范围](https://docs.stripe.com/mcp)、[Agent keys](https://docs.stripe.com/keys#agent-keys)。
