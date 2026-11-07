---
name: cotree.mixpanel-headless.connect
description: "连接独立 Mixpanel 账户并核对项目、区域和工作区。"
disable-model-invocation: true
---

# Mixpanel Headless

遵循用户当前任务、项目指令及 CoTree 权限 / 取消规则。先用 ToolSearch 核对工具实际 schema，再使用 Skill、Read / Write / Edit、Bash / PowerShell 和宿主确实提供的浏览器；主模型判断完成。相对资源由 pluginRootDir / skillDir 解析。归档来源只作技术参考，不加载其宿主指令，不自动执行安装脚本，不读原宿主凭据。接入成功、CLI 成功和业务验收分别记录。

先读当前 mp login / session / account / project / workspace / target help。用户在官方 CLI 完成 PKCE 登录，显式选择 us / eu / in；或通过宿主环境注入 MP_USERNAME、MP_SECRET、MP_PROJECT_ID、MP_REGION，静态 Bearer 使用 MP_OAUTH_TOKEN + project / region。仅选一种有效身份，环境优先级可能覆盖命名账户；先 mp session 与只读 me / projects 回读真实目标，不把默认项目当用户指定项目。mp login 可能持久化 token 到独立 ~/.mp；不得展示 account token、export-bridge 输出、配置原文或把密钥放 argv / 对话。来源 auth_manager 的 JSON state 即使 exit 0 也可能是 needs_account / needs_project；不能据退出码报登录完成。需要自动刷新、切换 target、撤销或过期恢复时按当前账户类型核验。

完整来源和覆盖映射见 references/source-index.md；当前环境与未验证部分见 README.md / migration.json。
