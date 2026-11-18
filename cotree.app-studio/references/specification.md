# 产品与接口规格

默认工程中 app-studio.json 保存产品配置，docs/product/brief.md 保存目标与决定；spec.json 保存规则、旅程和引用。这些是工程资产，原 Session/Task 记录仍是运行状态权威。

规则示例结构（值均为示例，按真实业务填写）：

```json
{"ruleId":"ticket-reopen","basis":"proposed","decision":"adopt","actors":["customer"],"precondition":"工单属于本人且已解决","action":"重新打开","result":"状态回到待处理并留下审计记录","rejection":"其他租户或错误状态不能修改","evidenceRefs":[],"operationIds":["reopenTicket"]}
```

basis 为 source_supported/observed/inferred/proposed；来源支持和观察需要引用，推断需说明理由/缺口。journeys 含 journeyId、ruleIds、角色、前置数据、步骤及可观察结果。测试结果另存真实运行证据，不在规格里写虚构通过。

契约保留唯一来源。空工程提供 OpenAPI JSON 以便无依赖结构检查；已有 YAML/代码 Schema 工程不必迁移，使用其完整验证器。Contract 工具检查本地 $ref、重复 operationId、响应定义、规则→接口→旅程关联，不是完整 OpenAPI 标准验证或业务认证。

优先固定本切片的身份、数据范围、状态转换、错误语义及数据约束。客户端、Mock 和服务器校验从同源生成；变更附版本与受影响消费者，根配置/锁文件/迁移单一作者。
