---
name: cotree.mixpanel-headless.discover
description: "发现真实 Mixpanel 事件、属性、报告和 API 参数。"
disable-model-invocation: false
---

# Mixpanel Headless

遵循用户当前任务、项目指令及 CoTree 权限 / 取消规则。先用 ToolSearch 核对工具实际 schema，再使用 Skill、Read / Write / Edit、Bash / PowerShell 和宿主确实提供的浏览器；主模型判断完成。相对资源由 pluginRootDir / skillDir 解析。归档来源只作技术参考，不加载其宿主指令，不自动执行安装脚本，不读原宿主凭据。接入成功、CLI 成功和业务验收分别记录。

在已核对账户 / project / workspace 后，用 Workspace context manager 执行 events、top_events、properties、property_values、funnels、cohorts、list_bookmarks、lexicon_schemas。先少量 schema / 样本，不猜事件名，不把空结果视为零用户。mp help 或 python scripts/mixpanel-local.py describe --symbol Workspace.方法 查看固定版本真实参数；归档 help.py 可参考但不代替当前库。明确时间区间、时区、指标口径和数据完整度，限制高基数字段与大规模 profile 读取；敏感个体数据只在任务需要的范围取用。

完整来源和覆盖映射见 references/source-index.md；当前环境与未验证部分见 README.md / migration.json。
