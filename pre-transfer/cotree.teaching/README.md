# 教学与解释

按需解释工程决策、组织有意义的代码练习并反馈学习结果。

- 插件：cotree.teaching，版本 0.2.0，CoTree Manifest v3。
- 分类：研究与专业工具；优先级 P0；第 21 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.teaching.explain（显式调用）
- Skill：cotree.teaching.practice（显式调用）
- Skill：cotree.teaching.feedback（显式调用）



## 改造内容

- 解释与学习两份来源合并为三个显式 Skill，不作为全局 output style 或 Hook。
- 保留代码上下文、取舍与用户实践，取消固定 Insight 格式和每次编辑的冗余讲解。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 无需外部账户。原生加载 / 分派测试不证明实际教学效果、用户掌握程度或模型评价准确性。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
