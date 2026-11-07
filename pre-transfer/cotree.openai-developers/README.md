# OpenAI Developers

开发 OpenAI Agents SDK 与 ChatGPT MCP Apps 应用，准备评测、提交材料并诊断 API 接入。

- 插件：cotree.openai-developers，版本 0.2.0，CoTree Manifest v3。
- 分类：研究与专业工具；优先级 P0；第 21 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.openai-developers.docs
- Skill：cotree.openai-developers.agents-sdk
- Skill：cotree.openai-developers.build-chatgpt-app
- Skill：cotree.openai-developers.submission（显式调用）
- Skill：cotree.openai-developers.credentials（显式调用）
- Skill：cotree.openai-developers.troubleshoot
- Skill：cotree.openai-developers.evaluate
- Skill：cotree.openai-developers.deploy（显式调用）



## 改造内容

- 五项来源能力改写为八项原生技能，保留完整开发 / 评测 / 部署 / 提交参考。
- 提供 TS / Python Agents SDK 和自包含 MCP Apps 起点；固定依赖，使用官方 UI bridge，无公网默认监听。
- 认证改为独立项目身份；原宿主密钥连接器和本地确认 MCP 仅归档，不注册失效入口。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- Platform 连接器的自动创建 / 加密传递 API key 尚未接入 CoTree；目前使用独立官方项目密钥与安全环境注入。
- 离线 SDK、loopback MCP 与模拟宿主 UI 检查不证明 API 额度、真实模型、ChatGPT 客户端接入、商店审核或远程部署。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
