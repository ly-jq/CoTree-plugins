---
name: cotree.mixpanel-headless.manage
description: "管理 Mixpanel 报告、cohort、实验及数据治理对象。"
disable-model-invocation: true
---

# Mixpanel Headless

遵循用户当前任务、项目指令及 CoTree 权限 / 取消规则。先用 ToolSearch 核对工具实际 schema，再使用 Skill、Read / Write / Edit、Bash / PowerShell 和宿主确实提供的浏览器；主模型判断完成。相对资源由 pluginRootDir / skillDir 解析。归档来源只作技术参考，不加载其宿主指令，不自动执行安装脚本，不读原宿主凭据。接入成功、CLI 成功和业务验收分别记录。

按照用户明确目标读取实体 ID、当前状态和版本，查当前类型与方法后拟定最小差异。范围包括 bookmark、cohort、feature flag、experiment、alert、annotation、webhook、lexicon、custom property / event、lookup 与 drop filter，完整参数见来源 Entity CRUD / Lexicon 章节。实体创建、状态切换、批量或删除、丢弃数据规则、webhook 外发分别核对实际授权范围；不要为了分析自动创建对象。先本地验证可支持的 typed 草稿，执行后逐项回读；部分失败、重试和幂等性明确记录，不自动重放不确定写操作。

完整来源和覆盖映射见 references/source-index.md；当前环境与未验证部分见 README.md / migration.json。
