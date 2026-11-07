# ralph-loop

在 CoTree 当前任务中持续完成目标，复用计划、恢复与取消。

- 插件：cotree.ralph-loop，版本 0.2.0，CoTree Manifest v3。
- 分类：开发与质量；优先级 P0；第 26 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.ralph-loop.continue（显式调用）
- Skill：cotree.ralph-loop.status
- Skill：cotree.ralph-loop.cancel（显式调用）



## 改造内容

- 原Stop重入循环改为CoTree主模型持续工作与原生取消恢复。
- 保留来源教学，移除完成口令判定和第二份循环状态。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 工作持续性受宿主运行预算、可用工具和用户取消约束；无自动后台唤醒。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
