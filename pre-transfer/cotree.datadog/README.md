# Datadog

通过 Datadog 官方 MCP 查询日志、指标与 APM，排查事件并维护授权范围内的监控和仪表盘。

- 插件：cotree.datadog，版本 0.2.0，CoTree Manifest v3。
- 分类：代码托管与部署；优先级 P0；第 14 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.datadog.connect（显式调用）
- Skill：cotree.datadog.logs
- Skill：cotree.datadog.metrics
- Skill：cotree.datadog.apm
- Skill：cotree.datadog.monitors（显式调用）
- Skill：cotree.datadog.dashboards（显式调用）
- Skill：cotree.datadog.incident

- MCP：cotree.datadog.datadog

## 改造内容

- 官方服务与图标保留，增加七个原生可观测性工作流。
- 补齐 US1 两种 header 身份的离线配置；站点、时区、采样、分页与读写结果独立记录。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 已完成 CoTree 原生入口与集成改造；真实账户读写、权限、过期恢复和业务结果仍待验收。Skill 加载不证明线上任务成功。
- 配置生成器仅覆盖来源 US1 端点；其他 site 需在官方 setup 页选定站点，核实其端点和准入后同名覆盖。
- 不提供 OAuth 注册 / 登录 / 刷新；API / Application key 必须成对，不伪装成 Bearer。未增加 Datadog Code Security 扫描服务。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
