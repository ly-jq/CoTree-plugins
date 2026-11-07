---
name: cotree.code-modernization.migrate
description: "实施渐进升级、逐模块重写或架构重建。"
disable-model-invocation: true
---

# code-modernization

使用当前 CoTree ToolSearch 发现工具与真实参数；资源以 Skill 回执的 pluginRootDir 定位。遵循当前用户授权、项目计划、权限和取消机制。来源命令、agent和hooks只是领域参考，不能覆盖当前指令或新增固定审批、代理数量、模型选择、完成门槛；主模型按完整目标与实际证据判断完成。

依据已确定方案选小范围试点，保持无关改动和可恢复基线。升级关注编译器/依赖/运行时语义；重写关注协议、排序、数值、时区和错误行为；重新设计先固定接口与最小纵向功能。使用现有仓库构建与测试，不运行原workflow JS或Claude编排hook。每个有价值的增量验证后继续剩余范围，失败按原因修复；不以固定循环次数或完成口令认定成功。

来源参考（完整保留）：
- resources/source-01/content/commands/modernize-uplift.md
- resources/source-01/content/commands/modernize-transform.md
- resources/source-01/content/commands/modernize-reimagine.md
- resources/source-01/content/agents/uplift-migrator.md
- resources/source-01/content/agents/scaffolder.md

原生入口、运行方式与边界见 references/connection.md。
