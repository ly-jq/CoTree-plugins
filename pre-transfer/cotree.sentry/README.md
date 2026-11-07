# Sentry

Sentry 问题分诊、事件读取和故障关联，附独立 GET-only API 客户端。

- 插件：cotree.sentry，版本 0.2.0，CoTree Manifest v3。
- 分类：代码托管与部署；优先级 P0；第 6 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.sentry.connect（显式调用）
- Skill：cotree.sentry.triage
- Skill：cotree.sentry.inspect
- Skill：cotree.sentry.diagnose

- MCP：cotree.sentry.sentry

## 改造内容

- 来源只读工作流重写为 connect / triage / inspect / diagnose，MCP OAuth 与 API token 分开。
- Python 辅助脚本迁移为独立 Node 脚本：GET 固定端点、正确时间筛选、项目范围校验、有界分页、重试、重定向拒绝和输出脱敏。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- MCP 要独立 OAuth；本包不实现登录 / 刷新。只读 API 可用 COTREE_SENTRY_API_TOKEN，不能直接将该 token 当作 MCP OAuth。
- 真实组织、项目、事件及错误环境未验收；使用 --base-url 时须先核对实际 Sentry 地区或自托管 HTTPS 地址。
- 辅助脚本不写入、不解决 / 删除 Issue、不触发 Seer。默认省略事件 entries；基础脱敏不构成完整匿名化保证。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
