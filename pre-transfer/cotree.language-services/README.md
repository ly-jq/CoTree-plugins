# 语言服务

用 CoTree 原生 LSP 配置和查询十二类本地语言服务器，核对真实语义与诊断。

- 插件：cotree.language-services，版本 0.2.0，CoTree Manifest v3。
- 分类：开发与质量；优先级 P0；第 4 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.language-services.setup
- Skill：cotree.language-services.navigate
- Skill：cotree.language-services.diagnose



## 改造内容

- 十二个来源语言插件合为一个原生 LSP 工作流，提供逐语言配置片段与实际查询方法。
- 补齐 C/C++、C#、Kotlin、Lua、PHP、Ruby、Rust、Swift 的宿主语言键、文件识别和工程根；沿用原客户端。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 需要包含本批十二类语言合同的 CoTree 构建；旧构建仅接受 TS/JS、Python、Java、Go。
- 配置模板不安装服务器。新增八类需要自行准备对应语言服务器与工具链；命令来自已盘点来源版本，目标系统需独立验证。
- 状态、协议、真实语言语义、构建测试分别记录；Windows / Linux / macOS 的语言服务器与构建依赖不能互相替代验收。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
