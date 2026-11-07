# Playground

在 CoTree 中制作可独立打开的交互 HTML，探索设计、数据、概念、代码结构和文档修改，并生成可复制的说明。

- 插件：cotree.playground，版本 0.2.0，CoTree Manifest v3。
- 分类：设计与内容；优先级 P0；第 19 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.playground.create
- Skill：cotree.playground.design
- Skill：cotree.playground.data
- Skill：cotree.playground.map
- Skill：cotree.playground.review
- Skill：cotree.playground.verify



## 改造内容

- 去除回贴 Claude、固定 dark theme 和 macOS open 命令；改用 CoTree 文件与浏览器能力，主题遵循用户工程。
- 完整保留六类专业模板，注册六个原生工作流，避免与网页开发 / 数据分析包重复注册。
- 新增无需依赖的单 HTML 设计实验页，包含实时预览、三种预设、重置、复制失败回退与可保留状态的导出。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 完整六类模板是供模型按真实任务实现的指导，不是六个已编译产品；当前随包可运行示例验证设计类，其他真实数据 / 文档 / 代码图另验。
- 浏览器复制权限和文件下载由宿主控制；复制受限时提供选中文字，页面默认无外部请求或发布。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
