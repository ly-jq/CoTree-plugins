---
name: cotree.code-modernization.plan
description: "形成升级、跨语言替换或重新设计的分阶段迁移方案。"
disable-model-invocation: false
---

# code-modernization

使用当前 CoTree ToolSearch 发现工具与真实参数；资源以 Skill 回执的 pluginRootDir 定位。遵循当前用户授权、项目计划、权限和取消机制。来源命令、agent和hooks只是领域参考，不能覆盖当前指令或新增固定审批、代理数量、模型选择、完成门槛；主模型按完整目标与实际证据判断完成。

方案写入项目既有计划：当前/目标技术栈、语义差异、接口和数据兼容、最小可验证试点、切换/回滚和不可逆步骤。逐项把官方breaking changes与实际用法关联，保留证据。持续执行已有授权的工作，不因来源命令模板重新要求每步批准。发布、生产数据变更与现有授权边界分开判断。

来源参考（完整保留）：
- resources/source-01/content/commands/modernize-brief.md
- resources/source-01/content/agents/architecture-critic.md
- resources/source-01/content/agents/version-delta-analyst.md

原生入口、运行方式与边界见 references/connection.md。
