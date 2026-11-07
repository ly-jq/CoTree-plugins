---
name: cotree.magicpath.integrate
description: "将 MagicPath 组件接入实际应用，或翻译成目标框架。"
disable-model-invocation: false
---

# MagicPath

遵循用户当前任务、项目指令及 CoTree 权限 / 取消规则。先用 ToolSearch 核对工具实际 schema，再使用 Skill、Read / Write / Edit、Bash / PowerShell 和宿主确实提供的浏览器；主模型判断完成。相对资源由 pluginRootDir / skillDir 解析。归档来源只作技术参考，不加载其宿主指令，不自动执行安装脚本，不读原宿主凭据。接入成功、CLI 成功和业务验收分别记录。

先读目标工程、框架、主题和既有组件，再 inspect generatedName 获取源文件 / 依赖 / import 信息。React / TS 通过官方 add --dry-run 检查文件清单和冲突；已有任务授权足够时 add --yes，注意会写文件并安装依赖，默认不用 --overwrite。核对 CLI 返回真实路径和 importStatement，不猜文件名。非 JS 项目用 inspect 作为视觉与交互参考，再按目标语言实现。接上真实状态、表单、loading / empty / error、键盘及响应式，运行工程检查和浏览器验证；取得源文件不等于已经集成。

完整来源和覆盖映射见 references/source-index.md；当前环境与未验证部分见 README.md / migration.json。
