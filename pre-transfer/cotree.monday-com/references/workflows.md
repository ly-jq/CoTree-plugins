# 看板、代码与自动化

workspace / board / group / item / column 的 IDs 各有作用域。读取 columns 后构造值，不按 UI 文本或其他产品的 schema 拼参数。工具可能接受 JSON 对象或 JSON 字符串，按实际 schema 编码一次。同步已修改字段，保留未涉及的列与当前关联；读取当前状态不等于取得事务锁。

board automation 是看板触发 / 动作规则；workspace workflow 是独立对象。计划、空壳、草稿、发布、开启和实际执行分开验收。manage_workflows 等旧名不能当现行合同，先 tools/list；服务预览接口可能变化。运行记录、失败节点、执行身份与下游效果都有实际证据后再判断完成。

可复用代码 / code action：当前工具存在才使用，先查看已有代码与能力范围；不从保存推断允许执行。上传用当前服务的获取目标、上传、finalize / 关联流程；不要把任意 presigned URL 交给无关服务，不把链接获取算成功上传。

平台 Agent 的 knowledge / trigger / skill 修改属于远端权限或行为变化；仅给用户要求的数据范围。启用、运行、删除独立遵循授权。CoTree 不创建第二套循环或持久化权威来模拟 monday 平台。

最小账户验收：工具目录 → 当前用户 / workspace / board → schema / 分页 → 授权测试 item 与 update 的读回 → scope / 撤销 / 重连。自动化 / agent 预览能力另用受限测试对象验证。当前能力见 [官方工具目录](https://developer.monday.com/api-reference/docs/platform-mcp-tools) 和 [工具更新说明](https://developer.monday.com/api-reference/changelog/new-monday-platform-mcp-tools)。
