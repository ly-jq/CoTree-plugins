# Consensus

在 CoTree 中检索学术论文、设计检索策略、筛选和综合研究证据，生成可核对的书目与研究缺口分析。

- 插件：cotree.consensus，版本 0.2.0，CoTree Manifest v3。
- 分类：研究与专业工具；优先级 P0；第 16 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.consensus.connect（显式调用）
- Skill：cotree.consensus.question
- Skill：cotree.consensus.search
- Skill：cotree.consensus.review
- Skill：cotree.consensus.synthesize
- Skill：cotree.consensus.bibliography
- Skill：cotree.consensus.gaps

- MCP：cotree.consensus.consensus

## 改造内容

- 保留唯一官方 MCP，补齐七个研究工作流，不沿用原宿主专属展示或工具假设。
- 区分匿名试用、独立 OAuth / API key 和实际套餐权限；没有原图标时沿用宿主默认图标。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 原生工作流与协议适配已实现；真实账户或本地 Desktop 文献库、模型任务效果及跨平台运行仍待验收。
- 官方文档提到匿名试用，但 2026-10-07 本轮匿名 MCP 初始化实测 401，当前 CoTree 路径的匿名检索未验收；使用独立 API key 或 OAuth 继续接入，自动 OAuth 登录 / 刷新未实现。
- 错误或撤销的 key 可能退回匿名限制；成功请求或少量结果不证明已认证。全文、DOI、独立 fetch 等仅按实际目录和返回字段使用。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
