# Terraform 接入

默认固定 hashicorp/terraform-mcp-server:0.4.0，仅 stdio --toolsets=registry，无容器端口或宿主挂载。需要 Docker daemon；本机 daemon 未运行时使用经官方校验的同版本二进制替代。

用现有 Shell 运行包内 scripts/connection-config.mjs（Node.js 22+）。脚本离线，只输出 JSON；不登录、不读凭据、不修改配置或启用插件。通过项目正常配置流程把 mcpServers 中同名项合入 .cotree/mcp.json，保留其他服务；同名覆盖只能保留一个有效实例。该覆盖独立于插件生命周期，停用 / 卸载时一并移除。不要直接修改带完整性摘要的 plugin.json。

- 默认：node scripts/connection-config.mjs 输出 Docker 公共 registry 配置，无认证变量。
- --binary <绝对路径>：使用已安装并核验过的 0.4.0 可执行文件，路径支持空格；脚本不下载、不执行或认证 binary。
- --cloud：额外启用 registry-private,terraform；COTREE_TERRAFORM_TFE_TOKEN 的原始值映射到子进程 TFE_TOKEN。Docker -e 仅传变量名，token 不进入 argv。没有设置时为空，不会自动登录。
- --cloud --address https://terraform.example.com：指定 Enterprise HTTPS origin。固定 0.4.0 使用 TFE_ADDRESS，新版文档中的 TFE_HOSTNAME 不能直接替换；本版本无本包宣称的统一只读开关。

云工具可修改资源，toolsets 不是权限控制。先核实实例 / 组织 / workspace / execution mode 与最小 token 权限，再验收指定对象读取及授权测试 run；云 API token、provider 凭据、VCS 权限分别管理。默认文档模式不需要云 token。清单同时记录运行条件和待验账户，不能把 binary 工具目录成功说成 Docker、云业务或 apply 成功。

2026-10-06：[0.4.0 源码与参数](https://github.com/hashicorp/terraform-mcp-server/tree/v0.4.0)、[固定官方发行](https://releases.hashicorp.com/terraform-mcp-server/0.4.0/)、[Terraform CLI](https://developer.hashicorp.com/terraform/cli)。
