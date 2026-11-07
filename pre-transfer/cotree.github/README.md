# GitHub

通过 GitHub 官方 MCP 查询仓库、处理 Issue / PR 和检查 Actions。

- 插件：cotree.github，版本 0.2.0，CoTree Manifest v3。
- 分类：代码托管与部署；优先级 P0；第 3 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.github.connect（显式调用）
- Skill：cotree.github.inspect
- Skill：cotree.github.issues（显式调用）
- Skill：cotree.github.pull-requests（显式调用）
- Skill：cotree.github.actions（显式调用）

- MCP：cotree.github.github

## 改造内容

- 合并两个来源的 MCP 和连接器入口，使用一份原生服务身份与独立认证。
- 加入连接诊断、仓库检查、Issue、PR、Actions 五个工作流；与 Git 工作流复用本地提交能力。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 需要独立 GitHub PAT；完整 Bearer header 放入 COTREE_GITHUB_MCP_AUTHORIZATION，配置方法见 references/connection.md。
- 账户权限、组织 SSO、服务工具集决定可用操作；GitHub Enterprise 实例须另行配置验证。
- 未实现此插件的交互 OAuth 登录 / 刷新或原宿主账户复用；本批未取得账户，不宣称真实仓库读写已通过。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
