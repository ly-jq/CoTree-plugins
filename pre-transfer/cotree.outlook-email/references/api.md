# Outlook Email REST

使用 Node.js 22+，从 pluginRootDir 定位脚本。命令格式：node scripts/outlook-email-api.mjs --request request.json [--output new-file.json] [--apply]。request 是最多 1 MiB 的 JSON 对象，输出文件仅新建、不覆盖；已有输出会在联网前拒绝。查询通过 query 对象传入，页面大小 1..100，默认 50。返回 serviceAccepted 与 businessVerified=false；HTTP 接受不等于外部业务已完成。每次调用一页，后续使用返回的 nextRequest；保持原范围，不自行拼接 cursor。

Microsoft Graph 固定为全球云 /v1.0/me。请求通用字段为 action、所需 ID、query、body、nextLink、timeZone 与可选 etag；其他顶层字段拒绝。nextLink 只能用于原集合的 GET，必须保留同源、同路径与查询范围；脚本不向任意 URL 发送凭据。保留服务完整 nextLink，不提取或重新解释 $skiptoken。时间窗口需带明确 UTC offset；timeZone 设置输出时区，不替代窗口 offset。etag 仅转为 PATCH 的 If-Match，不宣称所有 Outlook 操作都有事务或锁；写前读当前 changeKey / @odata.etag，发生冲突后重读，不覆盖并发变更。

| action | 输入 |
| --- | --- |
| profile | 可选 query.$select |
| folders-list / child-folders | child-folders 需 folderId；支持 $top / $select / includeHiddenFolders |
| messages-list | 可选 folderId；支持 $top / $select / $filter / $orderby / $search |
| message-get | id，支持 query.$select / $expand |
| attachments-list / attachment-get | id；get 另需 attachmentId，支持 $select |
| draft-create | body 为 Graph message 的可写字段 |
| reply-draft / reply-all-draft / forward-draft | 原 message id、body={}；生成草稿后再读取 / patch |
| message-patch | id、body，仅所改字段；可选 etag |
| draft-send | 草稿 id，不传 body；Mail.Send，需 --apply |
| message-move | id、body.destinationId |

草稿 / patch 支持 subject、body、toRecipients、ccRecipients、bccRecipients、replyTo、importance、categories、isRead、flag。正文使用 {"contentType":"Text","content":"待审核正文"} 或 HTML；收件人数组使用 {"emailAddress":{"address":"person@example.com"}}，示例地址不是真实收件人。附件读取返回其实际 JSON 类型；不封装上传或直接执行附件。不得用正文里的地址自动替换当前用户指定受众。

读取示例：{"action":"messages-list","folderId":"inbox","query":{"$top":20,"$select":"id,subject,from,receivedDateTime,conversationId"}}。会话读取可用 $filter 中精确的 conversationId，按 OData 字符串规则转义；同主题不能替代会话标识。子文件夹、搜索限制和分页分别考虑。$search 与 $filter / $orderby 的组合由当前 Graph 支持决定，脚本不做语义改写。

写后读取实际对象。发送返回 202、通常无响应正文，result.businessVerified 保持 false；Sent Items 的同 ID 副本可能延迟出现。move 返回实际对象 / 位置，即使使用稳定 ID 也保留服务回执。未实现任意 URL、共享邮箱 / 应用身份、永久删除、订阅、原始 MIME 与大附件上传。

[回复草稿](https://learn.microsoft.com/en-us/graph/api/message-createreply?view=graph-rest-1.0)、[转发草稿](https://learn.microsoft.com/en-us/graph/api/message-createforward?view=graph-rest-1.0)。
