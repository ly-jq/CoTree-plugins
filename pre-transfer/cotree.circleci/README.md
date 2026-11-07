# CircleCI

在 CoTree 中排查 CircleCI 构建、优化配置与测试数据，操作明确流水线，并按需接入 Chunk。

- 插件：cotree.circleci，版本 0.2.0，CoTree Manifest v3。
- 分类：代码托管与部署；优先级 P0；第 14 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.circleci.connect（显式调用）
- Skill：cotree.circleci.config
- Skill：cotree.circleci.builds
- Skill：cotree.circleci.tests
- Skill：cotree.circleci.artifacts
- Skill：cotree.circleci.cli（显式调用）
- Skill：cotree.circleci.chunk（显式调用）



## 改造内容

- 四个来源 Skill 整理为七个原生工作流，完整保留七份专项参考，不重复注册归档指令。
- 复用 CoTree Shell / 浏览器；按实际 CircleCI CLI 版本发现命令，Chunk 是独立可选服务。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 已完成 CoTree 原生入口与集成改造；真实账户读写、权限、过期恢复和业务结果仍待验收。Skill 加载不证明线上任务成功。
- 需要独立安装 CircleCI CLI；远程流水线需要个人身份和项目权限，配置 validate / process 也可能访问服务。
- Chunk 的登录、平台支持、组织准入和云任务结果待验收；归档安装示例不保证适用于当前 Windows。本包没有新增 CircleCI MCP。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
