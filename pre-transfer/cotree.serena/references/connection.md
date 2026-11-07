# Serena 项目绑定

固定提交：3155fd67e9b7336a4a4cbf51ac111bba88fa53d7（serena-agent 2.0.0.dev0）；需要 Python >=3.11,<3.15 和 uvx。MCP args 使用 --context ide --project .，cwdBase=workspace。ide 去除基础文件 / Shell 工具，固定项目时去除 activate_project；不依赖 Claude / Codex 专用 context、Hook 或系统提示覆盖。项目与用户配置仍可影响其他工具；启动后以实际目录和 schema 为准。

默认关闭 web dashboard、自动浏览器与 GUI log 窗口。首次获取 Git 依赖或索引可能联网并写用户缓存；离线预安装可使用同提交的 serena 可执行文件替换 uvx 前缀，保留后续参数与项目绑定，并按 CoTree 正常配置 / 完整性流程管理。安装本包不启动 MCP，不修改现有 registry。

本地语义能力无需云账户。JetBrains 后端 / 私有依赖另有各自环境要求，不计作已经接入；默认使用来源支持的 LSP 后端。工作目录不是安全沙箱，服务权限由 CoTree 当前会话和操作授权约束。

核对依据（2026-10-07）：[官方客户端接入](https://oraios.github.io/serena/02-usage/030_clients.html)、[启动方式](https://oraios.github.io/serena/02-usage/020_running.html)、[固定版本 ide context](https://github.com/oraios/serena/blob/3155fd67e9b7336a4a4cbf51ac111bba88fa53d7/src/serena/resources/config/contexts/ide.yml)。
