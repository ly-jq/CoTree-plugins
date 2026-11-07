# 安全审查

安全审查：CoTree 预迁移插件，完整兼容改造待完成。

- 插件：cotree.security-review，版本 0.1.1，CoTree Manifest v3。
- 分类：开发与质量；优先级 P1。
- 完整度：**integration-pending**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.security-review.claude-security
- Skill：cotree.security-review.setup（显式调用）
- Agent：cotree.security-review.explore
- Agent：cotree.security-review.scan-inventory
- Agent：cotree.security-review.scan-loader
- Agent：cotree.security-review.scan-redactor


## 改造内容

- 当前直接加载入口位于 `agents/`、`skills/claude-security/`。`resources/` 和 `provenance/` 保留原字节；旧品牌只作为来源参考，不再作为当前入口身份。此次只修复入口身份和资源定位，完整度仍为 **integration-pending**。

- 以稳定 CoTree ID 合并来源，资源分目录保留，重复服务只注册一次。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 本包已按功能去重并统一身份；完整运行内容仍待逐包适配，不能把来源保留或清单有效当成功能完整。
- 通用审查资料已迁移；专有 Workflow / Agent 选择器和权限 Hook 未注册。
- Agent cotree.security-review.explore 保留模型引用 sonnet；需配置对应 CoTree 模型，不静默改变模型选择。
- Agent cotree.security-review.scan-inventory 保留模型引用 sonnet；需配置对应 CoTree 模型，不静默改变模型选择。
- Agent cotree.security-review.scan-loader 保留模型引用 sonnet；需配置对应 CoTree 模型，不静默改变模型选择。
- Agent cotree.security-review.scan-redactor 保留模型引用 sonnet；需配置对应 CoTree 模型，不静默改变模型选择。
- 依赖 Claude Agent SDK、Stop / SubagentStop 和 asyncRewake。
- Deep Scan 会启动 Codex app-server，不能作为 CoTree 原生扫描器运行。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
