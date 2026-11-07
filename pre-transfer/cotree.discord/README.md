# discord

在明确频道范围内读取 Discord 消息并使用独立 Bot 回复、编辑与处理附件。

- 插件：cotree.discord，版本 0.2.0，CoTree Manifest v3。
- 分类：通信与日程；优先级 P0；第 27 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.discord.connect
- Skill：cotree.discord.history
- Skill：cotree.discord.message（显式调用）
- Skill：cotree.discord.files（显式调用）



## 改造内容

- 移除私有Claude Channels/Bun依赖，提供独立跨平台官方Bot API入口。
- 保留完整访问控制资料、消息操作与附件能力，输入范围和外发权限明确。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 账号、频道、反应权限、配额和真实收发尚待账户验收。
- 原宿主推送改为当前Session显式历史读取；不自动唤醒模型或接受远程审批。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
