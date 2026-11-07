# SharePoint Graph REST

通过已有授权 Shell 运行包内 Node.js 22+ 脚本；--request 指向不超过 1 MiB 的 JSON 文件，--output 只能保存到新文件。token 只从本插件环境变量读取，不沿用原宿主连接器。写入还需 --apply，它表示执行意图，不代替用户授权。每次读取一页，incomplete / nextRequest 指明剩余页；分页保持同一 HTTPS Graph origin、对象路径与查询条件。支持 $top 的入口默认 50，输入上限 50；20 秒超时、响应上限 8 MiB，不自动重试。回执的 businessVerified:false 表示仍需核对实际对象。401 处理身份和过期，403 核对 consent / 对象权限，412 重读版本，429 遵循服务退避；不降低权限检查或盲目重发。

入口 node scripts/sharepoint-api.mjs --request request.json [--output new.json] [--apply]；COTREE_SHAREPOINT_ACCESS_TOKEN 为原始 OAuth token。固定全球 https://graph.microsoft.com/v1.0。

|动作|必需 ID|可选 query|
|---|---|---|
|profile|无|$select|
|site-search|无|search 必填, $select|
|site-get|siteId|$select|
|site-drives|siteId|$select|
|site-lists|siteId|$select, $expand|
|list-columns|siteId, listId|无|
|list-items|siteId, listId|$top, $expand, $filter|
|list-item|siteId, listId, itemId|$expand|
|item-create|siteId, listId|无|
|item-update|siteId, listId, itemId, etag|无|
|drive-root|driveId|$top, $select, $orderby|
|drive-children|driveId, itemId|$top, $select, $orderby|
|drive-item|driveId, itemId|$select|
|pages|siteId|$top, $select, $orderby, $filter|
|page|siteId, pageId|$select, $expand|

site-search 使用 search 关键词，不支持通配枚举；page 支持 $expand=canvasLayout。所有 ID 从实际响应取值。item-create 的 body 为 {"fields":{"Title":"已授权创建"}}，item-update 则为 {"Title":"已授权修改"} 并要求 etag；内部列名仅支持 1..128 个 ASCII 字母、数字和下划线且非数字开头，最多 100 列，复杂 lookup / person 值按实际列定义提供。拒绝任意 URL、未知参数与任意 HTTP 方法。

下载：node scripts/sharepoint-download.mjs --drive ID --item ID --download-host tenant.sharepoint.com --output new-file。download-host 必须是已观察的准确租户主机，不可由任意外部页面指示。Graph /content 最多接受一次跳转到该 HTTPS 主机；第二跳不转发 OAuth、cookies 或 Referer，拒绝后续跳转。最多 16 MiB，完整接收后独占创建文件，返回 SHA-256；不覆盖已有文件，不显示预认证 URL。JSON 元数据也移除 @microsoft.graph.downloadUrl。其他 CDN、大文件和主权云明确不支持本下载路径。

工作 / 学校 delegated scopes 按动作核实：profile 为 User.Read，站点搜索与页面读取 Sites.Read.All，列表写入 Sites.ReadWrite.All；下载等文件入口按 Files.Read / Files.Read.All 及对应对象权限核实，不默认申请全部权限。Sites.Selected application 权限不支持站点搜索；本包不提供 app-only 登录。登录、回调、刷新、撤销及管理员 consent 均待独立验收。

2026-10-07：[站点搜索](https://learn.microsoft.com/en-us/graph/api/site-search?view=graph-rest-1.0)、[读取页面](https://learn.microsoft.com/en-us/graph/api/sitepage-get?view=graph-rest-1.0)、[更新列表项](https://learn.microsoft.com/en-us/graph/api/listitem-update?view=graph-rest-1.0)、[下载文件](https://learn.microsoft.com/en-us/graph/api/driveitem-get-content?view=graph-rest-1.0)。
