# Twilio Developer Kit

开发 Twilio 消息、语音、Verify、SendGrid 和会话集成，验证回调与实际通信状态。

- 插件：cotree.twilio-developer-kit，版本 0.2.0，CoTree Manifest v3。
- 分类：通信与日程；优先级 P0；第 23 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.twilio-developer-kit.connect（显式调用）
- Skill：cotree.twilio-developer-kit.design
- Skill：cotree.twilio-developer-kit.messaging（显式调用）
- Skill：cotree.twilio-developer-kit.voice（显式调用）
- Skill：cotree.twilio-developer-kit.verify（显式调用）
- Skill：cotree.twilio-developer-kit.email（显式调用）
- Skill：cotree.twilio-developer-kit.webhooks
- Skill：cotree.twilio-developer-kit.conversations
- Skill：cotree.twilio-developer-kit.contact-center
- Skill：cotree.twilio-developer-kit.intelligence
- Skill：cotree.twilio-developer-kit.compliance（显式调用）
- Skill：cotree.twilio-developer-kit.debug



## 改造内容

- 55个Skills按12项完整业务能力合并，移除重复默认发送入口。
- 使用CoTree工具与授权合同，保留SDK、错误码、产品/法规参考和品牌。
- 新增固定官方SDK的跨平台Webhook工程，验签后仅返回空TwiML，不触发通信。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 账户、sender注册、真实发送/拨号、Verify与SendGrid投递未验收。
- Webhook样例仅form协议，无生产TLS、业务队列、持久幂等或JSON/SendGrid处理；按生成README与领域资料补齐目标应用。
- 来源法律、价格、地区与产品支持资料是历史参考，不代表当前合规或商业保证。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
