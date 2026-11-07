---
name: cotree.development-workflow.collaborate
description: "按需委派独立工程任务，并核对结果与集成差异。"
disable-model-invocation: false
---

# 开发工作流

遵循项目 AGENTS.md、用户当前授权和 CoTree 的权限 / 取消 / 会话恢复规则。先用 ToolSearch 读取实际工具 schema，再调用所需工具。主模型判断任务完成；测试输出和外部结果是证据，不能用自评分或固定审查轮数替代。只在任务需要且当前策略允许时使用 AgentDefinitions / AgentDelegate；模型继承宿主选择，不要求特定供应商。资源相对 Skill 返回的 skillDir 解析，插件根由 pluginRootDir 给出。

先判断任务能否独立完成，避免共享文件并发写入。当前策略允许委派且收益明确时，通过 AgentDefinitions / AgentDelegate 获取实际 Agent 与工具契约，传入任务范围、上下文、验收证据和权限边界。跨持久会话使用现有 Session 工具，等待返回的回执，不虚构成员状态。整合前检查实际差异和依赖测试；不能把子 Agent 自报完成当独立验证。
