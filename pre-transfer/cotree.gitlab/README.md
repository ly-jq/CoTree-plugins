# GitLab

在 CoTree 中读取 GitLab 项目、处理 Issue 和 Merge Request、检查流水线与 Wiki，支持独立 OAuth 和自建实例配置。

- 插件：cotree.gitlab，版本 0.2.0，CoTree Manifest v3。
- 分类：代码托管与部署；优先级 P0；第 13 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.gitlab.connect（显式调用）
- Skill：cotree.gitlab.inspect
- Skill：cotree.gitlab.issues（显式调用）
- Skill：cotree.gitlab.merge-request（显式调用）
- Skill：cotree.gitlab.review
- Skill：cotree.gitlab.pipelines（显式调用）
- Skill：cotree.gitlab.wiki（显式调用）
- Skill：cotree.gitlab.report

- MCP：cotree.gitlab.gitlab

## 改造内容

- 官方 HTTP 声明补齐八个原生协作工作流，区分 project ID、Issue / MR IID、SHA 和流水线状态。
- 增加 Self-Managed / 子路径配置生成器与协作 toolset 选择，认证使用独立 OAuth，不导入来源客户端注册。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 已适配 CoTree 原生 Skill / MCP；真实账户读写、过期恢复与线上业务仍待验收。配置脚本只生成配置，不实现登录 / token 刷新、不读取来源宿主身份、不启用插件。
- 需 top-level group / 实例允许 MCP；OAuth 客户端注册、授权和刷新须独立完成，headersEnv 不提供交互登录。普通 PAT 是否可用不能从 REST 支持推断。
- toolset 选择依 GitLab 版本；旧实例可生成 --legacy 配置，不提供服务端工具组过滤。Schema / 能力以实际发现为准，本包不封装 REST 备用传输、不启动 GitLab Duo 远程代理或启用 Code Security。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
