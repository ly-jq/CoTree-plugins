# GitLab 接入

默认 cotree.gitlab.gitlab 指向 https://gitlab.com/api/v4/mcp，完整 OAuth Bearer header 绑定 COTREE_GITLAB_MCP_AUTHORIZATION。GitLab.com 的 top-level group 或自建实例需允许 MCP；当前官方文档支持 OAuth Dynamic Client Registration，也可按组织流程准备独立客户端。实际套餐、版本及组织设置以目标实例为准，不沿用旧的固定 Duo 许可结论。普通 REST PAT 不当作已验证的 MCP token。

完整 Authorization header 只通过对应环境变量交给当前 CoTree 进程。值为合法 Bearer header，不在命令参数、包、代码、日志或 HTML 备注里填写令牌。独立认证后先核对身份 / 范围、只读指定对象，再验证已有授权的测试写入和读回。401 / 403 分别核查身份、scope、对象权限和组织策略；429 按服务提示处理。静态 header 不提供 OAuth 登录、刷新或撤销。

## 自建实例与工具组

运行 node scripts/connection-config.mjs --instance https://gitlab.example.com/gitlab --toolsets core,work_items,merge_requests,repository,ci,wikis。输入为实例 base URL，不是项目 URL 或 api/v4 端点；支持 HTTPS 端口 / 部署子路径，拒绝凭据、查询串、fragment、编码路径和点路径。脚本不验证服务器是否存在、证书、OAuth audience 或资源访问。

配置脚本通过现有 Shell 权限运行，Node.js 22+；路径相对 pluginRootDir。只向 stdout 输出 JSON，不联网、不读凭据、不写用户配置。将输出的同名项通过项目正常配置流程合并到 .cotree/mcp.json 的 mcpServers，保留其他服务；同名覆盖原插件服务，不能换名重复注册。工作区覆盖独立于插件生命周期，停用 / 卸载插件时也需移除覆盖。不要直接修改有完整性摘要的 plugin.json。

默认 X-Gitlab-Enabled-Mcp-Server-Toolsets 仅选择 core / work_items / merge_requests / repository / ci / wikis，meta 由服务保留。此过滤是工具目录选择，不限制 token 权限，不等于只读。避免同时发送 X-Gitlab-Enabled-Mcp-Server-Tools，官方行为是并集，不是交集。自建旧版本未支持 toolsets 时可以 --legacy 省略此 header，重新发现并逐项限制任务使用；不会降级成未经认证连接。Code Security 与远程 Duo Agent 会话不在本包主动启用范围。

最小账户验收：实例准入 → 独立 OAuth → 指定项目 / ref 只读 → Issue / MR / CI / Wiki 的实际工具与权限 → 已授权测试对象写入及读回 → 撤销 / 过期 / 重连。403 仅说明拒绝访问，不据此判断具体是付费、客户端白名单还是网络策略。

2026-10-06 核对：[官方 MCP 与 toolsets](https://docs.gitlab.com/user/model_context_protocol/mcp_server/)、[工具参考](https://docs.gitlab.com/user/model_context_protocol/mcp_server_tools/)。本包不采用来源宿主 CLI 或 mcp-remote 代理。
