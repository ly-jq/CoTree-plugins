# project-artifact

从项目真实证据生成和刷新可携带的 HTML 状态页，保留来源、时效与版本备份。

- 插件：cotree.project-artifact，版本 0.2.0，CoTree Manifest v3。
- 分类：设计与内容；优先级 P0；第 28 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.project-artifact.create
- Skill：cotree.project-artifact.refresh
- Skill：cotree.project-artifact.publish（显式调用）



## 改造内容

- 原宿主Artifact工具替换为独立HTML生成、刷新、备份与浏览器交付。
- 来源引用、时效、软件PR/CI/审查证据和可选领域页完整保留，复用已有部署能力。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 原私有Artifact托管URL/权限无法继承；在线部署和仓库账户需独立验收。
- 页面是派生状态快照，不能据此自动更新任务完成或冒充外部验收。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
