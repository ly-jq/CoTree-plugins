# 代码审查

统一审查代码、测试、错误处理、类型与文档，并在明确要求时进行保持行为的简化。

- 插件：cotree.code-review，版本 0.2.0，CoTree Manifest v3。
- 分类：开发与质量；优先级 P0；第 1 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.code-review.review
- Skill：cotree.code-review.simplify（显式调用）
- Agent：cotree.code-review.correctness
- Agent：cotree.code-review.tests
- Agent：cotree.code-review.errors
- Agent：cotree.code-review.types
- Agent：cotree.code-review.documentation
- Agent：cotree.code-review.simplifier


## 改造内容

- 三个重叠来源统一为 review / simplify 两个入口，审查维度各保留一份。
- 移除固定供应商模型、强制多 Agent、数值自评分和自动发布 PR 评论；以真实证据反馈。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 加载与权限测试不证明模型一定能发现所有缺陷；实际审查结果取决于目标代码和执行证据。
- 远程 PR 读取需要已授权的 GitHub MCP 或 gh；发布评论必须在用户授权范围内。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
