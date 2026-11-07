# Playwright

用独立 Playwright 测试浏览器执行页面观察、交互和端到端检查。

- 插件：cotree.playwright，版本 0.2.0，CoTree Manifest v3。
- 分类：开发与质量；优先级 P0；第 2 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.playwright.test

- MCP：cotree.playwright.playwright

## 改造内容

- 固定 MCP 版本，默认 headless / isolated，避免复用个人浏览器登录状态。
- 加入基于真实页面引用的原生测试流程和清理要求。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 需要 Node.js / npm、可用 Chromium 及网络安装依赖；首次启动可能下载包。
- 与 CoTree 原生浏览器能力有交集，按测试任务选择一个控制面，不混用页面引用。
- cotree.browser-use 提供宿主浏览器；此插件限独立测试浏览器和可复现 E2E，不重复接管个人浏览器。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
