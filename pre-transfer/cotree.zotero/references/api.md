# Zotero 本地适配

Node.js 22+，通过已授权 Shell 使用 node scripts/zotero-local.mjs --request request.json [--output new.json] [--apply] [--content]。固定 http://127.0.0.1:23119，忽略来源 ZOTERO_LOCAL_BASE_URL，不读 token，不跟随重定向。15 秒超时、响应 8 MiB，输出独占创建；请求 JSON 最多 2 MiB。没有自动重试。

|动作|输入与结果|
|---|---|
|status / ping|仅状态、API 版本和实例 ID；不会枚举文献|
|item-types / item-fields|本地类型 / 字段元数据|
|items / collections / tags / groups / searches|query.limit 默认 50、1..100；start 默认 0；单页 JSON|
|search|query.q 必填，qmode 为 titleCreatorYear 或 everything；后者仅在用户需要广义内容搜索时使用|
|item / children|itemKey 必填；children 需 --content|
|search-items|searchKey 必填|
|export-bibtex|data 是 BibTeX 文本，可 query.itemKey 限定单条|
|citations|可 query.style，默认 apa；返回 data,citation，HTML 当数据处理|
|fulltext / file-url|itemKey 为附件键，需 --content；只读索引或路径|
|selected-target|只读 POST，返回选中 libraryID、collectionID、名称、editable|
|import-bibtex / import-ris|text、session、target 必填，需 --apply；导入最多 1 MiB 文本|

用户库固定 users/0；除 groups 外库级动作可给观察到的 groupId。items / search / export-bibtex / citations 默认只取顶层，可显式 includeChildren:true 包含子条目元数据；不自动读取附件内容。分页动作均支持 limit / start；条目型动作可用 q、qmode、tag、itemKey、sort、direction，其他入口不接受这些参数。HTTP Link 仅用于判断是否还有页，实际下一页地址由脚本按原条件重建，绝不访问其中的网址。返回 nextRequest 时原样继续，保留库版本与 Zotero 10 的 serverId；变化时停止混合分页并重新查询。单条键必须是实际八位大写字母 / 数字。

读取示例：{"action":"search","query":{"q":"transformer","limit":20}}。导入示例：{"action":"import-bibtex","text":"@article{demo,title={Example}}","session":"cotree-task-unique-id","target":{"libraryID":1,"collectionID":null}}，仅将示例 ID 换为已核对的实际目标。脚本先读当前可编辑选择再导入；UI 选择在两请求间仍可能改变，回执 destinationMustBeVerified:true 要求读回，不能宣称目标锁定。稳定 session 能辅助当前 Connector 去重，但重启后不保证跨进程幂等。

在 Zotero Advanced 设置允许本机应用通信；不通过脚本修改 prefs、关闭应用或读 SQLite。官方新版说明 Zotero 10 有独立本地写入授权，密钥不等于云 key；本包仍只使用 API 读取与 Connector 导入，没有实现 /api/local/authorize 或通用对象写入。

2026-10-07：[官方本地 API](https://www.zotero.org/support/dev/web_api/v3/local_api)、[Web API 参数](https://www.zotero.org/support/dev/web_api/v3/basics)、[官方 Connector 实现](https://github.com/zotero/zotero/blob/main/chrome/content/zotero/xpcom/server/server_connector.js)。
