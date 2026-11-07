# Google Calendar REST

使用 Node.js 22+，从 pluginRootDir 定位脚本。命令格式：node scripts/google-calendar-api.mjs --request request.json [--output new-file.json] [--apply]。request 是最多 1 MiB 的 JSON 对象，输出文件仅新建、不覆盖；已有输出会在联网前拒绝。查询通过 query 对象传入，页面大小 1..100，默认 50。返回 serviceAccepted 与 businessVerified=false；HTTP 接受不等于外部业务已完成。每次调用一页，后续使用返回的 nextRequest；保持原范围，不自行拼接 cursor。

| action | 主要输入 |
| --- | --- |
| calendars-list | 可选 query.maxResults / pageToken / minAccessRole / showHidden |
| calendar-get | calendarId |
| events-list | calendarId；query.timeMin / timeMax 必填；默认 singleEvents=true |
| event-get | calendarId / id，query.timeZone 可选 |
| event-instances | calendarId / 系列 id，query.timeMin / timeMax 必填 |
| freebusy | body.timeMin / timeMax / items，最多 50 日历；只读 POST |
| event-create | calendarId、body.start / end；query.sendUpdates 必填 |
| event-patch | calendarId / id、当前 etag、body；query.sendUpdates 必填 |
| event-delete | calendarId / id、当前 etag；query.sendUpdates 必填，不带 body |

窗口为带 offset 的 RFC3339，例如 2026-10-06T00:00:00+08:00。events-list 还支持 q、orderBy、showDeleted、maxResults、pageToken、timeZone；orderBy=startTime 要求 singleEvents=true。未实现 syncToken，不把单页当全量同步。事件的 id 与日历 ID 作为不透明字符串，脚本只编码一次。

request 示例：{"action":"events-list","calendarId":"primary","query":{"timeMin":"2026-10-06T00:00:00+08:00","timeMax":"2026-10-07T00:00:00+08:00"}}。日期是演示，按实际任务替换。创建的 body.start / end 可为 {"dateTime":"2026-10-06T09:00:00+08:00","timeZone":"Asia/Shanghai"}；全天改为 {"date":"2026-10-06"}，end 取次日日期。改变时间需同时提供 start/end，不能混用 date 与 dateTime。

sendUpdates 只取 all / externalOnly / none，选择要符合用户授权和同步需求；通知设置不代表发送已完成。conferenceDataVersion 按真实会议创建需要配置。patch 数组会替换数组。ETag 不接受 *，冲突必须重读。临时网络错误不自动重试。ACL、日历创建 / 清空、附件上传、增量同步及任意 URL 未封装。

[事件列表](https://developers.google.com/workspace/calendar/api/v3/reference/events/list)、[创建与通知](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert)、[版本前置条件](https://developers.google.com/workspace/calendar/api/guides/version-resources)。
