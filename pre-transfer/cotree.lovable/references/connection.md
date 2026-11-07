# Lovable 独立接入

官方Streamable HTTP：https://mcp.lovable.dev。2026-10-14匿名元数据确认resource与OAuth服务器https://lovable.dev/oauth；只接受OAuth，普通API key不可代替。CoTree当前Manifest绑定完整Bearer头到COTREE_LOVABLE_MCP_AUTHORIZATION；独立受控PKCE登录客户端负责state、S256、回调验证、刷新与撤销，不能用缺PKCE的手工授权码交换冒充完成。官方对其他MCP客户端公布client_id 6d465f583e1e4ce5801b1616f735670c；使用前核对元数据和允许的回调。此ID为公开客户端身份，不是用户令牌。

先从https://mcp.lovable.dev/.well-known/oauth-protected-resource发现issuer及scopes，读操作优先projects:read/workspaces:read，创建或修改另需相应write范围。登录、刷新及真实工作区尚未验收，写入和发布只按当前用户授权。

本包保留全部原manifest、应用连接器和图标资源于resources/source-01/content；原ASDK连接器ID仅作追溯。独立MCP替代该入口，MCP Apps专属widget和Claude专属导入不是通用能力。官方工具schema可能演进，调用前用ToolSearch核对参数。

参考：[官方MCP](https://docs.lovable.dev/integrations/lovable-mcp-server)、[官方客户端配置](https://github.com/lovablelabs/mcp)。
