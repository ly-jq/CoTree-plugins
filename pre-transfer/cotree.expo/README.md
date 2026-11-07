# Expo

在 CoTree 中开发和调试 Expo 应用，覆盖导航、原生组件、数据、模块、构建、EAS 流水线和发布。

- 插件：cotree.expo，版本 0.2.0，CoTree Manifest v3。
- 分类：开发与质量；优先级 P0；第 17 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.expo.inspect
- Skill：cotree.expo.run（显式调用）
- Skill：cotree.expo.ui
- Skill：cotree.expo.native-ui
- Skill：cotree.expo.styles
- Skill：cotree.expo.data
- Skill：cotree.expo.api
- Skill：cotree.expo.modules
- Skill：cotree.expo.dev-client（显式调用）
- Skill：cotree.expo.cicd
- Skill：cotree.expo.deploy（显式调用）
- Skill：cotree.expo.upgrade（显式调用）
- Skill：cotree.expo.dom



## 改造内容

- 十三个来源 Skill 与运行命令归并为十三个原生工作流，移除 Codex Run 按钮和 Bash 依赖。
- 新增只读工程检查与跨平台 Expo 启动器，默认 localhost；只执行项目已安装的 CLI，不自动下载、构建原生工程或连接云账户。
- 保留完整参考、脚本、许可与图标，按 SDK 版本校正 Expo Go / development build 和预览依赖限制。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 原生工作流、随包工具和安装合同已改造；真实模型任务、用户工程、账户发布及各平台设备效果需分别验收。
- 本地 iOS 构建需要 macOS / Xcode，Android 需要相应 SDK / JDK 与设备；Web 导出不证明原生平台通过。EAS、应用商店、推送等需要独立身份与目标权限。
- 没有 CoTree 专属 Run 按钮；run Skill 提供终端可执行入口。归档 EAS 脚本只供参考，不在完整性固定的插件内安装依赖或自动执行。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
