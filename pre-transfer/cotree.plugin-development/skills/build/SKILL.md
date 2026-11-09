---
name: cotree.plugin-development.build
description: "创建或迁移 CoTree 插件，选择声明式能力或受控代码实现。"
disable-model-invocation: false
---

# 插件开发

通过 ToolSearch 读取实际 CoTree 工具 schema，遵循当前用户授权和项目约定。资源相对 Skill 回执的 pluginRootDir；不引入独立模型循环、关键词路由或另一份持久化权威。
读取 references/contracts.md，核对目标宿主版本和已存在的同类能力。能组合现有能力时声明 Skill / Agent / MCP；确定性新逻辑才写代码工具。明确能力、输入输出和必要权限，不额外创建调度器。
在用户指定的源码目录开发。scripts/scaffold.mjs --output <新目录> --id <稳定ID> --name <名称> --kind skill 生成声明式包；代码开发选 tool / service / view / task / file-workbench / batch-workbench / workflow-workbench，并用 --sdk 指向已安装的公开 @cotree/plugin-sdk@0.14.0 包，或在当前开发目录安装该包。代码模式调用 SDK 官方初始化器，生成 Manifest v4 / API 1、strict TypeScript、构建与合同夹具；目标已存在就拒绝，缺 SDK 明确报错，不下载依赖或回退旧模板。纯声明式包继续支持 v3，无须引入代码运行时。
按真实需求组合 Task、process、settings、questions、approvals、sessions、workflows、automations、models、connections 和 computer 等公开客户端。先查 capabilities.describe() 的作用域和依赖，再声明最小权限。任务、进程和会话仍由原宿主执行；业务协议放在插件，不能复制 AgentLoop 或直接访问宿主数据库。
宿主已提供 PluginPropose / PluginScaffold 时按其 schema 使用提案流程；PluginScaffold 接受 proposalId，不是任意文件路径，且可调用宿主模型。手写目录走正常目录安装。不要把两条开发路径混成一份状态。完成源代码、配置、文档和验证后再走用户授权的发布操作。
