# monday.com 接入

唯一端点 https://mcp.monday.com/mcp，Streamable HTTP；COTREE_MONDAY_COM_MCP_AUTHORIZATION 绑定完整 Bearer header。个人使用 / 原型测试可用自己的个人 API token，权限继承该用户；不能将该身份共享给其他用户。组织访问使用独立 OAuth app，公开集成采用官方要求的 DCR / 注册流程。本包未实现自动注册、授权或刷新，旧 /sse 不受支持。

凭据只注入当前 CoTree 进程的对应环境变量，值是完整 Authorization header（Bearer 加合法访问令牌），不要写入包、项目文件、日志或 HTML。使用现有 MCP 配置和原生启停 / 重连机制，不另外启动来源 CLI 服务，不安装另一份相同 MCP。配置声明、协议连通、工具发现、账户访问和业务完成分别报告。

先验证实际工具目录、身份和指定目标只读；再在授权测试对象验证必要写入及读回。401 / 403 分别核查身份、scope、资源访问及管理员策略，429 按实际重试提示退避；写入错误不能直接自动重发。工具 schema 和账户权限会变化，以运行时事实为准。

MCP 内部调用平台 API，工具 schema 可能更新。若实际任务需要固定 Api-Version，通过现有 MCP 配置显式选择服务支持版本；本包不硬编码易过期的版本。各工具消耗账户 API 限额，按真实服务提示处理，勿自动无限轮询。参见 [独立 API token](https://developer.monday.com/api-reference/docs/mcp-api-token)、[客户端集成](https://developer.monday.com/api-reference/docs/integrate-with-monday-mcp)（2026-10-06 核对）。
