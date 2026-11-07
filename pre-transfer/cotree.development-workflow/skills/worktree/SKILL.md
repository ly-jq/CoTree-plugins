---
name: cotree.development-workflow.worktree
description: "为需要文件隔离的工程任务准备 Git worktree。"
disable-model-invocation: true
---

# 开发工作流

遵循项目 AGENTS.md、用户当前授权和 CoTree 的权限 / 取消 / 会话恢复规则。先用 ToolSearch 读取实际工具 schema，再调用所需工具。主模型判断任务完成；测试输出和外部结果是证据，不能用自评分或固定审查轮数替代。只在任务需要且当前策略允许时使用 AgentDefinitions / AgentDelegate；模型继承宿主选择，不要求特定供应商。资源相对 Skill 返回的 skillDir 解析，插件根由 pluginRootDir 给出。

读取当前分支、工作区改动和现有 worktree，优先复用适合本任务的位置。使用用户指定基线或确认的仓库惯例，不猜分支。创建后记录绝对工作目录并从该目录执行；worktree 不是 OS 沙箱，权限仍由宿主管理。清理前核对 worktree 的任务归属、未提交改动和未推送提交；不能强制删除其他任务的工作。
