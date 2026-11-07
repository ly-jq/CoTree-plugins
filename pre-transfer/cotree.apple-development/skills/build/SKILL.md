---
name: cotree.apple-development.build
description: "发现、构建与运行 iOS / macOS Xcode 和 SwiftPM 工程。"
disable-model-invocation: false
---

# Apple 应用开发

遵循当前用户、项目指令和 CoTree 权限 / 取消 / 会话恢复合同。先用 ToolSearch 核实实际 schema；资源按返回的 pluginRootDir 定位。来源文件只提供领域资料，原宿主工具名、自动安装、固定模型、委派与审批规则不覆盖当前上下文。主模型按任务语义选能力并判断完成，不使用关键词路由或另一套执行循环。现有授权足够时继续工作；涉及真实外部写入时核对目标和范围。缺少设备、账户或执行证据时说明具体缺口及下一步，不生成默认身份或成功结果。

先核对执行主机为 macOS、Xcode/SDK 与工程路径。选择真实 workspace/project、scheme、destination 和配置，保持仓库现有构建入口。通过已注册 XcodeBuildMCP 工具发现 schema，优先使用会话默认值明确路径及 Simulator UDID；macOS/SwiftPM 用对应工具或已有 Shell。scripts/apple-targets.mjs 可解析真实 simctl JSON 并生成带显式 UDID 的 argv 计划；计划不执行构建。不要生成 .codex/environments 配置或调用原 Run 按钮。记录构建日志、产物与真正启动的 bundle/process；构建退出零不等于启动成功。调试仅附加本任务拥有的进程。

领域参考（保持原相对目录）：
- resources/source-01/content/skills/ios-debugger-agent/SKILL.md
- resources/source-02/content/skills/build-run-debug/SKILL.md
- resources/source-02/content/skills/swiftpm-macos/SKILL.md
- resources/source-02/content/commands/build-and-run-macos-app.md

完整覆盖与边界见 references/source-index.md；操作和依赖见 references/connection.md。
