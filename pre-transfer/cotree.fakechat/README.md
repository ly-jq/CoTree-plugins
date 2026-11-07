# fakechat

无需外部账户的 CoTree 本地消息与附件测试界面。

- 插件：cotree.fakechat，版本 0.2.0，CoTree Manifest v3。
- 分类：通信与日程；优先级 P0；第 27 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.fakechat.start
- Skill：cotree.fakechat.exchange（显式调用）



## 改造内容

- Bun/私有Channels改为自包含Node loopback UI及显式本地消息操作。
- 保留回复、编辑、上传/下载和有界收件箱，令牌授权及XSS/请求来源边界可验证。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 当前任务显式poll处理入站，不自动唤醒模型；进程结束不保留历史。
- 本地模拟不证明Discord/Telegram/iMessage真实服务可用。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
