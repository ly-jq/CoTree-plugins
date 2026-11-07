# MCP 与 CoTree

当前 CoTree SDK 客户端基于 @modelcontextprotocol/sdk 1.29.0，初始化 capabilities 为空；工具、resources、prompts 有实际调用接口。配置类型里出现 elicitationHandler 并不证明客户端已注册处理器。不能承诺 Apps UI、sampling、roots 或交互输入可用。

来源完整参考在 resources/source-01/content/skills/，可查工具设计、授权、UI 和打包；其中 Claude 版本、marketplace、CIMD / DCR 要求要按当前目标核对，不照搬。OAuth 授权客户端、MCP 服务身份和上游凭据分别处理；不要转发另一产品的 token 或在 stdio args 中写入 secret。

2026-10-06 核对：[SDK v1 文档](https://ts.sdk.modelcontextprotocol.io/server)、[SDK 当前主线](https://github.com/modelcontextprotocol/typescript-sdk)、[传输规范](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)。当前主线已是 v2；本脚手架有意按 CoTree 现有 v1 合同固定版本，升级应按真实兼容测试决定。
