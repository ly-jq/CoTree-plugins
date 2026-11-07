# creative-production

组织八类创意生产、原素材约束、统一生成与本地交互评审看板。

- 插件：cotree.creative-production，版本 0.2.0，CoTree Manifest v3。
- 分类：设计与内容；优先级 P0；第 29 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.creative-production.brief
- Skill：cotree.creative-production.produce
- Skill：cotree.creative-production.refine
- Skill：cotree.creative-production.export



## 改造内容

- 八种模式统一CoTree原生生产流程，保留全部深层知识和素材库。
- 用可独立运行的交互review页替换原宿主MCP Apps状态与强制并发。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 真实图像生成/Adobe等服务账户另验；本地合成素材只证明看板交互和边界。
- 原widget自动回传及持久服务器不继承，选择由当前浏览器/用户反馈读取，派生manifest不是Session状态权威。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
