# hookify

用明确的结构化规则检查 CoTree 工具事件，提供提示与前置阻止。

- 插件：cotree.hookify，版本 0.2.0，CoTree Manifest v3。
- 分类：开发与质量；优先级 P0；第 26 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.hookify.configure
- Skill：cotree.hookify.inspect



## 改造内容

- Python/Claude Hook替换为CoTree原生受控子宿主Hook。
- 新增有界配置验证、六个操作符、前置阻止和后置通知，使用真实工具schema。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 需要宿主批准可信代码摘要或签名；不会自行绕过信任。
- 无来源Stop和UserPromptSubmit合同；完成通知不重启模型，Hook超时/故障遵循宿主fail-open。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
