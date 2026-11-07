# OpenAI 开发参考

完整五项来源技能在 resources/source-01/content/skills；build-chatgpt-app/references 保留七份技术主题，scripts 原 fallback 及 key helper / tests 只归档。本包原生模板替代来源可覆盖目录、全网监听和无界手写 bridge 的起点；既有专属 Platform connector 暂未实现，不注册 confirm_openai_api_key_local_destination MCP。

已核对官方入口（2026-10-07）：https://developers.openai.com/api/docs/guides/agents/quickstart 、https://developers.openai.com/plugins/build/app-quickstart 、https://developers.openai.com/plugins/build/mcp-server 、https://developers.openai.com/learn/developers-codex-plugin 。旧 Apps SDK 链接可能重定向，以实时页面为准。

SDK 基线 @openai/agents 0.19.0、openai-agents 0.23.1；Apps @modelcontextprotocol/sdk 1.32.1、ext-apps 1.7.5。升级要重新验证类型、MCP 和 bridge。独立 API 身份、真实 ChatGPT 连接 / 上线见根 auth-followup.html。仅存在环境变量不证明 key 可用。
