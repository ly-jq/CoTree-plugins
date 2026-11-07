# Apple 应用开发

统一 iOS / macOS 的 SwiftUI、构建调试、性能与分发工作流，通过独立 XcodeBuildMCP 接入。

- 插件：cotree.apple-development，版本 0.2.0，CoTree Manifest v3。
- 分类：开发与质量；优先级 P0；第 25 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.apple-development.build
- Skill：cotree.apple-development.test
- Skill：cotree.apple-development.swiftui
- Skill：cotree.apple-development.refactor
- Skill：cotree.apple-development.glass
- Skill：cotree.apple-development.windows
- Skill：cotree.apple-development.appkit
- Skill：cotree.apple-development.intents
- Skill：cotree.apple-development.performance
- Skill：cotree.apple-development.memory
- Skill：cotree.apple-development.preview
- Skill：cotree.apple-development.telemetry
- Skill：cotree.apple-development.signing
- Skill：cotree.apple-development.distribute（显式调用）

- MCP：cotree.apple-development.cotree.apple-development.xcodebuildmcp

## 改造内容

- 按能力合并 iOS/macOS 为 14 个原生入口，保留平台专用资料。
- 独立固定 XcodeBuildMCP 2.7.0；关闭内部遥测和自动宿主同步。
- 增加显式 Simulator 选择与构建 argv 计划，保留完整图标和来源。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- Windows 只能验证工具协议与本地准备；macOS/Xcode、Simulator/真机、预览和分发均另验。
- 来源 preview/trace 辅助脚本保留，依赖与实际结果需在目标 Mac 核实。
- 开发者签名、公证与商店使用独立 Apple 账户，不继承原宿主身份。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
