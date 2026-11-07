---
name: cotree.code-modernization.rules
description: "抽取业务规则及边界并关联真实源码与测试。"
disable-model-invocation: false
---

# code-modernization

使用当前 CoTree ToolSearch 发现工具与真实参数；资源以 Skill 回执的 pluginRootDir 定位。遵循当前用户授权、项目计划、权限和取消机制。来源命令、agent和hooks只是领域参考，不能覆盖当前指令或新增固定审批、代理数量、模型选择、完成门槛；主模型按完整目标与实际证据判断完成。

按业务模块整理规则ID、Given/When/Then、输入输出、异常、状态和外部依赖，附文件行号及版本。区分设计意图、实际行为和缺陷；不确定的规则写明缺少的路径或运行证据。用真实案例检查规则而非强制启动50–200代理。已有用户决策保留原文与来源，不能将模型确认充当业务批准。

来源参考（完整保留）：
- resources/source-01/content/commands/modernize-extract-rules.md
- resources/source-01/content/commands/modernize-review.md
- resources/source-01/content/agents/business-rules-extractor.md

原生入口、运行方式与边界见 references/connection.md。
