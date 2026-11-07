# Terraform

在 CoTree 中查询 Terraform provider / module 文档，开发和验证 IaC，审查计划并执行明确授权的基础设施变更。

- 插件：cotree.terraform，版本 0.2.0，CoTree Manifest v3。
- 分类：代码托管与部署；优先级 P0；第 14 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.terraform.connect（显式调用）
- Skill：cotree.terraform.docs
- Skill：cotree.terraform.develop
- Skill：cotree.terraform.validate
- Skill：cotree.terraform.plan
- Skill：cotree.terraform.apply（显式调用）
- Skill：cotree.terraform.state（显式调用）
- Skill：cotree.terraform.cloud（显式调用）

- MCP：cotree.terraform.terraform

## 改造内容

- 固定来源 MCP 0.4.0，默认只注册公共 registry 工具；补齐八个原生工作流。
- 提供同版本 binary / Docker 与显式云接入配置；修复 stdio 凭据未传递及 argv 暴露风险，使用该版本的 TFE_ADDRESS。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 已完成 CoTree 原生入口与集成改造；真实账户读写、权限、过期恢复和业务结果仍待验收。Skill 加载不证明线上任务成功。
- 默认需已运行的 Docker daemon；本地二进制替代需自行核实官方 0.4.0 发布校验和，生成器不检查程序内容。
- 云工具选择不是只读权限，HCP Terraform / Enterprise token 和基础设施 provider 凭据分开。实际 plan / apply、状态迁移和多平台执行未验收。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
