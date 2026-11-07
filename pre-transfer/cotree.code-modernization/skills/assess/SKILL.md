---
name: cotree.code-modernization.assess
description: "盘点遗留系统、依赖、边界和迁移可行性。"
disable-model-invocation: false
---

# code-modernization

使用当前 CoTree ToolSearch 发现工具与真实参数；资源以 Skill 回执的 pluginRootDir 定位。遵循当前用户授权、项目计划、权限和取消机制。来源命令、agent和hooks只是领域参考，不能覆盖当前指令或新增固定审批、代理数量、模型选择、完成门槛；主模型按完整目标与实际证据判断完成。

先读取既有目标与计划，确认源系统、当前版本、目标版本和必须保持的行为。只读盘点入口、模块、依赖、数据流、部署、已有测试及运行缺口；按证据区分已观察与推断。建立可点击源码位置和简洁拓扑，比较升级、逐模块替换、重新设计与继续维护；不把文件数推断成工期。待迁移源可以在原路径只读检查，不强制克隆到legacy目录。版本支持情况查官方当期说明。

来源参考（完整保留）：
- resources/source-01/content/commands/modernize.md
- resources/source-01/content/commands/modernize-preflight.md
- resources/source-01/content/commands/modernize-assess.md
- resources/source-01/content/commands/modernize-map.md
- resources/source-01/content/agents/legacy-analyst.md

原生入口、运行方式与边界见 references/connection.md。
