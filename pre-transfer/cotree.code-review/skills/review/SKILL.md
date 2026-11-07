---
name: cotree.code-review.review
description: "审查当前改动或指定 PR，核对缺陷、测试、异常、类型和注释。"
disable-model-invocation: false
---

# 代码审查

遵循项目 AGENTS.md、用户当前授权和 CoTree 的权限 / 取消 / 会话恢复规则。先用 ToolSearch 读取实际工具 schema，再调用所需工具。主模型判断任务完成；测试输出和外部结果是证据，不能用自评分或固定审查轮数替代。只在任务需要且当前策略允许时使用 AgentDefinitions / AgentDelegate；模型继承宿主选择，不要求特定供应商。资源相对 Skill 返回的 skillDir 解析，插件根由 pluginRootDir 给出。

确认审查范围：当前未提交改动、相对指定基线的分支，或明确 PR。先读取 GitStatus / GitDiff 和 AGENTS.md；指定基线时使用真实 merge-base，记录评审的 commit。无改动就报告这一事实，不跳到其他分支。PR 的草稿状态、既往审查或自动生成标签只是上下文，不能替代用户的明确审查要求。

读取变更、关键调用方、测试和必要历史，按 correctness、tests、errors、types、documentation 检查。小改动直接完成；有互相独立且值得委派的范围时，可从 AgentDefinitions 选本插件对应审查者并使用 AgentDelegate。它们只读；不要求固定人数、固定模型或强制重复审核。

对每个候选问题给出触发条件、影响、文件位置和支持证据。核对是否由本次改动引入；已有问题单独说明。用相关的真实测试或小复现验证关键判断。去掉纯猜测、无关格式偏好和重复问题，不采用自信分数认证。

输出按严重程度排列的具体问题，包含定位、为什么有影响、复现或测试结果，以及未核实内容。没有发现时直接说明审查范围和验证限制。默认只在当前会话交付；仅当用户已明确要求时使用授权工具发布 PR 评论或修改代码。

各维度的细节见 references/dimensions.md。
