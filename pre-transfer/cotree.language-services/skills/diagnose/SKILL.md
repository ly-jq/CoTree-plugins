---
name: cotree.language-services.diagnose
description: "解释语言服务器诊断，区分版本匹配、索引未完成和工具链故障。"
disable-model-invocation: false
---

# 语言服务

通过 ToolSearch 读取实际 CoTree 工具 schema，遵循当前用户授权和项目约定。资源相对 Skill 回执的 pluginRootDir；不引入独立模型循环、关键词路由或另一份持久化权威。
检查 LSP status、项目依赖与保存状态，再对目标文件查询 diagnostics。只把版本匹配或当前请求覆盖的诊断作为该文件证据；空但 unversioned / pending 的结果不代表无错误。检查 startup、配置、依赖导入与超时，避免无边界重启。
服务只声明部分动作时使用可用能力，不能伪造支持。文件诊断不替代构建或测试；交付实际范围、服务器与未完成事项。
