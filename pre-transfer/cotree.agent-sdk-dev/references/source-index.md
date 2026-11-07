# Claude Agent SDK 参考

原 new-sdk-app 命令与两个 verifier Agent 完整保留于 resources/source-01/content；这些原宿主说明不注册、不自动执行。

官方：https://code.claude.com/docs/en/agent-sdk/quickstart 、https://code.claude.com/docs/en/agent-sdk/typescript 、https://code.claude.com/docs/en/agent-sdk/python 、https://code.claude.com/docs/en/agent-sdk/permissions 。本批固定 @anthropic-ai/claude-agent-sdk 0.3.292 与 claude-agent-sdk 0.2.164。模板是独立工程起点，非 CoTree 的第二套 runtime。

scripts/api-environment.mjs --provider claude 仅输出两个变量是否非空；不读取 .env、不验证 key、不连网络。独立认证、真实调用、取消和部署跟进见根目录 auth-followup.html。
