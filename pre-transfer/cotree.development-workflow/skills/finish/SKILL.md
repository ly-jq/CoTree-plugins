---
name: cotree.development-workflow.finish
description: "核对开发分支状态，并按已有授权交付或集成。"
disable-model-invocation: true
---

# 开发工作流

遵循项目 AGENTS.md、用户当前授权和 CoTree 的权限 / 取消 / 会话恢复规则。先用 ToolSearch 读取实际工具 schema，再调用所需工具。主模型判断任务完成；测试输出和外部结果是证据，不能用自评分或固定审查轮数替代。只在任务需要且当前策略允许时使用 AgentDefinitions / AgentDelegate；模型继承宿主选择，不要求特定供应商。资源相对 Skill 返回的 skillDir 解析，插件根由 pluginRootDir 给出。

读取目标差异、当前分支、工作区、测试结果和远程状态。用户要文件交付就保留可检查改动；已要求提交或 PR 时调用现有 Git 工作流并回读结果。合并、改写历史或删除 worktree 仅在对应授权范围内做；未合并改动、未推送提交和别人的文件都要保留。交付真实 commit / PR、验证范围和未解决项。
