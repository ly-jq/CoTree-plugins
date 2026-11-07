---
name: cotree.development-workflow.verify
description: "交付前核实改动、检查结果和外部效果。"
disable-model-invocation: false
---

# 开发工作流

遵循项目 AGENTS.md、用户当前授权和 CoTree 的权限 / 取消 / 会话恢复规则。先用 ToolSearch 读取实际工具 schema，再调用所需工具。主模型判断任务完成；测试输出和外部结果是证据，不能用自评分或固定审查轮数替代。只在任务需要且当前策略允许时使用 AgentDefinitions / AgentDelegate；模型继承宿主选择，不要求特定供应商。资源相对 Skill 返回的 skillDir 解析，插件根由 pluginRootDir 给出。

对照用户目标和当前改动选择有意义的验证入口，检查实际退出码与输出。失败、跳过、缺环境和未执行各自报告；旧结果只有仍适用于当前代码时才能引用。UI、远程提交或业务写入读取对应实际状态，测试通过不自动证明外部效果。主模型据此给出完成判断和剩余事项，不增加强制评分器。
