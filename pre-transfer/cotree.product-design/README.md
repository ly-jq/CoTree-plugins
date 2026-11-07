# 产品设计

从产品背景、URL 或参考图完成设计研究、原型、体验审查和交付。

- 插件：cotree.product-design，版本 0.2.0，CoTree Manifest v3。
- 分类：设计与内容；优先级 P0；第 8 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.product-design.brief
- Skill：cotree.product-design.explore
- Skill：cotree.product-design.prototype
- Skill：cotree.product-design.audit
- Skill：cotree.product-design.research
- Skill：cotree.product-design.qa
- Skill：cotree.product-design.context（显式调用）
- Skill：cotree.product-design.share（显式调用）



## 改造内容

- 十项来源 Skill 收敛为八项原生工作流，移除模式停止门、强制问答 / 三方案 / 固定宿主和自动分享。
- 新增本地 React / mobile-app 模板生成器，保留移动运行库、资源和交互测试，移除 Sites worker 与发布绑定。
- 产品上下文复用现有存储，index / user-context 与分析 / 投资领域保留各自边界；视觉实现和云部署复用已有能力。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 生成器只写不存在的新目录，不安装依赖或启动服务；模板仍需目标 Node / npm 依赖和实际浏览器。移动运行库保持网页模拟，不代表原生 iOS / Android 应用。
- 源码中的 Sites 发布、ChatGPT 标注、Figma / 图像生成入口不直接继承；按 CoTree 实际工具与独立服务身份分别使用。
- 设计原型通常使用本地状态或明确的示例数据，不证明生产后端、账户或真实用户研究结果；共享与发布需实际目标和授权。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
