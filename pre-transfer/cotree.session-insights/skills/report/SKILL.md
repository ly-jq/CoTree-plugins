---
name: cotree.session-insights.report
description: "生成 CoTree 本机用量与会话交互报告。"
disable-model-invocation: true
---

# 会话分析

遵循用户当前任务、项目指令及 CoTree 权限 / 取消规则。先用 ToolSearch 核对工具实际 schema，再使用 Skill、Read / Write / Edit、Bash / PowerShell 和宿主确实提供的浏览器；主模型判断完成。相对资源由 pluginRootDir / skillDir 解析。归档来源只作技术参考，不加载其宿主指令，不自动执行安装脚本，不读原宿主凭据。接入成功、CLI 成功和业务验收分别记录。

从 CoTree 当前宿主状态 / 配置确认实际 agent.db 路径，不假定总在项目 .cotree，也不扫描整个用户主目录或其他宿主日志。确定项目范围与用户时区，将起止换成明确 UTC ISO，末端不含；默认可选最近七天并说明。运行 node scripts/session-insights.mjs --database 路径 --since UTC起点 --until UTC终点 --output 新目录，可选 --workspace 精确存储路径。只读事务，不迁移数据库、不复制活动 DB 单文件来忽略 WAL；超限就收窄时间，不能输出静默截断数据。读取生成 report.json 的覆盖率 / diagnostics，再实际浏览 report.html；报告仅本地，没有网络 / CDN，路径和标识仍可能敏感。

完整来源和覆盖映射见 references/source-index.md；当前环境与未验证部分见 README.md / migration.json。
