# Datadog 接入

唯一服务 cotree.datadog.datadog；默认来源 US1 https://mcp.datadoghq.com/v1/mcp。先确认组织数据所在 site，其他站点在官方 setup 页选定站点并核实其 MCP URL，再同名覆盖；不能把 US1 返回空数据当其他地区没有数据。

用现有 Shell 运行包内 scripts/connection-config.mjs（Node.js 22+）。脚本离线，只输出 JSON；不登录、不读凭据、不修改配置或启用插件。通过项目正常配置流程把 mcpServers 中同名项合入 .cotree/mcp.json，保留其他服务；同名覆盖只能保留一个有效实例。该覆盖独立于插件生命周期，停用 / 卸载时一并移除。不要直接修改带完整性摘要的 plugin.json。

- --auth bearer（默认）：COTREE_DATADOG_MCP_AUTHORIZATION 是完整 Bearer header，可使用独立 PAT / SAT 或经独立 OAuth 获取的适用 token。
- --auth keys：COTREE_DATADOG_API_KEY、COTREE_DATADOG_APPLICATION_KEY 分别映射 DD_API_KEY / DD_APPLICATION_KEY header；两者必须成对，不加 Bearer，不与旧 Authorization 并存。

密钥只放受控环境。RBAC、数据访问控制、log restriction 与服务账户 scopes 限定真实权限；工具目录包含写入不表示当前任务授权写入。OAuth 回调准入、登录和刷新由独立接入流程实现，本脚本不提供。先核对组织 / site、发现工具、读取指定对象，再验收已授权测试写入及回读；401 / 403 / 429、令牌过期和撤销逐项跟进。

2026-10-06：[官方接入](https://docs.datadoghq.com/mcp_server/setup/?lang_pref=en)、[PAT](https://docs.datadoghq.com/account_management/personal-access-tokens/)、[SAT](https://docs.datadoghq.com/account_management/service-access-tokens/)。本包不包含 Code Security MCP。
