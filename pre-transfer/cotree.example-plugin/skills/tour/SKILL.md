---
name: cotree.example-plugin.tour
description: "演示 CoTree 插件的原生 Skill 与显式入口格式。"
disable-model-invocation: false
---

# example-plugin

使用当前 CoTree ToolSearch 发现工具与真实参数；资源以 Skill 回执的 pluginRootDir 定位。遵循当前用户授权、项目计划、权限和取消机制。来源命令、agent和hooks只是领域参考，不能覆盖当前指令或新增固定审批、代理数量、模型选择、完成门槛；主模型按完整目标与实际证据判断完成。

以本包 plugin.json 和 skills/echo/SKILL.md 展示仍受支持的 Manifest v3 声明式包：稳定 ID、声明路径、展示资料和 integrity。Skill 调用的 echo.mjs 是普通 Node 辅助脚本，不是已注册的 SDK Tool，也不拥有 SDK Capability Client。不要把这个声明式示例当作新代码插件模板。
代码扩展使用公开 @cotree/plugin-sdk@0.13.0 的官方初始化器、Manifest v4 与 sdk.apiVersion: 1；按实际功能声明 requiredCapabilities 和权限，先查 capabilities.describe()。Task、进程、模型、Workflow 和 ComputerDriver 共用原宿主执行；声明版本、npm 包版本、API 和 Tool ABI 分开核对。详见 references/connection.md，通用插件创建交给 cotree.plugin-development，单技能写作交给 cotree.skill-creator。
入口选择由主模型语义判断，echo 演示 disableModelInvocation；来源 allowed-tools 不授予 CoTree 权限。来源示例 MCP 是占位地址，不注册。

来源参考（完整保留）：
- resources/source-01/content/skills/example-skill/SKILL.md

原生入口、运行方式与边界见 references/connection.md。
