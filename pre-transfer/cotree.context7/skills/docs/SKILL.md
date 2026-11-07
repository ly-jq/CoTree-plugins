---
name: cotree.context7.docs
description: "查询库或框架当前版本文档，核实 API 和使用示例。"
disable-model-invocation: false
---

# Context7

遵循项目 AGENTS.md、用户当前授权和 CoTree 的权限 / 取消 / 会话恢复规则。先用 ToolSearch 读取实际工具 schema，再调用所需工具。主模型判断任务完成；测试输出和外部结果是证据，不能用自评分或固定审查轮数替代。只在任务需要且当前策略允许时使用 AgentDefinitions / AgentDelegate；模型继承宿主选择，不要求特定供应商。资源相对 Skill 返回的 skillDir 解析，插件根由 pluginRootDir 给出。

从项目 manifest / lockfile 确定库和版本；通过 ToolSearch 发现 cotree.context7.context7 的 resolve-library-id 与 query-docs，读取实际 schema。
除非用户已给出 Context7 library ID，否则先解析库名，检查候选描述、版本和来源，再查询准确问题。不要把密钥、用户数据或私有源码作为 query；使用最小的通用技术描述。
保留文档链接和对应版本，区分文档结论、自己的推断及在项目中实测结果。发生 401 / 403 / 429、断网或无匹配库时报告具体限制；有其他授权文档工具时可继续查询，并说明来源。不要把空结果当成功。
