# Figma

连接 Figma 设计上下文，完成代码实现、组件映射与设计 / FigJam / Slides 创作。

- 插件：cotree.figma，版本 0.2.0，CoTree Manifest v3。
- 分类：设计与内容；优先级 P0；第 5 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.figma.connect（显式调用）
- Skill：cotree.figma.inspect
- Skill：cotree.figma.implement
- Skill：cotree.figma.compose（显式调用）
- Skill：cotree.figma.library（显式调用）
- Skill：cotree.figma.code-connect（显式调用）
- Skill：cotree.figma.diagram（显式调用）
- Skill：cotree.figma.slides（显式调用）
- Skill：cotree.figma.motion（显式调用）

- MCP：cotree.figma.figma

## 改造内容

- 十二个来源 Skill 和四个命令收敛为九个 CoTree 工作流，覆盖设计读写、代码映射、SwiftUI、图表、幻灯片与动效。
- 随包提供桌面 / 远程连接配置输出器、严格 URL 解析器和自包含编辑指南，不把来源宿主工具名当运行接口。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- Figma 远程 MCP 限官方目录内客户端；CoTree 准入未确认，OAuth 客户端接入和账户读写均待完成。REST PAT 不作为通用 MCP 登录凭据。
- 桌面连接需已登录的 Figma Desktop 开启 Dev Mode MCP；可生成 http://127.0.0.1:3845/mcp 配置，但此环境尚未验收桌面服务。
- 桌面与远程工具集不同；创建文件、远程编辑、部分库 / 图表等能力必须通过实际 tools/list 确认，不能把桌面读取路径声称为全部写能力。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
