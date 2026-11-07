---
name: cotree.mixpanel-headless.analyze
description: "执行 Mixpanel 趋势、漏斗、留存、路径与用户分析。"
disable-model-invocation: false
---

# Mixpanel Headless

遵循用户当前任务、项目指令及 CoTree 权限 / 取消规则。先用 ToolSearch 核对工具实际 schema，再使用 Skill、Read / Write / Edit、Bash / PowerShell 和宿主确实提供的浏览器；主模型判断完成。相对资源由 pluginRootDir / skillDir 解析。归档来源只作技术参考，不加载其宿主指令，不自动执行安装脚本，不读原宿主凭据。接入成功、CLI 成功和业务验收分别记录。

按照问题由主模型选择 query / query_funnel / query_retention / query_flow / query_user 五引擎，先查真实签名和类型。完整来源 mixpanelyst 含每种模式、单位、窗口、cohort / custom property / frequency、time comparison、legacy query、统计及绘图方法。核对 total / unique / per_user、分母、漏斗顺序与排除、留存 born / return / bucket 三者、flow 窗口 / cardinality、用户 profile 与 aggregate 模式。必要时先 build_* 参数并检查，再查询；Workspace 初始化仍可能解析账户，不能称为离线。result.df 与 params 随结果保存，参数敏感性与样本量说明，不用固定 15% 阈值宣告因果或显著性。绘图标单位 / 缺值 / 来源；大数据用受限流式导出，网络失败不能当零值。

完整来源和覆盖映射见 references/source-index.md；当前环境与未验证部分见 README.md / migration.json。
