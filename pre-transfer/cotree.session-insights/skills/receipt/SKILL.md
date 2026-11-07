---
name: cotree.session-insights.receipt
description: "把 CoTree 会话统计整理为有证据的工作记录。"
disable-model-invocation: true
---

# 会话分析

遵循用户当前任务、项目指令及 CoTree 权限 / 取消规则。先用 ToolSearch 核对工具实际 schema，再使用 Skill、Read / Write / Edit、Bash / PowerShell 和宿主确实提供的浏览器；主模型判断完成。相对资源由 pluginRootDir / skillDir 解析。归档来源只作技术参考，不加载其宿主指令，不自动执行安装脚本，不读原宿主凭据。接入成功、CLI 成功和业务验收分别记录。

基于 report 的同一份 JSON 和 receipt.md 写用户需要的活动记录：时间、数据库范围、已识别 session / Run、子 Run、模型响应、项目和 token 覆盖率。具体产出先按用户任务读取文件、Git SHA、PR 回执 / CI，分别说明已观察与未核实；仓库共享历史按 commit SHA 去重，文件重叠不能证明作者归因。工具调用次数不当成功业务数量，Run 状态不当目标完成。不推算节省小时、金额或活动成本占比。保留缺值，告知 HTML / JSON 含项目路径和标识；用户没有要求分享就交付本地文件。

完整来源和覆盖映射见 references/source-index.md；当前环境与未验证部分见 README.md / migration.json。
