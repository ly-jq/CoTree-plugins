# 私网 MCP

Node20+及OpenSSH客户端，Linux/macOS/Windows均使用argv而不是拼shell。request.json字段：sshHost、user、sshPort(默认22)、remoteHost、remotePort、remoteScheme="http"、localPort、path(如/mcp)、knownHostsFile绝对路径、可选identityFile绝对路径及authorizationEnv变量名。密钥不复制到插件包；known_hosts需由用户/可信管理员核对指纹，不能盲目ssh-keyscan即信任。含空格路径受支持；当前DNS/IPv4主机合同不含IPv6，勿改写为猜测地址。

plan不连接；run以前台SSH进程维持通道，保留宿主取消句柄。生成的mcpServer是CoTree配置条目，不自动覆盖整个.cotree/mcp.json；仅通过当前MCP治理工具注册选定条目，且不要重复注册同目标。remoteHost由SSH服务器解析，目标网络访问必须在授权范围内。远端HTTP经过SSH加密段，SSH出口到MCP之间的网络也应可信或共机。

来源create-docker-mcp-tunnel命令完整保留resources/source-01/content，包含Anthropic Console/专用proxy/内层TLS流程。该路线需要专属调用方，与CoTree通用HTTP不等价；本包实际提供SSH替代。Docker MCP服务本身可沿用，其部署由已有工程插件处理。既有cotree.cloudflare负责Cloudflare账号/资源，不复制其生命周期。

撤销：停止本任务进程、禁用本条MCP、必要时撤销SSH密钥和远端MCP身份。真实私网/主机权限/密钥/长期重连需另验，离线OpenSSH配置解析不证明隧道连通。
