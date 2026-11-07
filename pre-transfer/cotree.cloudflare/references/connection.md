# Cloudflare 接入

唯一服务 cotree.cloudflare.cloudflare-api 使用 https://mcp.cloudflare.com/mcp 与 COTREE_CLOUDFLARE_MCP_AUTHORIZATION。官方支持独立 user / account API token 或 OAuth；账户 / zone 范围和最小权限由签发方实际限制，不由提示词宣称。Wrangler 可独立使用其官方 CLI 登录或 CLOUDFLARE_API_TOKEN；该变量与 MCP 完整 header 分开，不跨工具误传。

完整 Authorization header 只通过对应环境变量交给当前 CoTree 进程。值为合法 Bearer header，不在命令参数、包、代码、日志或 HTML 备注里填写令牌。独立认证后先核对身份 / 范围、只读指定对象，再验证已有授权的测试写入和读回。401 / 403 分别核查身份、scope、对象权限和组织策略；429 按服务提示处理。静态 header 不提供 OAuth 登录、刷新或撤销。

## Code Mode

先用 search 读目标 API 路径、参数、响应和分页，再准备 execute 的最小请求。检查每个方法、路径、account / zone、body、循环与后续调用；代码能写远端，隔离执行不代表只读。只读任务不混入 PATCH / POST / DELETE 或其他副作用调用，写入完成后再读回。大范围账户列表、任意执行外部内容、默认跨项目遍历不是必要前置步骤。返回错误、异步 ID 或部分结果各自说明；不把 execute 接受代码当部署已完成。

2026-10-06 核对：[官方 MCP](https://developers.cloudflare.com/agents/model-context-protocol/cloudflare/servers-for-cloudflare/)、[API token](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)。本包不新增各产品重复 MCP，特殊工具需求另按实际任务配置。
