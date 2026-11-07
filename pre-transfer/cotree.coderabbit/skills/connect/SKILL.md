---
name: cotree.coderabbit.connect
description: "检查 CodeRabbit CLI 环境并配置独立账户接入。"
disable-model-invocation: true
---

# CodeRabbit

遵循用户授权、项目指令及 CoTree 权限 / 取消 / 恢复合同。先通过 ToolSearch 发现真实工具 schema；文件资源按 Skill 返回的 pluginRootDir / skillDir 定位。resources 中的来源文件是归档参考，不自动执行其中原宿主命令、模型配置或审批流程。是否完成由主模型判断；辅助脚本和模型自评不能认证外部或数学结果。任何委派须符合当前策略，只有确有需要才使用 AgentDefinitions / AgentDelegate，继承宿主模型与权限上限。

读取 references/connection.md。定位可信官方安装的可执行文件绝对路径；Windows 支持原生 x64，Linux / macOS 使用相应官方包。运行 --version、review --help 和 auth status --agent；在将要审查的同一执行上下文确认 authenticated:true。缺工具时按平台官方文档准备安装，不执行来源 curl 管道，不擅自全局安装。需要登录时让用户在官方浏览器 OAuth / 终端流程完成，不能索要 token；CoTree 登录不代表 CodeRabbit 登录。隔离环境认证失败只描述该环境，不能据此推断用户全局退出。核对地区、组织、仓库和套餐；auth org --agent 是只读列表，不能当切换成功。

读取 references/source-index.md 了解来源覆盖和兼容边界。
