# Figma 连接模式

默认服务 cotree.figma.figma 指向 https://mcp.figma.com/mcp。Figma 官方要求远程客户端进入 MCP Catalog，CoTree 的准入未确认；远程 OAuth 登录和刷新也未接入。COTREE_FIGMA_MCP_AUTHORIZATION 只是有效独立 OAuth Bearer header 的转发绑定，普通 REST PAT 不能被当作登录替代。先跟进准入，再做账户验收。

可选桌面路径：已登录的 Figma Desktop → Design 文件的 Dev Mode → 开启 MCP，官方地址 http://127.0.0.1:3845/mcp。本机尚未验收。桌面可用于支持的选区 / 设计读取，不能承诺具备远程创建、编辑等全部工具。实际 tools/list 是当前能力依据。

在插件根运行 node scripts/connection-config.mjs --mode desktop（或 remote），只生成 CoTree mcpServers JSON，不写文件、不读取凭据、不发请求。通过项目正常配置流程，把生成的 cotree.figma.figma 项合并到 .cotree/mcp.json 的 mcpServers，保留其他项目；同名覆盖默认服务，不并行注册两套。桌面配置没有认证头。该覆盖属于工作区配置，插件禁用 / 卸载不会自动移除它，届时需按同一配置流程移除覆盖。不可直接修改已封存的 plugin.json。

验收顺序：工具发现 → 指定文件读取与截图 → 实际支持的授权测试写入及读回 → 断线 / 过期恢复。403 不能单独证明是准入限制，也可能涉及文件 / 账户权限；保留真实错误，不能猜测。

2026-10-06 核对：[远程安装](https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/)、[桌面安装](https://developers.figma.com/docs/figma-mcp-server/local-server-installation/)、[工具能力](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/)。
