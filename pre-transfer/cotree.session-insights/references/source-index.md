# 会话分析：CoTree 适配

来源 receipts / session-report 完整保留在 resources/source-01 和 source-02，包括原 miner、analyzer、HTML 和许可；只作方法参考，原 ~/.claude / Artifact / 原宿主指令不执行。

当前分析使用 CoTree runs / events 的 schema_version=2 原始 Run 回执；v3 owner-stream 投影不重复计数，v1 历史格式不解析。chat_sessions / chat_turns 可选。合同依据 packages/state/src/db/migrations/0001_initial.sql、0008_chat_sessions.sql、packages/state/src/db/repositories/event-repository.ts、packages/agent/src/agent-loop-model-response.ts 和 packages/context/src/memory/skill-invocation-tool.ts。只读 SQLite 事务可见 WAL 已提交记录；无迁移、无日志改写。要求真实 runs / events 列存在，缺列报错而非假成功。

模型用量只计 message.role=assistant 且无 kind 的 model_response，不计 stream / agent_message / credential 诊断。每事件一次；total 缺失且 input 与 output 同时存在时才推导。其他缺值保持 null 和 observedResponses；缓存 / reasoning 不重复相加。子 Run 自身计数；不会把子用量再加到父。工具结果和 Skill 调用次数无费用含义。当前状态不重建历史终态。

范围：一个明确选择的数据库、UTC 半开窗口、可选精确 workspace；event 上限 250000 / payload 64 MiB，超过失败并提示收窄。输出新目录含 report.json、report.html 和 receipt.md，不覆盖旧文件。HTML 安全序列化 JSON 并通过 textContent 显示数据；无远程资源。展示含项目路径 / 标识，但不包含对话正文、代码或工具输入。账单、收益、缓存中断和 prompt 成本没有可靠字段时不推断。
