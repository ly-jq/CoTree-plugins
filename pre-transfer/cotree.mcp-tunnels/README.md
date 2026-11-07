# mcp-tunnels

将授权私网 MCP 通过严格 SSH 转发接入 CoTree，保留配置、排障和撤销流程。

- 插件：cotree.mcp-tunnels，版本 0.2.0，CoTree Manifest v3。
- 分类：开发与质量；优先级 P0；第 28 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.mcp-tunnels.connect（显式调用）
- Skill：cotree.mcp-tunnels.diagnose



## 改造内容

- Anthropic专属托管传输替换为CoTree可用的SSH loopback MCP路径。
- 跨平台argv执行、严格主机身份、可取消进程和独立MCP协议验收。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 需要用户授权的SSH主机、可信known_hosts与目标MCP；未连接任何真实私网。
- 原Anthropic Managed Agent专属服务不移植，Docker服务可复用，IPv6主机不在当前helper输入合同内。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
