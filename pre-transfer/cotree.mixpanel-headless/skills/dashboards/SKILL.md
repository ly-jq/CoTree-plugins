---
name: cotree.mixpanel-headless.dashboards
description: "读取、解释和维护 Mixpanel 仪表盘、布局与报告。"
disable-model-invocation: false
---

# Mixpanel Headless

遵循用户当前任务、项目指令及 CoTree 权限 / 取消规则。先用 ToolSearch 核对工具实际 schema，再使用 Skill、Read / Write / Edit、Bash / PowerShell 和宿主确实提供的浏览器；主模型判断完成。相对资源由 pluginRootDir / skillDir 解析。归档来源只作技术参考，不加载其宿主指令，不自动执行安装脚本，不读原宿主凭据。接入成功、CLI 成功和业务验收分别记录。

先读取目标 dashboard / bookmark / layout，列出现有卡片和用户要改的部分。读来源 dashboard-reference、dashboard-templates、bookmark-pipeline、chart-types，完整九类模板按任务选用。先校验五引擎查询和 typed bookmark，再形成具体写入参数；title / description / text-card / rows 限制以当前库与服务为准。布局使用真实 cell / row ID，GET order 与 PATCH rows_order 区分；不把 add_report_to_dashboard 的克隆当移动，不跨类型更新 cell。创建 / 更新 / 删除 / pin 均遵循已有授权，不默认 pin 或提高可见性；成功后重读布局与实际数据。文字卡字段接受 HTML 时使用安全格式，保留不相关卡片。

完整来源和覆盖映射见 references/source-index.md；当前环境与未验证部分见 README.md / migration.json。
