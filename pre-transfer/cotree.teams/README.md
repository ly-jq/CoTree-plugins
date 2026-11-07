# Microsoft Teams

在 CoTree 中读取 Microsoft Teams 聊天与频道、整理决策和待办，发送已授权的纯文本消息并定位频道文件。

- 插件：cotree.teams，版本 0.2.0，CoTree Manifest v3。
- 分类：通信与日程；优先级 P0；第 15 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.teams.connect（显式调用）
- Skill：cotree.teams.discover
- Skill：cotree.teams.read
- Skill：cotree.teams.summarize
- Skill：cotree.teams.send（显式调用）
- Skill：cotree.teams.followup
- Skill：cotree.teams.files



## 改造内容

- 把原宿主连接器声明改为七个 CoTree 原生工作流与独立 Graph REST 脚本。
- 14 个固定动作，单页读取、明确写入意图、消息回查及频道文件定位；保留原图标与来源。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 原生入口、协议或 REST 适配已实现；独立账户授权、真实对象读写、过期恢复和业务结果仍待验收。
- 仅 Microsoft Graph 全球云、工作或学校账户的 delegated OAuth；没有自动登录 / 刷新。发送仅纯文本，HTML、mentions、附件、消息编辑 / 删除未实现。
- 会议音视频、录音和转录读取未实现；跟进基于用户提供笔记或已授权消息。频道文件内容可通过 SharePoint 插件或已有授权文件工具读取。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
