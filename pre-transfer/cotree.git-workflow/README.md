# Git 工作流

检查 Git 改动，按授权范围提交、推送、创建 PR，并预览失效分支清理。

- 插件：cotree.git-workflow，版本 0.2.0，CoTree Manifest v3。
- 分类：开发与质量；优先级 P0；第 1 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.git-workflow.commit（显式调用）
- Skill：cotree.git-workflow.pull-request（显式调用）
- Skill：cotree.git-workflow.cleanup（显式调用）



## 改造内容

- 三个命令改为原生显式 Skill；Git 上下文由跨平台 Node 只读脚本收集。
- 清理使用分支 / worktree 精确核查，不保留 grep | xargs 或强制删除默认行为。
- 2026-10-19：提交和 PR Skill 补齐依赖顺序、暂存范围、完整比较、失败/中断后核对与最终回执；使用当前公开 Agent 入口，仅在缺少工具契约时发现。仍保持显式调用，不自动安装或启用。
- 同日一致性修复：cleanup 同步公开 Agent 和按需发现规则，脚本入口统一使用 Skill 回执的 pluginRootDir；需要已补齐该回执字段的 CoTree 构建。路径不扩大文件或执行权限。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 真实推送和 PR 创建需要目标仓库远程与授权账户；本轮不会向用户远程仓库发布测试内容。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
