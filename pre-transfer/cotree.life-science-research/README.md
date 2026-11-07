# 生命科学研究

跨公共数据库研究基因、变异、表达、结构、化合物、试验和多组学证据。

- 插件：cotree.life-science-research，版本 0.2.0，CoTree Manifest v3。
- 分类：研究与专业工具；优先级 P0；第 24 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.life-science-research.research
- Skill：cotree.life-science-research.identifiers
- Skill：cotree.life-science-research.targets
- Skill：cotree.life-science-research.variants
- Skill：cotree.life-science-research.cohorts
- Skill：cotree.life-science-research.expression
- Skill：cotree.life-science-research.proteins
- Skill：cotree.life-science-research.pathways
- Skill：cotree.life-science-research.chemistry
- Skill：cotree.life-science-research.clinical
- Skill：cotree.life-science-research.literature
- Skill：cotree.life-science-research.datasets



## 改造内容

- 50个领域Skill归并为12个原生入口，移除默认强制路由与原宿主委派配置。
- 保留全部数据库客户端和领域参考，新增四种固定官方端点的有界公共元数据读取器。
- 证据保留实体、来源与观察时间；公开聚合数据、受控资源和科学结果分别核实。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 公共读取器只覆盖四种单条元数据；其余客户端及全部数据库未逐项在线验收，按connection和原文档检查接口 / Python依赖。
- 受控数据、可选NCBI key、BLAST序列提交和大文件下载另行验证；检索不证明临床或生物学结论。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
