# Dropbox

在 CoTree 中查找和整理 Dropbox 文件、管理分享与收集请求，按实际服务能力恢复版本或编辑 Paper。

- 插件：cotree.dropbox，版本 0.2.0，CoTree Manifest v3。
- 分类：团队协作与知识；优先级 P0；第 12 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.dropbox.connect（显式调用）
- Skill：cotree.dropbox.find
- Skill：cotree.dropbox.inspect
- Skill：cotree.dropbox.organize（显式调用）
- Skill：cotree.dropbox.share（显式调用）
- Skill：cotree.dropbox.collect（显式调用）
- Skill：cotree.dropbox.cleanup（显式调用）
- Skill：cotree.dropbox.recover（显式调用）
- Skill：cotree.dropbox.paper（显式调用）

- MCP：cotree.dropbox.dropbox

## 改造内容

- 六个来源技能改为九个原生工作流，保留浅色 / 深色图标、三张预览图和完整来源。
- 修订旧的永久缺失结论：恢复、邀请、Paper 等以当前工具目录及实际账户为准；异步工作逐项核实。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 已适配原生 Skill 与官方 MCP 声明；真实账户读写、权限 / 过期恢复仍待验收。静态 headersEnv 不实现 OAuth 注册、登录、刷新或撤销，不读取来源宿主会话。
- 官方 DCR 只对支持的客户端开放；CoTree 准入未确认。其他客户端需独立 Dropbox 应用及有效 token，真实账户路径待验收。
- 内容提取、Paper、恢复、邀请、团队 namespace 和后台任务能力受工具目录 / 套餐 / 权限影响，不保证任意文件可提取或恢复。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
