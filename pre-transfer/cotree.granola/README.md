# Granola

在 CoTree 中搜索和读取 Granola 会议笔记，汇总决策与待办，并为提案、产品需求和会前准备提取有来源的上下文。

- 插件：cotree.granola，版本 0.2.0，CoTree Manifest v3。
- 分类：团队协作与知识；优先级 P0；第 16 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.granola.connect（显式调用）
- Skill：cotree.granola.search
- Skill：cotree.granola.read
- Skill：cotree.granola.summarize
- Skill：cotree.granola.brief
- Skill：cotree.granola.followup

- MCP：cotree.granola.granola

## 改造内容

- 保留唯一官方 MCP 与原图标，补齐六个 CoTree 工作流。
- 更新活动 workspace、共享笔记及套餐约束，独立身份不依赖原宿主连接器。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 原生工作流与协议适配已实现；真实账户或本地 Desktop 文献库、模型任务效果及跨平台运行仍待验收。
- 标准 MCP 接入需要逐用户 OAuth；本包不实现自动登录、刷新或企业 EMA。MCP 不使用普通 API key / 服务账户。
- 可访问笔记、时间窗口、文件夹和转录由账户、工作区与工具目录决定；本包不实现笔记录制、编辑或外部通知。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
