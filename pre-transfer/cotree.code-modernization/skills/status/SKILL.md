---
name: cotree.code-modernization.status
description: "恢复迁移计划并标记过期证据和剩余工作。"
disable-model-invocation: false
---

# code-modernization

使用当前 CoTree ToolSearch 发现工具与真实参数；资源以 Skill 回执的 pluginRootDir 定位。遵循当前用户授权、项目计划、权限和取消机制。来源命令、agent和hooks只是领域参考，不能覆盖当前指令或新增固定审批、代理数量、模型选择、完成门槛；主模型按完整目标与实际证据判断完成。

读取项目计划、差异和真实产物，核对证据对应的源码提交/文件SHA、环境和执行时间。指出已完成部分、阻塞和可继续步骤；变更后陈旧测试不能沿用为当前通过。恢复使用当前Session与项目计划，原宿主面板改由本地HTML报告和项目文件展示，不写第二套任务状态数据库。

来源参考（完整保留）：
- resources/source-01/content/commands/modernize-status.md

原生入口、运行方式与边界见 references/connection.md。
