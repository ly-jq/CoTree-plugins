# adobe

用 Adobe 网页应用完成照片、肖像、模板、社交尺寸、视频初剪与样机工作流。

- 插件：cotree.adobe，版本 0.2.0，CoTree Manifest v3。
- 分类：设计与内容；优先级 P0；第 29 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.adobe.connect
- Skill：cotree.adobe.batch-edit
- Skill：cotree.adobe.portraits
- Skill：cotree.adobe.templates
- Skill：cotree.adobe.social
- Skill：cotree.adobe.quick-cut
- Skill：cotree.adobe.mockups



## 改造内容

- 完整六类创作流程改成独立浏览器可执行的CoTree Skill，保留全部深层领域资料。
- 不虚构原Adobe创作连接器MCP，现有浏览器和实际工具发现共同承担执行。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- Adobe登录、套餐权益、真实编辑/生成/导出未验收；网页可用功能与原专属API存在差异，按连接文档逐项核实。
- 批次改为明确清单逐图执行；原自动预设/深度虚化/Widget只有实际工具提供时可用。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
