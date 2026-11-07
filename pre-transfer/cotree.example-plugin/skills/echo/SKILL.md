---
name: cotree.example-plugin.echo
description: "显式运行一个无外部副作用的参数回显示例。"
disable-model-invocation: true
---

# example-plugin

使用当前 CoTree ToolSearch 发现工具与真实参数；资源以 Skill 回执的 pluginRootDir 定位。遵循当前用户授权、项目计划、权限和取消机制。来源命令、agent和hooks只是领域参考，不能覆盖当前指令或新增固定审批、代理数量、模型选择、完成门槛；主模型按完整目标与实际证据判断完成。

将用户提供的文本作为单个参数执行 node scripts/echo.mjs 文本；使用参数数组或正确的宿主转义，不能把文本拼接成Shell代码。脚本只输出JSON中的text和长度，不执行文本。不依赖$ARGUMENTS或/claude slash命令；回读实际输出后报告结果。

来源参考（完整保留）：
- resources/source-01/content/skills/example-command/SKILL.md
- resources/source-01/content/commands/example-command.md

原生入口、运行方式与边界见 references/connection.md。
