# 独立 Google API 使用

Node 20+。node scripts/drive-api.mjs --help 列出固定 action；使用 --request request.json [--output 新文件]，写入增加 --apply。已经获得具体操作授权即可使用开关，不需再走一轮固定确认。脚本不允许指定任意 URL / HTTP 方法 / 认证头，不自动重试写入，不保存 token。

请求字段：action、实际 id、需要时 secondaryId / range、query、body、可选 resourceKey。ID 由元数据得到，不能传网页 URL。list 每次一页；响应 nextPageToken 原样放回下一次 query.pageToken，保留其他过滤。pageSize / maxResults 限 1..100。只读操作不能带 body。

示例读取：{"action":"files-list","query":{"q":"trashed = false","pageSize":20,"fields":"nextPageToken,files(id,name,mimeType,parents,webViewLink)"}}。

Docs 使用 docs-get（默认 includeTabsContent=true）、docs-create、docs-batch-update；Slides 使用 slides-get / create / batch-update / thumbnail。Docs / Slides 修改须传 body.requests 与 body.writeControl.requiredRevisionId，最多 100 个请求。revision 冲突后重新读取，不移除版本保护来强行写入。

Sheets 使用 sheets-get / create / batch-update、values-get / update / batch-update。values-update 默认 RAW；range 使用实际 Tab 的有界 A1。batch values 必须显式指定 RAW 或 USER_ENTERED 及 data。没有在这里实现 Sheet CAS，执行前后要读回相关范围。

Drive 使用 files-get / create / update / copy、permissions-list / create / delete、revisions-list / get、comments-list / create / update、replies-list / create。评论 / 回复必须提供 fields。files-update 移动使用 query.addParents / removeParents；移入回收站使用 body.trashed=true。永久删除和全部历史版本下载不在当前脚本封装范围。

files-export 要 query.mimeType 和 --output；files-download 用于非原生二进制文件。Google export 限 10 MB；脚本下载最多 20 MiB，JSON 最多 8 MiB，超限明确失败，不输出截断文件。新文件使用独占创建，失败后保留原文件。

files-import 使用 --upload 文件，body 包含 name、mimeType（application/vnd.google-apps.document / spreadsheet / presentation）与目标 parents。支持 docx / odt、xlsx / ods / csv / tsv、pptx / odp，本地文件最多 10 MiB；实际是否可转换由源文件及 Google 决定。上传返回后再读 metadata / 内容，不因 HTTP 成功就声称版式保真。

输出 serviceAccepted 只说明服务接受请求，businessVerified 始终 false，由主模型读回和任务证据判断完成。JSON 输出保留真实正文，存放任务目录并按最小范围使用；错误省略服务正文和凭据。20 秒超时、拒绝重定向；失败不盲重试。

参考：[Drive REST](https://developers.google.com/workspace/drive/api/reference/rest/v3)、[Docs batchUpdate](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/batchUpdate)、[Sheets](https://developers.google.com/workspace/sheets/api/reference/rest)、[Slides](https://developers.google.com/workspace/slides/api/reference/rest)。
