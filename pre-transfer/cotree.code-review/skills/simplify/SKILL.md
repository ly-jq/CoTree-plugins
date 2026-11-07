---
name: cotree.code-review.simplify
description: "在明确请求下简化指定代码，同时保持接口和可观察行为。"
disable-model-invocation: true
---

# 代码审查

遵循项目 AGENTS.md、用户当前授权和 CoTree 的权限 / 取消 / 会话恢复规则。先用 ToolSearch 读取实际工具 schema，再调用所需工具。主模型判断任务完成；测试输出和外部结果是证据，不能用自评分或固定审查轮数替代。只在任务需要且当前策略允许时使用 AgentDefinitions / AgentDelegate；模型继承宿主选择，不要求特定供应商。资源相对 Skill 返回的 skillDir 解析，插件根由 pluginRootDir 给出。

先读取用户指定范围、调用方和现有测试，记录 API、错误和边界行为。优先消除重复分支、无意义包装和混乱命名；不用新抽象扩大改动。
通过 Edit / Write 做小步修改；保留不属于本次任务的工作。运行能比较改动前后行为的相关测试。无法确认等价的改写先保留原实现，解释未解决点。
交付具体变化、实际验证与剩余风险。不要把简化请求解释为提交、推送或修改全部工程。
