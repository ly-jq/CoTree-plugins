# Canva

在 CoTree 中编辑 Canva 设计、制作品牌演示、检查与落实反馈、调整尺寸、翻译和批量生成，并导出已核验成果。

- 插件：cotree.canva，版本 0.2.0，CoTree Manifest v3。
- 分类：设计与内容；优先级 P0；第 15 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.canva.connect（显式调用）
- Skill：cotree.canva.edit（显式调用）
- Skill：cotree.canva.presentation（显式调用）
- Skill：cotree.canva.brand-check
- Skill：cotree.canva.feedback
- Skill：cotree.canva.implement-feedback（显式调用）
- Skill：cotree.canva.resize（显式调用）
- Skill：cotree.canva.translate（显式调用）
- Skill：cotree.canva.bulk（显式调用）
- Skill：cotree.canva.export（显式调用）

- MCP：cotree.canva.canva

## 改造内容

- 完整保留八类来源 Skill 及原图标，重写为十个 CoTree 原生工作流；归档不重复注册。
- 新增离线批量数据规划器、接入说明和导出流程；唯一远端 MCP 使用独立环境绑定。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 原生入口、协议或 REST 适配已实现；独立账户授权、真实对象读写、过期恢复和业务结果仍待验收。
- 需要 Canva 认可的独立应用与每用户 OAuth；本包不实现 OAuth 客户端注册、回调或刷新。高级模板、品牌和批量功能取决于账户权益及实际工具目录。
- 批量规划器仅支持文本和已上传的图片 asset ID，不执行远端任务；图表等结构化字段须按实际 schema 另行处理。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
