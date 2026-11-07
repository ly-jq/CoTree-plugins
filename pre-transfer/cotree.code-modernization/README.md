# code-modernization

盘点、规划和实施遗留系统迁移，以实际输出核对兼容性。

- 插件：cotree.code-modernization，版本 0.2.0，CoTree Manifest v3。
- 分类：开发与质量；优先级 P0；第 26 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.code-modernization.assess
- Skill：cotree.code-modernization.rules
- Skill：cotree.code-modernization.plan
- Skill：cotree.code-modernization.migrate（显式调用）
- Skill：cotree.code-modernization.verify
- Skill：cotree.code-modernization.status



## 改造内容

- 13命令和8角色归并为6个原生工作流，保留完整领域和资源。
- 新增跨平台有界证据比较与HTML，去除原宿主强制审批/多代理编排和独立完成门。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 本地对比和CoTree入口可验证，真实遗留系统、目标技术栈及生产切换需项目级验收。
- 原宿主可视化面板改为可分享本地HTML；不复制其状态库和强制签署流程。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
