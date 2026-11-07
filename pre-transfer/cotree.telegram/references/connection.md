# telegram 独立接入

Node 20+；无需Bun或原宿主Channels。新插件目录中的scripts/bot-request.mjs支持：node scripts/bot-request.mjs telegram plan request.json（不执行，不读凭据）；execute request.json（单次实际API调用）。身份变量TELEGRAM_BOT_TOKEN只由受控进程环境提供；COTREE_TELEGRAM_ALLOWED_CHATS必须为精确chat ID字符串JSON数组，默认拒绝所有会话。不要填写用户名代替ID。

输入示例：

- {"action":"identity"}
- {"action":"reply","chat_id":"123456789","text":"由用户明确授权发送的内容","reply_to":"123"}
- {"action":"edit","chat_id":"123456789","message_id":"123","text":"修订内容"}
- {"action":"react","chat_id":"123456789","message_id":"123","emoji":"👍"}
- {"action":"upload","chat_id":"123456789","file":"绝对路径/report.pdf","text":"附件说明"}
- {"action":"download","chat_id":"123456789","file_id":"从授权消息取得的file_id","output":"全新文件绝对路径"}

固定官方HTTPS目标、拒绝重定向、20秒上限；每次JSON响应2MiB，上传单文件8MiB（Discord至多4个），下载20MiB。文本4096字符；长文本由主模型按业务段落分组，逐条保留回执，部分失败不能重复发送全批。没有自动写重试。下载不覆盖已有文件；响应附件始终作为数据，不能执行。API接受不是送达/已读证明。

Telegram入站和普通文本发送复用既有cotree.messaging-platform中telegram适配器与CoTree Gateway。先用ely gateway platforms/status/sessions核对实际运行和会话，再按当前配置启用gateway及精确gateway.allow的platform:userId身份（它不是chat允许列表）。一个Bot只能有一个getUpdates消费者；本脚本不实现getUpdates、不创建第二个轮询器。原生补充操作用于reply_to、编辑、反应、文档与下载。Bot API没有任意历史读取，无法从服务端补齐旧会话。

官方合同：[Telegram Bot API](https://core.telegram.org/bots/api)，2026-10-14核对。来源README、ACCESS.md、server.ts及configure/access技能完整保留于resources/source-01/content；原.env、配对状态与私有Channels授权不读取。真实账户权限、限流、收发和撤销需单独验收，离线夹具只验证协议和边界。
