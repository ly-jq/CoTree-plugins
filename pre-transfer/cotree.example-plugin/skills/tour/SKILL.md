---
name: cotree.example-plugin.tour
description: "演示 CoTree 插件的原生 Skill 与显式入口格式。"
disable-model-invocation: false
---

# example-plugin

使用当前 CoTree ToolSearch 发现工具与真实参数；资源以 Skill 回执的 pluginRootDir 定位。遵循当前用户授权、项目计划、权限和取消机制。来源命令、agent和hooks只是领域参考，不能覆盖当前指令或新增固定审批、代理数量、模型选择、完成门槛；主模型按完整目标与实际证据判断完成。

以本包plugin.json和skills/echo/SKILL.md为可安装的Manifest v3示例，展示稳定ID、声明路径、权限、展示资料和integrity。入口选择由主模型语义判断，explicit演示disableModelInvocation；来源allowed-tools不授予CoTree权限。通用插件创建和单技能写作分别使用cotree.plugin-development与cotree.skill-creator，避免重复作者能力。来源示例MCP是占位地址，不注册。

来源参考（完整保留）：
- resources/source-01/content/skills/example-skill/SKILL.md

原生入口、运行方式与边界见 references/connection.md。
