---
name: cotree.plugin-development.verify
description: "检查 CoTree 插件清单、资源、安装、执行和禁用，定位实际兼容问题。"
disable-model-invocation: false
---

# 插件开发

通过 ToolSearch 读取实际 CoTree 工具 schema，遵循当前用户授权和项目约定。资源相对 Skill 回执的 pluginRootDir；不引入独立模型循环、关键词路由或另一份持久化权威。
读 references/contracts.md 的验证入口。核对根 plugin.json、所有注册路径、schema、导出名、依赖、权限与完整性。提案用 PluginValidate；普通目录用原生 CLI / 包校验器，不把目录传成 proposalId。
在隔离 workspace 安装，分别检查 Skill、Agent、MCP 和代码工具实际加载 / 调用；外部账户先做授权读取。代码错误、被拒绝、超时和未执行各自记录。保存 package digest、构建身份、命令与结果，最后禁用并确认贡献撤销；不修改用户其他实例。
校验通过不等于实际业务成功。缺平台 / 服务时保留具体缺口，不用自评或必过的 mock 补成已验证。
