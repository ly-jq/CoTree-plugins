---
name: cotree.development-workflow.plan
description: "编写或分批执行多步工程计划。"
disable-model-invocation: false
---

# 开发工作流

遵循项目 AGENTS.md、用户当前授权和 CoTree 的权限 / 取消 / 会话恢复规则。先用 ToolSearch 读取实际工具 schema，再调用所需工具。主模型判断任务完成；测试输出和外部结果是证据，不能用自评分或固定审查轮数替代。只在任务需要且当前策略允许时使用 AgentDefinitions / AgentDelegate；模型继承宿主选择，不要求特定供应商。资源相对 Skill 返回的 skillDir 解析，插件根由 pluginRootDir 给出。

沿用项目的计划和任务系统；把目标拆为有交付物、依赖、文件范围和实际验证的小任务。已有计划先对照当前代码校准。按依赖执行，每完成几个可用单元报告变化和证据，更新剩余项；新发现需要调整时记录原因。不要创建第二套持久化任务权威。
