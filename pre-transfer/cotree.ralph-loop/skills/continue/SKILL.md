---
name: cotree.ralph-loop.continue
description: "在当前 CoTree 任务中持续完成目标并保留可恢复进展。"
disable-model-invocation: true
---

# ralph-loop

使用当前 CoTree ToolSearch 发现工具与真实参数；资源以 Skill 回执的 pluginRootDir 定位。遵循当前用户授权、项目计划、权限和取消机制。来源命令、agent和hooks只是领域参考，不能覆盖当前指令或新增固定审批、代理数量、模型选择、完成门槛；主模型按完整目标与实际证据判断完成。

将用户目标、约束、已授权范围和真实剩余项写入项目计划，或用TaskIntentUpdate.planMarkdown记录完整计划。复用当前Session继续实现、检查和修复；不启动Bash Stop Hook、后台重复提示或第二个模型循环。检查失败后根据真实原因决定下一步，不固定返工轮次、不用completion-promise字符串决定完成。用户取消、预算/平台上限或缺少必要外部输入时遵循宿主状态并留下可恢复交接；不能自创定时唤醒。完成由主模型基于实际结果判断，TaskIntentUpdate只是可选记录。

来源参考（完整保留）：
- resources/source-01/content/commands/ralph-loop.md
- resources/source-01/content/commands/help.md

原生入口、运行方式与边界见 references/connection.md。
