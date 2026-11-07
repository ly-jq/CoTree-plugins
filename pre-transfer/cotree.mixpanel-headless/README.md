# Mixpanel Headless

通过独立 Mixpanel Python / CLI 在 CoTree 中发现产品数据、分析五类指标、维护仪表盘和业务上下文。

- 插件：cotree.mixpanel-headless，版本 0.2.0，CoTree Manifest v3。
- 分类：数据与商业；优先级 P0；第 20 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.mixpanel-headless.setup（显式调用）
- Skill：cotree.mixpanel-headless.connect（显式调用）
- Skill：cotree.mixpanel-headless.discover
- Skill：cotree.mixpanel-headless.analyze
- Skill：cotree.mixpanel-headless.dashboards
- Skill：cotree.mixpanel-headless.manage（显式调用）
- Skill：cotree.mixpanel-headless.context



## 改造内容

- 四个来源技能去重为七个原生工作流；保留完整分析、认证与仪表盘参考和图标 / 预览。
- 固定 mixpanel-headless 0.4.0，提供不创建 Workspace、不读取账户配置的本地 API 检查和类型草稿校验。
- 使用独立 PKCE 或服务账户；明确 region / project / workspace 及读写权限，不继承来源宿主认证。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 本地类型校验不验证真实事件、对象权限或服务端限制；真实账户、五类查询、仪表盘和实体写入需独立验收。
- 0.4.0 是本次验证版本；来源示例与新 API 可能不同，以当前 mp help / describe 为准。统计 / 绘图库按任务在独立环境安装；不运行归档 setup.sh。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
