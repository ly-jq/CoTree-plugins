# Firebase

在 CoTree 中连接 Firebase 项目，开发后端、管理数据与身份、排查故障并验证授权部署；支持明确目录和功能组。

- 插件：cotree.firebase，版本 0.2.0，CoTree Manifest v3。
- 分类：代码托管与部署；优先级 P0；第 13 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.firebase.connect（显式调用）
- Skill：cotree.firebase.inspect
- Skill：cotree.firebase.initialize（显式调用）
- Skill：cotree.firebase.data（显式调用）
- Skill：cotree.firebase.auth（显式调用）
- Skill：cotree.firebase.rules
- Skill：cotree.firebase.diagnose
- Skill：cotree.firebase.deploy（显式调用）
- Skill：cotree.firebase.messaging（显式调用）
- Skill：cotree.firebase.configure（显式调用）

- MCP：cotree.firebase.firebase

## 改造内容

- 官方 MCP 声明补齐十个原生工作流，固定 firebase-tools 15.32.1 并默认限定 auth / firestore / storage。
- 增加离线项目目录 / 功能配置；核对真实 mcp 参数，拒绝未知功能组，分清 CLI 身份、ADC、模拟器与线上服务。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 已适配 CoTree 原生 Skill / MCP；真实账户读写、过期恢复与线上业务仍待验收。配置脚本只生成配置，不实现登录 / token 刷新、不读取来源宿主身份、不启用插件。
- 需要 Node.js / npm 与固定版 firebase-tools 可用。MCP 功能组不是权限或只读控制，core 工具始终存在；未选择的功能需生成并应用配置后重连。
- Firebase CLI 的共享登录 / 活动项目与 MCP 的持久客户端目录设置可能影响目标；每次以 firebase_get_environment 等真实结果核对。默认 workspace 或 --dir 不提供 OS 隔离。
- prompts / UI resources 不作为 CoTree 原生 UI 声明；缺少通用资源入口时使用实际 firebase_read_resources 或官方文档。未覆盖的远程扩展工具按真实目录验收。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
