# Agent SDK Dev

在 CoTree 中创建、集成和核查独立 Claude Agent SDK 的 TypeScript / Python 应用。

- 插件：cotree.agent-sdk-dev，版本 0.2.0，CoTree Manifest v3。
- 分类：开发与质量；优先级 P0；第 21 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.agent-sdk-dev.create
- Skill：cotree.agent-sdk-dev.integrate
- Skill：cotree.agent-sdk-dev.verify
- Skill：cotree.agent-sdk-dev.deploy（显式调用）
- Agent：cotree.agent-sdk-dev.verifier-ts
- Agent：cotree.agent-sdk-dev.verifier-py


## 改造内容

- 重写四项原生技能与两个可选只读验证 Agent，移除固定模型和自动委派。
- 提供固定版本 TS / Python 脚手架，独占新目录、无工具默认值、离线检查与真实调用分开。
- 完整保留原命令 / Agent 参考；应用 API 认证独立记录。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 实际 Claude 模型调用、工具授权交互、CLI 子进程取消与部署需要独立身份及目标运行时验收。
- 离线构造和类型检查不证明模型能力或外部任务成功；原验证 Agent 的判断也不是独立完成凭证。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
