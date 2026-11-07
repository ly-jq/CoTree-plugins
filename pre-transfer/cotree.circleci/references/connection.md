# CircleCI 接入

本包复用当前 Shell / 浏览器，无新 MCP。先验证本机 CLI 版本及 help，再用独立 CircleCI 登录或 CIRCLE_TOKEN；令牌不通过 --token 等参数传递，不回显配置。CircleCI Cloud 默认站点和自建 Server 的版本 / 认证不同。新 CLI 支持 Windows，Chunk 归档仅列 macOS / Linux，需另核实。

配置校验可能调用远端 API，先检查待发送配置。读取具体项目、构建日志及测试结果后再按任务授权重跑、触发或取消；真实账户、组织策略及云结果仍待验收。CLI 身份检查不能代替 Chunk / GitHub / 模型提供商身份。

2026-10-06：[官方 CLI](https://cli.circleci.com/reference/)、[版本发行](https://github.com/CircleCI-Public/circleci-cli/releases)、[CircleCI 配置](https://circleci.com/docs/reference/configuration-reference/)。本地配置 / 代码修改无需服务账户；线上检查需要对应访问权限。
