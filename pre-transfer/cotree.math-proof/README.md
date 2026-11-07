# 数学证明

分阶段研究数学命题，保存可恢复的证明资料、依赖与证据，清楚交付结论及开放缺口。

- 插件：cotree.math-proof，版本 0.2.0，CoTree Manifest v3。
- 分类：研究与专业工具；优先级 P0；第 22 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.math-proof.solo（显式调用）
- Skill：cotree.math-proof.research（显式调用）
- Skill：cotree.math-proof.resume（显式调用）
- Agent：cotree.math-proof.analyst
- Agent：cotree.math-proof.checker


## 改造内容

- solo / siege 改为 solo / research / resume，研究调度由 CoTree 主模型与既有会话系统承担。
- 深浅 worker 合并为可选数学 analyst，judge 改为可选只读 checker；移除固定轮次、模型与强制完成门控。
- Node 资料管理支持独占创建、精确题目匹配与带摘要证据检查，不将 ledger 或文件存在当作证明完成。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- claims.json 的 established / refuted 是作者断言，脚本只检查依赖和文件摘要，不能验证数学真伪。
- 未建立 Lean / Coq 等形式验证运行环境；如需形式证明必须独立运行项目实际 checker。
- 旧 siege 的固定并发轮次、Python 完成门控和原宿主环境配置不移植；保留其研究资料以供追溯。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
