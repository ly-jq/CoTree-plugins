---
name: cotree.apple-development.memory
description: "收集和解释 Apple leaks / memgraph 的内存证据。"
disable-model-invocation: false
---

# Apple 应用开发

遵循当前用户、项目指令和 CoTree 权限 / 取消 / 会话恢复合同。先用 ToolSearch 核实实际 schema；资源按返回的 pluginRootDir 定位。来源文件只提供领域资料，原宿主工具名、自动安装、固定模型、委派与审批规则不覆盖当前上下文。主模型按任务语义选能力并判断完成，不使用关键词路由或另一套执行循环。现有授权足够时继续工作；涉及真实外部写入时核对目标和范围。缺少设备、账户或执行证据时说明具体缺口及下一步，不生成默认身份或成功结果。

选定本任务进程或 Simulator，复现固定生命周期后收集 memgraph/leaks，使用归档 summarize_memgraph_leaks.py 解析真实文件。区分驻留增长、缓存、retain cycle 与泄漏；保存 before/after 条件、计数和引用路径。捕获权限或工具失败明确报告，不能把空输出当零泄漏。

领域参考（保持原相对目录）：
- resources/source-01/content/skills/ios-memgraph-leaks/SKILL.md

完整覆盖与边界见 references/source-index.md；操作和依赖见 references/connection.md。
