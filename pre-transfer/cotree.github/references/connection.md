# GitHub 连接

此包只注册 cotree.github.github。先通过 CoTree 标准目录安装并启用，再让启动 CoTree 的进程环境包含 COTREE_GITHUB_MCP_AUTHORIZATION；值是完整的 Authorization header，例如 Bearer 后接服务令牌。环境变量更改后重启对应 CoTree 进程。不要把实际值写入 plugin.json、源码、聊天、日志或命令历史。没有此变量时不会自动登录。

使用 GitHub 独立签发的 PAT，选择目标仓库和任务实际需要的权限；只读任务先用只读权限。组织 SSO、令牌审批与有效期由 GitHub 管理。本包连接 GitHub.com 官方远程端点；其他部署须按其官方地址单独配置并验收，不向任意地址转发令牌。

连接后先发现工具并对用户指定仓库做最小读取，再考虑写操作。401 表示认证未完成或无效；403 检查仓库访问、组织限制与令牌权限；429 遵守服务返回的重试时机。超时保留未确认状态。令牌更新仍由用户的凭据管理流程完成。

可用工具随服务和权限变化；需要受限工具面时使用 GitHub 官方的只读端点或 X-MCP-Readonly / X-MCP-Toolsets 配置。这是可选的连接配置变体，修改封装包后必须重新校验完整性，不能直接改已封存包。本包保留标准端点供授权读写，权限仍由 CoTree 与服务共同控制。

本插件的 headersEnv 绑定不包含交互 OAuth 客户端、回调或自动刷新。GitHub 的 OAuth 接入需要宿主自己的应用注册，不能复用其他产品的登录凭据。

来源核对：2026-10-06，[GitHub MCP](https://github.com/github/github-mcp-server)、[远程配置](https://github.com/github/github-mcp-server/blob/main/docs/remote-server.md)。
