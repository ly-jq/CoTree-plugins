---
name: cotree.development-workflow.design
description: "梳理需求与设计取舍，形成可实现的工程方案。"
disable-model-invocation: false
---

# 开发工作流

遵循项目 AGENTS.md、用户当前授权和 CoTree 的权限 / 取消 / 会话恢复规则。先用 ToolSearch 读取实际工具 schema，再调用所需工具。主模型判断任务完成；测试输出和外部结果是证据，不能用自评分或固定审查轮数替代。只在任务需要且当前策略允许时使用 AgentDefinitions / AgentDelegate；模型继承宿主选择，不要求特定供应商。资源相对 Skill 返回的 skillDir 解析，插件根由 pluginRootDir 给出。

读取项目事实与约束，确定用户、主要行为、输入输出和失败边界。信息不足会改变方案时提出少量关键问题，其余明确假设。比较有实际区别的方案，给出符合当前架构的选择、文件范围与验证方法。已有授权足够时继续实现，不增加固定批准关卡。
