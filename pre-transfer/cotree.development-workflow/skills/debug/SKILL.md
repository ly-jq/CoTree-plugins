---
name: cotree.development-workflow.debug
description: "系统定位失败、复现缺陷并验证最小修复。"
disable-model-invocation: false
---

# 开发工作流

遵循项目 AGENTS.md、用户当前授权和 CoTree 的权限 / 取消 / 会话恢复规则。先用 ToolSearch 读取实际工具 schema，再调用所需工具。主模型判断任务完成；测试输出和外部结果是证据，不能用自评分或固定审查轮数替代。只在任务需要且当前策略允许时使用 AgentDefinitions / AgentDelegate；模型继承宿主选择，不要求特定供应商。资源相对 Skill 返回的 skillDir 解析，插件根由 pluginRootDir 给出。

先记录预期行为、实际行为、触发条件和可重复步骤。收集相关日志、栈、配置和最近变更，不先批量改代码。
比较正常与失败路径，提出可被实验否定的具体假设，一次只改变必要因素。确认根因后添加能捕捉回归的测试或复现，做最小修复并验证原路径与边界。
连续尝试没有证据进展时重新检查假设和架构，而非无限追加补丁。交付根因、修复、真实命令与结果及未覆盖环境。
