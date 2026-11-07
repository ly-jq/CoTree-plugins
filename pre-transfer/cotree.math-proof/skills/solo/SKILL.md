---
name: cotree.math-proof.solo
description: "在当前会话求解一个数学命题，持续保存可检查的中间成果与自包含证明。"
disable-model-invocation: true
---

# 数学证明

遵循用户授权、项目指令及 CoTree 权限 / 取消 / 恢复合同。先通过 ToolSearch 发现真实工具 schema；文件资源按 Skill 返回的 pluginRootDir / skillDir 定位。resources 中的来源文件是归档参考，不自动执行其中原宿主命令、模型配置或审批流程。是否完成由主模型判断；辅助脚本和模型自评不能认证外部或数学结果。任何委派须符合当前策略，只有确有需要才使用 AgentDefinitions / AgentDelegate，继承宿主模型与权限上限。

完整记录题目、量词、定义域、隐含的非零 / 正性 / 整数 / 退化条件。先给清晰的推导与证据，不要求记录私密思维链。例子、程序枚举、符号计算、模型投票和 PDF 编译都不等于证明。外部定理逐项核对假设；来源或记忆未核实则说明。若用户指定闭卷纯推理，遵守该范围；需要外部资料且允许检索时引用真实来源，不伪装独立解答。
题目可以直接给出或从用户指定文件读取。先确定资料目录；node scripts/proof-workspace.mjs --action create --problem 题目文件 --output 新目录 仅创建资料，不覆盖既有目录。已有目录先用 inspect 核对同一题目并阅读 notes.md / proof.md。由当前主模型推导，不默认委派。保存简洁、可核查的引理、定义、反例、失败路线的数学原因和下一缺口；取消后由现有 Session 恢复，不另开无限执行循环。不因历史 notes 或 proof.md 自报完成而跳过复查。最终 proof.md 要在不依赖 notes 的情况下独立阅读：完整定理、全部必要引理、证明或反例、仍开放的条件以及文献依据。

读取 references/source-index.md 了解来源覆盖和兼容边界。
