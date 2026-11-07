---
name: cotree.git-workflow.cleanup
description: "预览并按明确授权清理远程已删除且本地已合并的分支。"
disable-model-invocation: true
---

# Git 工作流

遵循项目 AGENTS.md、用户当前授权和 CoTree 的权限 / 取消 / 会话恢复规则。已提供契约的工具直接使用，缺少契约时再用 ToolSearch；不猜测工具名或参数。主模型判断任务完成；测试输出和外部结果是证据，不能用自评分或固定审查轮数替代。只在任务需要且当前策略允许时使用 AgentDefinitions / Agent；模型继承宿主选择，不要求特定供应商。资源相对 Skill 返回的 skillDir 解析，插件根由 pluginRootDir 给出。已有相应授权时直接推进，无需重复询问。

先通过 Bash 或 PowerShell 执行 node <pluginRootDir>/scripts/inspect.mjs --workspace <实际项目路径>（按当前 Shell 语法引用路径），读取 branches、worktrees、当前分支和用户指定基线。必要时在授权范围内 git fetch --prune 后重新读取。仅把 upstream [gone]、已合并到确认基线、不被任何 worktree 占用、不是当前分支的分支列为候选。
先提供精确候选与保留原因；明确清理请求涵盖的候选可使用 git branch -d -- <branch> 逐个处理。拒绝删除未合并分支时保留并报告，不自动升级为 -D。不移除 worktree，不执行目录递归删除，不用管道拼接分支名到 Shell。
重新读取状态，分别报告已删除与仍保留项。
