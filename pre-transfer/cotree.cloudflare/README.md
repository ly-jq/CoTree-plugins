# Cloudflare

在 CoTree 中开发和部署 Cloudflare Workers、Agents、Durable Objects 与 MCP 服务，并管理存储、环境和实际性能证据。

- 插件：cotree.cloudflare，版本 0.2.0，CoTree Manifest v3。
- 分类：代码托管与部署；优先级 P0；第 13 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.cloudflare.connect（显式调用）
- Skill：cotree.cloudflare.platform
- Skill：cotree.cloudflare.workers
- Skill：cotree.cloudflare.storage（显式调用）
- Skill：cotree.cloudflare.durable-objects
- Skill：cotree.cloudflare.agents
- Skill：cotree.cloudflare.mcp
- Skill：cotree.cloudflare.sandbox
- Skill：cotree.cloudflare.wrangler（显式调用）
- Skill：cotree.cloudflare.deploy（显式调用）
- Skill：cotree.cloudflare.performance

- MCP：cotree.cloudflare.cloudflare-api

## 改造内容

- 九个来源 Skill 与两个命令收敛为十一个原生工作流，保留完整产品 / SDK 参考与原图标。
- 采用官方 Code Mode MCP，补齐独立 token、API 执行边界、明确部署环境；浏览器测量复用现有能力。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 已适配 CoTree 原生 Skill / MCP；真实账户读写、过期恢复与线上业务仍待验收。配置脚本只生成配置，不实现登录 / token 刷新、不读取来源宿主身份、不启用插件。
- Code Mode execute 的代码可发起实际 API 写入；服务端隔离不等于只读，API token 需限制 account / zone 与权限。
- Workers / Agents / Sandbox 应用需要项目依赖、实际账户和对应套餐；本批不创建或部署示例云资源。性能 trace 和字段指标依可用浏览器能力。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
