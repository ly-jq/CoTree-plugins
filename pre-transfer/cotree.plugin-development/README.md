# 插件开发

创建、装配、验证和评估 CoTree 原生插件，复用现有 SDK 与安装生命周期。

- 插件：cotree.plugin-development，版本 0.3.1，CoTree Manifest v3。
- 分类：开发与质量；优先级 P0；第 4 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.plugin-development.build
- Skill：cotree.plugin-development.components
- Skill：cotree.plugin-development.verify
- Skill：cotree.plugin-development.evaluate



## 改造内容

- 合并插件编写和整包评估；作者、校验器与审查者方法进入原生工作流，取消固定模型 Agent。
- 代码脚手架委托 SDK 0.14.0 官方初始化器，覆盖七种 Manifest v4 / API 1 模板；声明式 Skill 保留 v3。
- 单技能创作与评估只归属 cotree.skill-creator，避免重复维护。
- 补齐 Task、进程、交互、Session/Workflow、模型流、账号与 ComputerDriver 的公开能力、作用域和升级验证。缺 SDK 不下载、不回退，不维护第二套模板。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 插件代码、UI、Hook 的生产执行仍需宿主信任、精确摘要和权限；模板本身不授予能力。
- 真实模型、外部服务与打包 Desktop 验收按插件场景另做；不把模板成功或静态评分当业务完成。
- 代码脚手架需要公开 SDK 0.14.0 的已安装包；本地 tarball 与 npm 发布状态分别核对。包本身只贡献 Skill，不获得模板声明的运行权限。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
