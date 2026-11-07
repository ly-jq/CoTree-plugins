---
name: cotree.ralph-loop.cancel
description: "响应用户取消持续工作并保存交接。"
disable-model-invocation: true
---

# ralph-loop

使用当前 CoTree ToolSearch 发现工具与真实参数；资源以 Skill 回执的 pluginRootDir 定位。遵循当前用户授权、项目计划、权限和取消机制。来源命令、agent和hooks只是领域参考，不能覆盖当前指令或新增固定审批、代理数量、模型选择、完成门槛；主模型按完整目标与实际证据判断完成。

只在用户取消时停止开启新工作，使用当前宿主可用的取消能力处理自己启动的任务。不要终止无关进程或删除任务文件。记录已完成修改、仍运行/已取消的操作、未完成项及恢复入口；Skill不保证能终止服务端已提交作业。原.claude/ralph-loop.local.md仅历史来源，本插件没有独立循环状态可删。

来源参考（完整保留）：
- resources/source-01/content/commands/cancel-ralph.md

原生入口、运行方式与边界见 references/connection.md。
