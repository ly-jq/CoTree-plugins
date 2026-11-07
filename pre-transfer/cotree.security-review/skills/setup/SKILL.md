---
name: cotree.security-review.setup
description: "查看 安全审查 的依赖、完整度和待适配项目。"
disable-model-invocation: true
---

# 安全审查 配置与完整度

这不是原业务功能实现。读取插件根的 README.md / migration.json，确认任务依赖的组件已接入。

- 本包已按功能去重并统一身份；完整运行内容仍待逐包适配，不能把来源保留或清单有效当成功能完整。
- 通用审查资料已迁移；专有 Workflow / Agent 选择器和权限 Hook 未注册。
- Agent cotree.security-review.explore 保留模型引用 sonnet；需配置对应 CoTree 模型，不静默改变模型选择。
- Agent cotree.security-review.scan-inventory 保留模型引用 sonnet；需配置对应 CoTree 模型，不静默改变模型选择。
- Agent cotree.security-review.scan-loader 保留模型引用 sonnet；需配置对应 CoTree 模型，不静默改变模型选择。
- Agent cotree.security-review.scan-redactor 保留模型引用 sonnet；需配置对应 CoTree 模型，不静默改变模型选择。
- 依赖 Claude Agent SDK、Stop / SubagentStop 和 asyncRewake。
- Deep Scan 会启动 Codex app-server，不能作为 CoTree 原生扫描器运行。
