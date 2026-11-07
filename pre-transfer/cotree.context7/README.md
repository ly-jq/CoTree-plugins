# Context7

通过 Context7 MCP 查询版本对应的库文档和代码示例。

- 插件：cotree.context7，版本 0.2.0，CoTree Manifest v3。
- 分类：开发与质量；优先级 P0；第 2 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.context7.docs

- MCP：cotree.context7.context7

## 改造内容

- 加入原生查库、取文档、引用出处和失败处理流程；服务器与凭据命名不带来源宿主。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 默认使用匿名连接，受服务认证策略与限流影响；账户授权路径需单独配置和验证。不传项目源码或秘密到查询服务。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
