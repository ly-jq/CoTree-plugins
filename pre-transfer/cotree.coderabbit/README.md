# CodeRabbit

通过独立 CodeRabbit CLI 审查指定代码变更，识别未完成结果并核实、修复实际问题。

- 插件：cotree.coderabbit，版本 0.2.0，CoTree Manifest v3。
- 分类：开发与质量；优先级 P0；第 22 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.coderabbit.connect（显式调用）
- Skill：cotree.coderabbit.review
- Skill：cotree.coderabbit.fix（显式调用）



## 改造内容

- 原入口拆为连接、外部审查与修复三个 CoTree Skill，区别本地代码审查能力。
- 跟进当前 Windows 原生 CLI 与结构化终态合同；新增有界、只读 NDJSON 解析工具。
- 保留来源图标、许可及全部资源；凭据由官方 CLI 管理，不迁移原宿主账户。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 远程审查会向 CodeRabbit 服务提交所选差异，需要对应授权、账户与套餐；本包不自动执行上传。
- CLI 帮助 / 隔离未登录检查和协议夹具不证明真实账户、远程审查质量或付费权限。
- 只支持已核对的 review NDJSON 合同；新增事件或终态字段值需要重新核实，不据此给出零问题结论。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
