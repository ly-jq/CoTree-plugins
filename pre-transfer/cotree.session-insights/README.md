# 会话分析

从明确选择的 CoTree 本机账本生成用量分析与活动记录，保留证据覆盖率并避免重复计数。

- 插件：cotree.session-insights，版本 0.2.0，CoTree Manifest v3。
- 分类：开发与质量；优先级 P0；第 20 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.session-insights.report（显式调用）
- Skill：cotree.session-insights.receipt（显式调用）
- Skill：cotree.session-insights.investigate



## 改造内容

- 两份来源会话分析能力去重为三个原生工作流，替换 ~/.claude/projects 和来源 transcript 解析。
- 新增只读 SQLite 快照分析，聚合实际模型响应、项目、Run / 子 Run、Skill 和工具结果，缺失值保留 null 与诊断。
- 同一份聚合数据生成 JSON、Markdown 和可筛选 / 排序的离线 HTML；独占输出目录，不导出正文或推算账单。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 每次读取一个显式选择的 CoTree agent.db；其他工作区数据库、设备或已清理事件不包含。需 Node 22.13+ 支持 node:sqlite，当前 CoTree runs / events 表合同。
- 缺少来源 transcript 特有的缓存中断、prompt 归因和文件编辑统计时不伪造等价指标。当前工具成功、Run 终态或 token 数不证明业务交付；Git / PR 需按任务另核实。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
