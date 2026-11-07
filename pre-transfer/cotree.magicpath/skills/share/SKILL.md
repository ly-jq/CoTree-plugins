---
name: cotree.magicpath.share
description: "获取 MagicPath 链接并在 CoTree 的实际浏览器查看。"
disable-model-invocation: false
---

# MagicPath

遵循用户当前任务、项目指令及 CoTree 权限 / 取消规则。先用 ToolSearch 核对工具实际 schema，再使用 Skill、Read / Write / Edit、Bash / PowerShell 和宿主确实提供的浏览器；主模型判断完成。相对资源由 pluginRootDir / skillDir 解析。归档来源只作技术参考，不加载其宿主指令，不自动执行安装脚本，不读原宿主凭据。接入成功、CLI 成功和业务验收分别记录。

固定 2.6.1 的 share generatedName 或 projectId 只构造 URL，不修改共享权限、不确认目标存在或可访问。先核对目标并返回 URL；用户要打开时才使用宿主实际浏览器，保持 canvas 工作时停留在对应项目页。不要使用来源 view 通过 OS shell 开浏览器。遇到登录跳转由用户在浏览器独立登录，再回到原 URL；无可用浏览器就说明没有视觉验收。quiet 的查询和后台 build 轮询不擅自导航页面。

完整来源和覆盖映射见 references/source-index.md；当前环境与未验证部分见 README.md / migration.json。
