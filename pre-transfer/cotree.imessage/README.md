# imessage

在授权 Mac 上读取明确 iMessage 会话并通过 Messages 参数化发送。

- 插件：cotree.imessage，版本 0.2.0，CoTree Manifest v3。
- 分类：通信与日程；优先级 P0；第 27 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.imessage.connect
- Skill：cotree.imessage.history
- Skill：cotree.imessage.send（显式调用）



## 改造内容

- Bun/私有Channels改为Node只读SQLite和参数化AppleScript。
- 显式会话与数据库配置，保留消息/附件引用和单次发送，排除SMS身份绕过。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 真实macOS数据库、系统权限和发送需在Mac验收，Windows无实际AppleScript执行。
- 原推送改为按需有界读取，无远程审批或自动唤醒；AppleScript无送达回执。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
