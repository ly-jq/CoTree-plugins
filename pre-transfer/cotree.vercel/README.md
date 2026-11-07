# Vercel

Vercel 项目开发、部署、AI 应用与运行诊断的原生工作流，复用现有 CoTree 执行能力。

- 插件：cotree.vercel，版本 0.2.0，CoTree Manifest v3。
- 分类：代码托管与部署；优先级 P0；第 6 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.vercel.connect（显式调用）
- Skill：cotree.vercel.bootstrap（显式调用）
- Skill：cotree.vercel.deploy（显式调用）
- Skill：cotree.vercel.environment（显式调用）
- Skill：cotree.vercel.integrations（显式调用）
- Skill：cotree.vercel.nextjs
- Skill：cotree.vercel.react
- Skill：cotree.vercel.ui
- Skill：cotree.vercel.ai
- Skill：cotree.vercel.agents（显式调用）
- Skill：cotree.vercel.chat
- Skill：cotree.vercel.workflow
- Skill：cotree.vercel.functions
- Skill：cotree.vercel.cache
- Skill：cotree.vercel.data（显式调用）
- Skill：cotree.vercel.monorepo
- Skill：cotree.vercel.observe
- Skill：cotree.vercel.firewall（显式调用）
- Skill：cotree.vercel.flags（显式调用）
- Skill：cotree.vercel.sandbox（显式调用）
- Skill：cotree.vercel.content
- Skill：cotree.vercel.media
- Skill：cotree.vercel.commerce（显式调用）
- Skill：cotree.vercel.verify
- Skill：cotree.vercel.reference

- MCP：cotree.vercel.vercel

## 改造内容

- 54 个来源 Skill、5 个用户命令和 3 个专项角色归并为 25 个原生工作流；逐项映射见 migration.json。
- React / shadcn 入口归属本包；React 完整规则保留，shadcn 的 8 份互补参考从网页开发来源独立打包并记录摘要。
- 加入不执行用户代码的本地项目检查器；浏览器验证复用 CoTree / Playwright，去除固定模型、自动 Hook 和关键词触发。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 远程 Vercel MCP 要求客户端审核和 OAuth；CoTree 准入及登录 / 刷新未完成。COTREE_VERCEL_MCP_AUTHORIZATION 不等于普通 CLI token。
- CLI / REST 可按独立 Vercel 身份配置；云项目、部署、付费集成、v0 / Sandbox / Gateway 等仍需对应账户与真实验收，本批不会自动创建或部署。
- 版本、地区、配额和 beta 服务以当前官方文档为准；来源资源是参考，不表示所有云能力已经在 CoTree 可用。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
