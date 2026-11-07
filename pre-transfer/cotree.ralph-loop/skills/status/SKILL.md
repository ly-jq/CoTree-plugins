---
name: cotree.ralph-loop.status
description: "从当前任务的计划和结果恢复持续工作进度。"
disable-model-invocation: false
---

# ralph-loop

使用当前 CoTree ToolSearch 发现工具与真实参数；资源以 Skill 回执的 pluginRootDir 定位。遵循当前用户授权、项目计划、权限和取消机制。来源命令、agent和hooks只是领域参考，不能覆盖当前指令或新增固定审批、代理数量、模型选择、完成门槛；主模型按完整目标与实际证据判断完成。

读当前Session和计划，核对最后一次修改、已执行验证和外部依赖。保留已接受的纠正和用户目标；无须重复开始原始prompt。进程结束、已勾选计划项或旧完成报告都不能替代当前产物。确定当前可以做的下一步并继续。

来源参考（完整保留）：
- resources/source-01/content/README.md

原生入口、运行方式与边界见 references/connection.md。
