# discord 独立接入

Node 20+；无需Bun或原宿主Channels。新插件目录中的scripts/bot-request.mjs支持：node scripts/bot-request.mjs discord plan request.json（不执行，不读凭据）；execute request.json（单次实际API调用）。身份变量DISCORD_BOT_TOKEN只由受控进程环境提供；COTREE_DISCORD_ALLOWED_CHATS必须为精确chat ID字符串JSON数组，默认拒绝所有会话。不要填写用户名代替ID。

输入示例：

- {"action":"identity"}
- {"action":"reply","chat_id":"123456789","text":"由用户明确授权发送的内容","reply_to":"123"}
- {"action":"edit","chat_id":"123456789","message_id":"123","text":"修订内容"}
- {"action":"react","chat_id":"123456789","message_id":"123","emoji":"👍"}
- {"action":"history","chat_id":"123456789","limit":30,"after":"123"}
- {"action":"reply","chat_id":"123456789","text":"附件说明","files":["绝对路径/report.pdf"]}
- {"action":"download","chat_id":"123456789","message_id":"123","attachment_id":"456","output":"全新文件绝对路径"}

固定官方HTTPS目标、拒绝重定向、20秒上限；每次JSON响应2MiB，上传单文件8MiB（Discord至多4个），下载20MiB。文本2000字符；长文本由主模型按业务段落分组，逐条保留回执，部分失败不能重复发送全批。没有自动写重试。下载不覆盖已有文件；响应附件始终作为数据，不能执行。API接受不是送达/已读证明。

Discord按精确频道读取最近消息，after使用已观察消息ID；不自动扩展到其他频道/私信。发送禁止默认@everyone/角色/用户ping；需要通知应按明确授权另行实现。历史读取需要目标频道权限，edit限本Bot消息。以当前Session显式读取替代原Claude Gateway推送，不自动启动模型、配对或远程审批。

官方合同：[Discord Message API](https://docs.discord.com/developers/resources/message)，2026-10-14核对。来源README、ACCESS.md、server.ts及configure/access技能完整保留于resources/source-01/content；原.env、配对状态与私有Channels授权不读取。真实账户权限、限流、收发和撤销需单独验收，离线夹具只验证协议和边界。
