---
name: cotree.development-workflow.test-first
description: "为新增行为或缺陷修复建立有意义的回归测试。"
disable-model-invocation: false
---

# 开发工作流

遵循项目 AGENTS.md、用户当前授权和 CoTree 的权限 / 取消 / 会话恢复规则。先用 ToolSearch 读取实际工具 schema，再调用所需工具。主模型判断任务完成；测试输出和外部结果是证据，不能用自评分或固定审查轮数替代。只在任务需要且当前策略允许时使用 AgentDefinitions / AgentDelegate；模型继承宿主选择，不要求特定供应商。资源相对 Skill 返回的 skillDir 解析，插件根由 pluginRootDir 给出。

先定义可观察行为和关键边界，使用项目已有测试入口。新增失败用例应因待修复行为失败，不能因环境损坏或错误断言失败。做最小实现，再通过测试，最后按需要重构。已有覆盖足够或改动不改变行为时不为流程制造测试。记录执行命令、输出及未覆盖的真实集成边界。
