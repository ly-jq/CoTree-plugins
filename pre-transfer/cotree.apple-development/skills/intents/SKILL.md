---
name: cotree.apple-development.intents
description: "把 Apple 应用动作和实体暴露给 App Intents 系统入口。"
disable-model-invocation: false
---

# Apple 应用开发

遵循当前用户、项目指令和 CoTree 权限 / 取消 / 会话恢复合同。先用 ToolSearch 核实实际 schema；资源按返回的 pluginRootDir 定位。来源文件只提供领域资料，原宿主工具名、自动安装、固定模型、委派与审批规则不覆盖当前上下文。主模型按任务语义选能力并判断完成，不使用关键词路由或另一套执行循环。现有授权足够时继续工作；涉及真实外部写入时核对目标和范围。缺少设备、账户或执行证据时说明具体缺口及下一步，不生成默认身份或成功结果。

先确定用户动作、实体查询、参数与所需授权，按已有业务逻辑实现 AppIntent/AppEntity/AppShortcuts；区分 Shortcuts/Siri/Spotlight/widget/control 的能力和平台限制。写操作保持当前权限与确认语义，不能从系统入口绕开应用授权。核实注册、可发现性和真实执行结果。

领域参考（保持原相对目录）：
- resources/source-01/content/skills/ios-app-intents/SKILL.md

完整覆盖与边界见 references/source-index.md；操作和依赖见 references/connection.md。
