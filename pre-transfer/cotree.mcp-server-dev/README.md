# MCP 服务开发

为 CoTree 设计、实现、验证和打包标准 MCP 服务，明确扩展能力边界。

- 插件：cotree.mcp-server-dev，版本 0.2.0，CoTree Manifest v3。
- 分类：开发与质量；优先级 P0；第 8 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.mcp-server-dev.design
- Skill：cotree.mcp-server-dev.build
- Skill：cotree.mcp-server-dev.verify
- Skill：cotree.mcp-server-dev.package（显式调用）
- Skill：cotree.mcp-server-dev.ui



## 改造内容

- 三项来源技能改造为五项工作流，移除 Claude 专属配置、固定提问与强制远程部署。
- 新增可运行的 Node stdio / loopback Streamable HTTP 脚手架和依赖捆绑器，输出 CoTree Manifest v3。
- 按当前 CoTree v1 SDK 能力区分工具 / resource / prompt 与 MCP Apps、elicitation、sampling、roots 等扩展。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 脚手架固定 SDK 1.29.0，以当前 CoTree 客户端为验证目标；不是 SDK 最新主版本。v2 / 新协议升级需单独协商和回归，本包不修改宿主依赖。
- HTTP 样例只绑定 127.0.0.1，无公网认证、多租户或生产上游；远程部署 / OAuth / 重连恢复需真实目标验收。
- CoTree MCP Apps iframe bridge、MCPB 安装器和完整客户端反向能力不由本包实现；必须保留文本 / JSON 结果并以协商能力为准。
- 打包捆绑 JS 依赖，目标仍需 Node 20.19+；标准 stdio 子进程不是 OS 沙箱。只验证样例协议不证明新服务的业务实现。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
