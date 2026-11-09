---
name: cotree.plugin-development.components
description: "为 CoTree 插件接入 Agent、Skill、MCP、Hook、配置或 UI 组件。"
disable-model-invocation: false
---

# 插件开发

通过 ToolSearch 读取实际 CoTree 工具 schema，遵循当前用户授权和项目约定。资源相对 Skill 回执的 pluginRootDir；不引入独立模型循环、关键词路由或另一份持久化权威。
按 references/contracts.md 选择对应字段与当前 SDK；只声明实现过的 capability。Agent 继承宿主模型和实际工具白名单，Skill 在根 manifest 注册。复杂单技能制作使用已安装的 cotree.skill-creator；缺少时说明专门入口不可用，不复制第二套实现。
MCP 的 stdio 设置明确 command / args / cwdBase，HTTP 认证使用 headersEnv 等实际合同，不复制原宿主登录状态。Hook 的事件和载荷按 CoTree 类型逐项映射，不存在的事件不模拟。用户设置与秘密由现有宿主配置和凭据能力管理，不在包中持久化账户。
代码只从公开 @cotree/plugin-sdk 的根、ui、service、provider 入口导入；Manifest v4 声明 API 1、requiredCapabilities 和独立权限。Task/进程/模型/Workflow 走原所有者，Service 生命周期和 Provider 回调不借用过期 Run 权限。用 capabilities.describe() 发现当前支持，不把 SDK 类型存在当作可执行。
UI 使用 Code View 和 createPluginViewClient；mountPluginPanel 可复用任务、日志、产物、配置呈现。页面通过声明命令进入授权工具，不直接获得模型、电脑控制或会话权限。资源路径留在包内，离线打包完整依赖。每新增边界验证成功、无权限、取消和禁用后的实际效果。
