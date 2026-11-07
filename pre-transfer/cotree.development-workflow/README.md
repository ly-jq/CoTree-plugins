# 开发工作流

按项目上下文完成设计、实现、调试、验证与交付，按需使用 CoTree 原生协作。

- 插件：cotree.development-workflow，版本 0.2.1，CoTree Manifest v3。
- 分类：开发与质量；优先级 P0；第 2 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.development-workflow.develop
- Skill：cotree.development-workflow.design
- Skill：cotree.development-workflow.plan
- Skill：cotree.development-workflow.collaborate
- Skill：cotree.development-workflow.test-first
- Skill：cotree.development-workflow.worktree（显式调用）
- Skill：cotree.development-workflow.review-feedback
- Skill：cotree.development-workflow.verify
- Skill：cotree.development-workflow.finish（显式调用）
- Skill：cotree.development-workflow.debug



## 改造内容

- 合并功能开发与 Superpowers 的方法，形成一个原生执行入口和按需参考。
- 替换强制 Session Hook、独立 runner、固定确认关卡和固定审查轮数；沿用主模型与现有会话权威。
- 0.2.1 将重复的 author-skill 入口归并至 cotree.skill-creator.create / evaluate，开发工作流保留十个技能。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 可视化脑暴服务器和上游专属会话钩子不移植；使用当前宿主的展示能力。
- 真实工程效果仍需在用户任务中按项目执行验证。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
