# 网页数据可视化

实现并验证网页图表、地图、看板、关系图、架构图和数据叙事，保留完整工程参考。

- 插件：cotree.build-web-data-visualization，版本 0.2.0，CoTree Manifest v3。
- 分类：数据与商业；优先级 P0；第 9 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.build-web-data-visualization.design
- Skill：cotree.build-web-data-visualization.critique
- Skill：cotree.build-web-data-visualization.declarative
- Skill：cotree.build-web-data-visualization.svg
- Skill：cotree.build-web-data-visualization.canvas
- Skill：cotree.build-web-data-visualization.gpu
- Skill：cotree.build-web-data-visualization.maps
- Skill：cotree.build-web-data-visualization.dashboard
- Skill：cotree.build-web-data-visualization.statistics
- Skill：cotree.build-web-data-visualization.schedule
- Skill：cotree.build-web-data-visualization.graph
- Skill：cotree.build-web-data-visualization.architecture
- Skill：cotree.build-web-data-visualization.story
- Skill：cotree.build-web-data-visualization.react
- Skill：cotree.build-web-data-visualization.engineering
- Skill：cotree.build-web-data-visualization.test
- Skill：cotree.build-web-data-visualization.accessibility
- Skill：cotree.build-web-data-visualization.export



## 改造内容

- 18 个来源技能逐一转为 CoTree 入口，完整技术参考随包保留。
- 去除固定宿主、强制视觉审批与自动发布，复用数据分析 / React / Google Drive 能力。
- 新增可运行的离线柱状 / 折线起点：筛选、URL 状态、表格、窄屏、深浅主题和打印。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 本地起点需 Node 22+，仅柱状 / 折线、1–1000 行，每图最多 60 行；其他图形由原生工作流在目标工程实现。
- 完整参考不等于所有框架 / GPU / 导出格式已运行，需按具体版本与设备验收。
- 地图瓦片、私有数据和云交付需独立账户；不继承 Sites 或原宿主浏览器，图形本身不证明结论。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
