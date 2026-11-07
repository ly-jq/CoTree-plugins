---
name: cotree.mixpanel-headless.setup
description: "准备独立 Mixpanel Python 环境并核对实际 API。"
disable-model-invocation: true
---

# Mixpanel Headless

遵循用户当前任务、项目指令及 CoTree 权限 / 取消规则。先用 ToolSearch 核对工具实际 schema，再使用 Skill、Read / Write / Edit、Bash / PowerShell 和宿主确实提供的浏览器；主模型判断完成。相对资源由 pluginRootDir / skillDir 解析。归档来源只作技术参考，不加载其宿主指令，不自动执行安装脚本，不读原宿主凭据。接入成功、CLI 成功和业务验收分别记录。

使用 Python 3.10+ 在用户选定工具目录建立 venv，安装 mixpanel-headless==0.4.0；Windows 用 Scripts/python.exe，POSIX 用 bin/python。通过该环境的 mp --version / --help 与 python scripts/mixpanel-local.py diagnose 核对。需要统计 / 绘图时再装 scipy / matplotlib / seaborn，不改全局解释器，不修改插件包。describe --symbol Workspace.query 可读实际签名；validate --symbol CreateDashboardParams --input 草稿.json 只检查类型，不能证明远端可用。

完整来源和覆盖映射见 references/source-index.md；当前环境与未验证部分见 README.md / migration.json。
