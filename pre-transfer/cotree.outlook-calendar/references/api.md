# Outlook Calendar REST

使用 Node.js 22+，从 pluginRootDir 定位脚本。命令格式：node scripts/outlook-calendar-api.mjs --request request.json [--output new-file.json] [--apply]。request 是最多 1 MiB 的 JSON 对象，输出文件仅新建、不覆盖；已有输出会在联网前拒绝。查询通过 query 对象传入，页面大小 1..100，默认 50。返回 serviceAccepted 与 businessVerified=false；HTTP 接受不等于外部业务已完成。每次调用一页，后续使用返回的 nextRequest；保持原范围，不自行拼接 cursor。

Microsoft Graph 固定为全球云 /v1.0/me。请求通用字段为 action、所需 ID、query、body、nextLink、timeZone 与可选 etag；其他顶层字段拒绝。nextLink 只能用于原集合的 GET，必须保留同源、同路径与查询范围；脚本不向任意 URL 发送凭据。保留服务完整 nextLink，不提取或重新解释 $skiptoken。时间窗口需带明确 UTC offset；timeZone 设置输出时区，不替代窗口 offset。etag 仅转为 PATCH 的 If-Match，不宣称所有 Outlook 操作都有事务或锁；写前读当前 changeKey / @odata.etag，发生冲突后重读，不覆盖并发变更。

| action | 输入 |
| --- | --- |
| profile / calendars-list | 可选 query.$select；列表可 $top |
| calendar-get | calendarId 可省略表示默认日历 |
| calendar-view | 可选 calendarId；query.startDateTime / endDateTime 必填 |
| event-get / event-instances | id；instances 还需 query 起止窗口 |
| schedule | body.schedules / startTime / endTime，可选 availabilityViewInterval；只读 |
| event-create | 可选 calendarId，body.start / end 等真实 event 字段 |
| event-patch | id、body 中所改字段，可选 etag |
| event-cancel | id、body={} 或 {"comment":"已授权的说明"}；只有组织者能取消 |
| event-accept / event-decline / event-tentative | id、body.sendResponse 布尔值，可选 comment |

calendar-view / event-instances 支持 $top、$select、$filter、$orderby；未封装任意 OData action。默认日历不等于用户意图的所有日历。窗口示例：{"action":"calendar-view","query":{"startDateTime":"2026-10-06T00:00:00+08:00","endDateTime":"2026-10-07T00:00:00+08:00"},"timeZone":"China Standard Time"}。换成实际任务日期。

事件 body 的 start/end 则例如 {"dateTime":"2026-10-06T09:00:00","timeZone":"China Standard Time"}；本客户端要求同一时区及不含 offset 的本地时间，不能混用上述窗口格式。时区名须服务支持，夏令时歧义需结合实际 offset 和用户意图判断。改变时间或 isAllDay 必须同时提供两端。重复规则依服务 schema；实例与系列 ID 由实际读取确定，不由标题猜测。取消 / 回复可能通知其他人；--apply 不替代授权，202 不证明消息送达。

[创建事件](https://learn.microsoft.com/en-us/graph/api/calendar-post-events?view=graph-rest-1.0)、[取消](https://learn.microsoft.com/en-us/graph/api/event-cancel?view=graph-rest-1.0)。
