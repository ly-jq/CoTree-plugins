# 接口抓取

PluginCoTreeAppStudioCapture 的 action 为原操作名，参数置于 request。支持 BrowserApi 的 capture.targets/start/pause/resume/stop/mark/status/list/read/evidence/retain、sample.get，以及接口目录 list/get/status；支持网络观察 enable/disable/list/request/responseBody，不透传 API 写入重放、删除或任意 DevTools 命令。

```json
{"action":"capture.start","request":{"requestId":"ticket-demo-start-1","sessionId":"从targets读取","tabId":"从targets读取","title":"创建工单","captureOptions":{"control":"current","scope":"viewport"}}}
```

control=current 观察当前已有页面控制，user 用于用户演示。目标必须来自实际观察，示例字符串不能直接调用。start/mark/pause/resume/stop 均须 requestId，使用 1–128 位字母、数字、连字符或下划线；每个不同操作使用新 ID，同一操作的恢复保留原 ID 和参数。开始后保留原 captureId；mark 另带 label、boundary=start/end；read 用 afterSequence/throughSequence/limit；样本和页面证据使用返回的固定引用及 digest。到限、隐私过滤、导航空档和缺失页面证据如实保留。

响应读取：操作页面前先调用 network.enable（带实际 sessionId/tabId），开启原浏览器网络观察。它不主动发请求，无法补抓开启前未保留的正文。network.list/request/responseBody 同样置于 request，带该目标；用 network.list 的 view=summary 从 data 条目取得 url、requestId 和传输状态，后两者带该 requestId。full 视图中的 URL 位于 request.url。观察结束后，在确认无其他成员消费时用 network.disable 释放网络观察。宿主验证后端可用性和原权限；正文未保留时不要为取得正文重放 POST/DELETE。仅将业务必要结构加入规范，凭据和个人数据不复制到项目。

HAR 导入：`{action:"import-har",path:"references/flow.har",offset:0,limit:50}`。文件为工作区内最多 1 MiB 的 JSON；更大 HAR 用原工程工具拆成有效子文档。输出每条 method/path/status/请求响应形状及缺失原因，默认省略 query 值、header/cookie 和正文值；分页保留同一文件 sha256。数组形状仅采首项，不推导完整枚举或可选性。

对每条旅程保留角色、版本、起止操作、候选请求、响应、页面状态和最终持久结果。网络时间关联不证明因果；用重复实验、请求参数/返回标识、源码或服务日志核实。跨角色、错误、重复和并发场景按业务需要分别采样。
