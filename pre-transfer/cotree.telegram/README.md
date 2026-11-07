# telegram

复用 CoTree Telegram 网关，并补充 Bot 回复关联、编辑、反应和文件操作。

- 插件：cotree.telegram，版本 0.2.0，CoTree Manifest v3。
- 分类：通信与日程；优先级 P0；第 27 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.telegram.connect
- Skill：cotree.telegram.message（显式调用）
- Skill：cotree.telegram.files（显式调用）



## 改造内容

- 入站和基础发送归属既有消息Gateway，避免重复轮询和Session权威。
- 补齐独立Bot身份检查、关联回复、编辑、反应和有界附件传输。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 需要已安装的cotree.messaging-platform才能使用常驻入站；本包补充API客户端可独立使用。
- 真实Bot/目标权限、收发和撤销未验收；不继承原宿主远程权限回复。
- 入站和普通文本发送复用 cotree.messaging-platform 的 Telegram 适配器；本包补充关联回复、编辑、反应与文件传输，不启动第二个 getUpdates 消费者；不继承原 Channels 远程审批。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
