# Supabase

项目级 Supabase 数据库、应用集成和 PostgreSQL 性能工作流，默认只读连接。

- 插件：cotree.supabase，版本 0.2.0，CoTree Manifest v3。
- 分类：代码托管与部署；优先级 P0；第 5 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.supabase.connect（显式调用）
- Skill：cotree.supabase.inspect
- Skill：cotree.supabase.migrate（显式调用）
- Skill：cotree.supabase.integrate（显式调用）
- Skill：cotree.supabase.diagnose
- Skill：cotree.supabase.optimize

- MCP：cotree.supabase.supabase

## 改造内容

- 将来源综合技能拆为连接、检查、迁移、应用集成、诊断和优化六个 CoTree 工作流。
- 默认只读并限制功能组，提供必选 project-ref 的配置生成器；写模式需显式 --write，不跳过服务确认。
- PostgreSQL 最佳实践归属本包唯一 optimize 入口，保留上游 1.1.1 完整参考和旧来源追溯。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 远程访问需要独立 OAuth 或适用的 Supabase Management PAT；本包使用 COTREE_SUPABASE_MCP_AUTHORIZATION 传完整 Bearer header，不负责交互 OAuth。
- 默认地址尚无用户 project_ref；任何数据操作前须生成并应用项目级配置、核对环境。anon / publishable / service_role 项目密钥不能代替 Management 身份。
- 真实账户、项目数据库、迁移、Auth / Storage / Realtime / Edge Functions 尚未验收；默认功能组外的工具需按需配置，不能声称所有工具已启用。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
