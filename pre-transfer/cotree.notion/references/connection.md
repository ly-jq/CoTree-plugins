# Notion 接入与验收

服务名 cotree.notion.notion，地址 https://mcp.notion.com/mcp。认证变量 COTREE_NOTION_MCP_AUTHORIZATION 接收完整 OAuth Bearer header；普通 integration secret 不可据此认定兼容。不读取其他客户端凭据。

官方托管服务的自定义客户端流程要求 authorization code + PKCE，并提供发现及动态客户端注册。CoTree 当前包清单只能声明 headersEnv，已有通用 OAuth 配置不能证明具备完整 PKCE 流程。本批未实现登录、客户端注册和刷新，应在宿主现有 MCP / 凭据体系内补齐；不得在 Skill 中另写令牌存储或模拟用户登录。若已有独立合法取得的 access token，可做受控连接实验，仍需验证有效期与续期。

认证接通后依次发现工具、核对用户指定页面的身份和权限、读取正文及分页、在授权测试父页面下创建 / 更新并读回、验证过期与重连。401 只证明此请求需认证；403 也可能是工作区策略或资源权限。检查管理员允许的连接范围。未完成账户验收前，离线草稿与远端保存分别报告。

官方旧开源 Notion MCP 已不再积极维护，不作为这里的默认替代路径。

接入条件核对：2026-10-06，[官方连接指南](https://developers.notion.com/guides/mcp/get-started-with-mcp)、[自定义客户端](https://developers.notion.com/guides/mcp/build-mcp-client)。
