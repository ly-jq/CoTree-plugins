---
name: cotree.development-workflow.review-feedback
description: "请求或处理代码审查意见，以证据决定修改。"
disable-model-invocation: false
---

# 开发工作流

遵循项目 AGENTS.md、用户当前授权和 CoTree 的权限 / 取消 / 会话恢复规则。先用 ToolSearch 读取实际工具 schema，再调用所需工具。主模型判断任务完成；测试输出和外部结果是证据，不能用自评分或固定审查轮数替代。只在任务需要且当前策略允许时使用 AgentDefinitions / AgentDelegate；模型继承宿主选择，不要求特定供应商。资源相对 Skill 返回的 skillDir 解析，插件根由 pluginRootDir 给出。

请求审查时提供目标、基线、变更范围和已执行检查；使用已有代码审查插件或当前模型，按风险选择必要的独立审查。收到意见后先读相关代码和调用方，验证触发条件，再决定修复或解释不采纳理由。将已证实问题、风格建议和待核实假设分开；不机械附和，也不为固定轮次无限返工。
