---
name: cotree.math-proof.resume
description: "核对题目与证据后继续已有数学证明资料。"
disable-model-invocation: true
---

# 数学证明

遵循用户授权、项目指令及 CoTree 权限 / 取消 / 恢复合同。先通过 ToolSearch 发现真实工具 schema；文件资源按 Skill 返回的 pluginRootDir / skillDir 定位。resources 中的来源文件是归档参考，不自动执行其中原宿主命令、模型配置或审批流程。是否完成由主模型判断；辅助脚本和模型自评不能认证外部或数学结果。任何委派须符合当前策略，只有确有需要才使用 AgentDefinitions / AgentDelegate，继承宿主模型与权限上限。

通过当前 CoTree Session / 任务记录恢复执行上下文；proof 文件夹只是可读研究资料。用 node scripts/proof-workspace.mjs --action inspect --output 资料目录 --problem 题目文件 验证题目字节一致；仅换行变化也会提示差异，由主模型明确核实，不能静默替换原题。读取 notes、proof 和 claims 后调用 --action audit；脚本检查缺失证据、摘要变化、缺失 / 未建立的依赖与循环，但不自行标记证明成立。审查实际数学内容、先前假设与剩余目标后接着做，不能以 state.md 的 finished 或某个文件存在推断用户目标完成。旧来源目录可逐份阅读导入资料，保留旧文件；不运行原 ledger.py 门控和旧会话 flags。

读取 references/source-index.md 了解来源覆盖和兼容边界。
