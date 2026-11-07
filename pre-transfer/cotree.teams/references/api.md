# Teams Graph REST

通过已有授权 Shell 运行包内 Node.js 22+ 脚本；--request 指向不超过 1 MiB 的 JSON 文件，--output 只能保存到新文件。token 只从本插件环境变量读取，不沿用原宿主连接器。写入还需 --apply，它表示执行意图，不代替用户授权。每次读取一页，incomplete / nextRequest 指明剩余页；分页保持同一 HTTPS Graph origin、对象路径与查询条件。支持 $top 的入口默认 50，输入上限 50；20 秒超时、响应上限 8 MiB，不自动重试。回执的 businessVerified:false 表示仍需核对实际对象。401 处理身份和过期，403 核对 consent / 对象权限，412 重读版本，429 遵循服务退避；不降低权限检查或盲目重发。

入口 node scripts/teams-api.mjs --request request.json [--output new.json] [--apply]；COTREE_TEAMS_ACCESS_TOKEN 是原始 OAuth token，无 Bearer 前缀。固定 https://graph.microsoft.com/v1.0；不支持个人账户、其他主权云或 application migration 消息导入。

|动作|必需 ID|可选 query|
|---|---|---|
|profile|无|$select|
|joined-teams|无|无|
|channels|teamId|$select, $filter|
|chats|无|$top, $orderby|
|chat-members|chatId|无|
|chat-messages|chatId|$top, $orderby, $filter|
|chat-message|chatId, messageId|无|
|channel-messages|teamId, channelId|$top|
|channel-message|teamId, channelId, messageId|无|
|channel-replies|teamId, channelId, messageId|$top|
|channel-files|teamId, channelId|无|
|chat-send|chatId|无|
|channel-send|teamId, channelId|无|
|channel-reply|teamId, channelId, messageId|无|

请求示例：
```json
{"action":"chat-send","chatId":"OBSERVED_CHAT_ID","body":{"body":{"contentType":"text","content":"已授权的跟进正文"}}}
```

发送支持非空纯文本，最多 16000 字符；不支持 HTML / mentions / attachments。channel-messages 只读根消息，回复单独拉取。下一页原样使用 nextRequest；保留 incomplete，不默认声称读完。

独立 Entra 应用按实际动作核对 delegated scopes：profile 为 User.Read，团队发现 Team.ReadBasic.All，频道 Channel.ReadBasic.All，聊天目录 Chat.ReadBasic，正文 Chat.Read，成员 Chat.ReadBasic，频道正文 ChannelMessage.Read.All；发送 ChatMessage.Send / ChannelMessage.Send；filesFolder 文件权限另查对应 API。只申请本任务需要的范围，租户 consent 不代替对象权限；不在脚本里实现 OAuth 登录或刷新。

2026-10-07：[加入的团队](https://learn.microsoft.com/en-us/graph/api/user-list-joinedteams?view=graph-rest-1.0)、[聊天消息](https://learn.microsoft.com/en-us/graph/api/chat-list-messages?view=graph-rest-1.0)、[频道消息](https://learn.microsoft.com/en-us/graph/api/channel-list-messages?view=graph-rest-1.0)、[发送聊天消息](https://learn.microsoft.com/en-us/graph/api/chat-post-messages?view=graph-rest-1.0)、[频道文件夹](https://learn.microsoft.com/en-us/graph/api/channel-get-filesfolder?view=graph-rest-1.0)。
