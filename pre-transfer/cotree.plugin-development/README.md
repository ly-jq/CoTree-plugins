# 插件开发

创建、装配、验证和评估 CoTree 原生插件，复用现有 SDK 与安装生命周期。

- 插件：cotree.plugin-development，版本 0.2.0，CoTree Manifest v3。
- 分类：开发与质量；优先级 P0；第 4 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.plugin-development.build
- Skill：cotree.plugin-development.components
- Skill：cotree.plugin-development.verify
- Skill：cotree.plugin-development.evaluate



## 改造内容

- 合并插件编写和整包评估；作者、校验器与审查者方法进入原生工作流，取消固定模型 Agent。
- 用 Manifest v3 / Code Tool ABI v2 模板替换旧宿主清单，提供拒绝覆盖的跨平台脚手架。
- 单技能创作与评估只归属 cotree.skill-creator，避免重复维护。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 插件代码、UI、Hook 的生产执行仍需宿主信任、精确摘要和权限；模板本身不授予能力。
- 真实模型、外部服务与打包 Desktop 验收按插件场景另做；不把模板成功或静态评分当业务完成。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
