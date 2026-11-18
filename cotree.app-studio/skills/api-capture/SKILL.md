---
name: api-capture
description: 录制用户或 Agent 的网页操作，关联请求、响应及页面状态，导入 HAR 并提炼业务接口。保留原浏览器目标、录制版本、分页与证据缺口。
---

使用 PluginCoTreeAppStudioCapture；具体输入见 [接口抓取](../../references/api-capture.md)。先 capture.targets 选择已观察到的 sessionId/tabId，沿现有控制权开始录制。用户演示使用 user；Agent 自己的交互使用 current，不抢占页面。

对一个业务动作记录前置状态、角色和测试数据；用 capture.mark 标记边界，执行原授权操作后读取增量请求及页面证据。保留 captureId、sequence、sampleRef、digest、throughSequence 和 next cursor，不把被截断的片段称为全部记录。

需要响应结构时，先 network.list/request 取得当前请求身份，再 network.responseBody；具体后端不支持、未完成或正文已释放时记录原因。录制请求 ID 与网络请求 ID 不保证同命名空间；先以原始元数据核对，无法证实时不要猜测 ID。HAR 可经 import-har 提取结构，默认省略值与凭据。

把动作→候选请求→响应→持久结果关联交给业务成员。观察到一次成功样例不能推导全部错误、权限、事务或幂等规则。API 捕获是研究，不自动重放写请求；确需调用时使用原 BrowserApi 的审批与 operationId/receipt，响应丢失先核对原结果。

停止本人开始的录制并检查结算；不停止他人的录制。材料共享只包含必要的结构、脱敏样本和固定引用，密码/cookie/token 不进入规则文件。
