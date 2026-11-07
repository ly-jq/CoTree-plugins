---
name: cotree.plugin-development.build
description: "创建或迁移 CoTree 插件，选择声明式能力或受控代码实现。"
disable-model-invocation: false
---

# 插件开发

通过 ToolSearch 读取实际 CoTree 工具 schema，遵循当前用户授权和项目约定。资源相对 Skill 回执的 pluginRootDir；不引入独立模型循环、关键词路由或另一份持久化权威。
读取 references/contracts.md，核对目标宿主版本和已存在的同类能力。能组合现有能力时声明 Skill / Agent / MCP；确定性新逻辑才写代码工具。明确能力、输入输出和必要权限，不额外创建调度器。
在用户指定的源码目录开发。scripts/scaffold.mjs --output <新目录> --id <稳定ID> --name <名称> --kind skill|tool 生成最小可安装模板，目标已存在就拒绝。代码模板仅回显 JSON，后续替换为真实业务并补相应验证；模板不自动安装。
宿主已提供 PluginPropose / PluginScaffold 时按其 schema 使用提案流程；PluginScaffold 接受 proposalId，不是任意文件路径，且可调用宿主模型。手写目录走正常目录安装。不要把两条开发路径混成一份状态。完成源代码、配置、文档和验证后再走用户授权的发布操作。
