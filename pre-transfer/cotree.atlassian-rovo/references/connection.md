# Atlassian Rovo 接入

原生 streamable-http 端点：https://mcp.atlassian.com/v1/mcp/authv2。完整 Authorization header 绑定 COTREE_ATLASSIAN_ROVO_MCP_AUTHORIZATION；不得把 token 放到 URL、包或日志。

交互路径推荐独立 OAuth 2.1；CoTree 的此服务登录和刷新尚未实现。组织管理员开启 API token 认证后，非交互路径可用具有 MCP scopes 的个人 API token：Basic + base64(email:api_token)，或可用的服务账户 API key：Bearer。Base64 不是加密，header 同样是凭据；不要在聊天、命令参数或配置文件中打印它。未开启的组织不能以 API token 绕过 OAuth。OAuth / API token 仍受用户对象权限和组织策略约束。

先发现实际工具、可访问站点和 cloudId，再在明确站点读取一个 Jira issue / Confluence page；Jira 与 Confluence 权限分别验收。授权测试事项写入、页面版本冲突、过期 / 撤销和重连另验。匿名端点响应只能证明当时连接边界。API token scopes、组织开关、域 / IP 策略均是认证 HTML 后续项。

离线定位：node scripts/atlassian-target.mjs https://example.atlassian.net/browse/APP-123。支持该 issue URL / key、/wiki/spaces/SPACE/pages/123/Title、/wiki/pages/viewpage.action?pageId=123；输出 verified=false，不把域名转换成 cloudId。短链接和 Data Center 要通过独立可用工具解析。

核对日期 2026-10-06：[认证](https://support.atlassian.com/atlassian-ai-gateway/docs/authentication-and-authorization/)、[MCP 组织设置](https://support.atlassian.com/security-and-access-policies/docs/control-atlassian-mcp-server-settings/)。
