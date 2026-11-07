# Skill 编写

创建、评估和改进 CoTree Skill，管理资源、版本和真实任务证据。

- 插件：cotree.skill-creator，版本 0.2.0，CoTree Manifest v3。
- 分类：开发与质量；优先级 P0；第 4 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.skill-creator.create
- Skill：cotree.skill-creator.evaluate
- Skill：cotree.skill-creator.improve



## 改造内容

- 把作者、评估和描述优化重写为原生 SkillManage / Skill / SkillInstall 工作流。
- 统一跨家族的单技能写作与评估入口；统计脚本仅汇总已提供的真实记录，不调用外部宿主或模型。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- Skill 加载验证不证明模型行为质量；实际场景需要可用模型和独立输入。
- 评估脚本不启动会话、不读取用量凭据、不计算虚构总分；未知 token 保持未知，未执行任务不能计为通过。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
