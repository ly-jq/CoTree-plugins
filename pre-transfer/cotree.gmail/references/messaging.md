# Gmail API 与 MIME

Node 20+。node scripts/gmail-api.mjs --help 列出固定操作，--request request.json [--output 新文件]，写入必须带 --apply。开关不代表用户已经授权，已有明确发送 / 草稿任务时不增加固定确认轮次。每次一页；pageToken 明确放回 query，保持查询 / label 范围。

例：{"action":"messages-list","query":{"q":"in:inbox is:unread","maxResults":20}}；详情 {"action":"message-get","id":"服务观察到的ID","query":{"format":"full"}}。profile、threads-list / thread-get、labels-list / create、drafts-list / draft-get / create / update / send、message-modify / trash / untrash / send 也可用。附件使用 attachment-get + id / secondaryId 和 --output；完整响应校验 size 后写原始 bytes，不执行附件。

compose-message.mjs --input message.json --output 新draft.json 支持 from、to / cc / bcc 数组、subject、text，可选 threadId、inReplyTo、references 数组和稳定 messageId。地址使用裸 ASCII mailbox，不接收 display name；中文主题和正文编码为 UTF-8 MIME。输入 / 输出含通信内容，应保存在任务目录。生成器没有网络操作，输出 sent=false。HTML 与附件 MIME 可使用项目已选且实际验证的 MIME 库准备，不能直接拼未转义的 header。

将生成文件里的 message 对象传给 {"action":"draft-create","body":{"message":...}}，而不是整个输出 envelope。发送既有草稿用 {"action":"draft-send","body":{"id":"实际draft ID"}}；直接发信 body 为 message 对象。用户只要求草稿时不能发送。

回复须同时满足真实 threadId、In-Reply-To / References 和主题匹配；脚本检查字段形状，模型负责核对真实原邮件。Message-ID 用于失败后的查询与人工追踪，不能当 Gmail 幂等保障。服务返回后读回 message / thread，不把发送请求接受当对方送达。

请求最多 1 MiB JSON、响应最多 8 MiB，20 秒超时，拒绝重定向；写入失败不自动重试。脚本只转发独立 OAuth token，不提供登录 / 刷新。错误省略服务正文。新文件不覆盖现有文件；本地输出失败不等于远端写入失败。
