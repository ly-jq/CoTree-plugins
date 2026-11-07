# Temporal

在 CoTree 中开发、测试、诊断和运维 Temporal 工作流，区分本地服务与独立云身份。

- 插件：cotree.temporal，版本 0.2.0，CoTree Manifest v3。
- 分类：代码托管与部署；优先级 P0；第 18 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.temporal.inspect
- Skill：cotree.temporal.local（显式调用）
- Skill：cotree.temporal.develop
- Skill：cotree.temporal.interact（显式调用）
- Skill：cotree.temporal.test
- Skill：cotree.temporal.diagnose
- Skill：cotree.temporal.tune
- Skill：cotree.temporal.operate（显式调用）
- Skill：cotree.temporal.cloud（显式调用）
- Skill：cotree.temporal.serverless（显式调用）



## 改造内容

- 四份来源 Skill 拆成十项可发现的原生工作流，完整保留多语言与云端参考。
- 新增跨平台本地服务参数计划和固定 Python SDK 示例；本地流程不加载云配置，云接入按当前稳定 CLI / 独立身份处理。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 本包原生工作流、辅助工具与安装合同已适配；用户工程、真实模型任务、云服务和设备业务分别验收，不由协议夹具或示例代替。
- 本地模板固定 temporalio 1.34.0，参数计划验证目标为 Temporal CLI 1.9.1；其他版本需检查实际 --help 与 SDK API。示例仅含内存开发服务与无外部副作用的重试 Activity。
- Cloud / namespace 管理、API key / mTLS、WCI / AWS IAM、生产 batch / failover 和真实 SDK 业务尚需目标账户验收；来源 prerelease 脚本不作为可移植自动开通器。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
