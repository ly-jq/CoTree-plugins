---
name: cotree.session-insights.investigate
description: "核查 CoTree 高用量会话、缓存记录与证据缺口。"
disable-model-invocation: false
---

# 会话分析

遵循用户当前任务、项目指令及 CoTree 权限 / 取消规则。先用 ToolSearch 核对工具实际 schema，再使用 Skill、Read / Write / Edit、Bash / PowerShell 和宿主确实提供的浏览器；主模型判断完成。相对资源由 pluginRootDir / skillDir 解析。归档来源只作技术参考，不加载其宿主指令，不自动执行安装脚本，不读原宿主凭据。接入成功、CLI 成功和业务验收分别记录。

按 byRun / byProject 的实测 token 和覆盖率定位相关响应，父子 Run 通过真实 parentRunId 查看，每个 Run 仅计自身事件，不再向父重复累计；Skill / 工具只记录次数，不分摊 token。缓存读取是输入子集，reasoning 是输出相关子项，不重新加入总量；只有同条响应同时报告 input / cacheRead 时才计算覆盖样本的缓存率。诊断条目附 eventId / runId；缺 identity、无效字段或历史日志不可读均明确指出。需要具体 prompt、编辑区间或 Git 证据时只读取用户指定 Run / 仓库并最小化内容，不能从汇总反推因果。按真实证据给建议，不套用来源固定 85% / 2% 等阈值自动宣判浪费。

完整来源和覆盖映射见 references/source-index.md；当前环境与未验证部分见 README.md / migration.json。
