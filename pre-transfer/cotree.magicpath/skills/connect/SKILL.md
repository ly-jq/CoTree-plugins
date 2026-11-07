---
name: cotree.magicpath.connect
description: "准备独立 MagicPath CLI 和账户连接。"
disable-model-invocation: true
---

# MagicPath

遵循用户当前任务、项目指令及 CoTree 权限 / 取消规则。先用 ToolSearch 核对工具实际 schema，再使用 Skill、Read / Write / Edit、Bash / PowerShell 和宿主确实提供的浏览器；主模型判断完成。相对资源由 pluginRootDir / skillDir 解析。归档来源只作技术参考，不加载其宿主指令，不自动执行安装脚本，不读原宿主凭据。接入成功、CLI 成功和业务验收分别记录。

在专用工具目录的 package.json 声明 magicpath-ai 2.6.1 并安装，以本地 dist/cli.js 执行；不使用自动升级 npx，也不执行 setup-skills / clone 去改来源宿主。先 --version / --help，再用 scripts/magicpath-local.mjs --tooling 工具目录 --workspace 项目 --action info --execute 检查。独立 MAGICPATH_TOKEN 由宿主环境注入，或用户使用官方 CLI login 完成浏览器认证；不得复制其他宿主 token 或通过 --code 在会话中传秘密。info.auth.authenticated 只表示发现身份，whoami / 目标只读仍需成功。CLI 的 token 与浏览器登录互不等价；团队强制模式 MAGICPATH_TEAM_ID 另核对。

完整来源和覆盖映射见 references/source-index.md；当前环境与未验证部分见 README.md / migration.json。
