# nvidia

按 GPU、优化求解、Dynamo、AI-Q、Omniverse 与 Physical AI 组织 NVIDIA 原生工作流。

- 插件：cotree.nvidia，版本 0.2.0，CoTree Manifest v3。
- 分类：研究与专业工具；优先级 P0；第 25 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.nvidia.environment
- Skill：cotree.nvidia.cuopt
- Skill：cotree.nvidia.dynamo（显式调用）
- Skill：cotree.nvidia.aiq-deploy（显式调用）
- Skill：cotree.nvidia.aiq-research（显式调用）
- Skill：cotree.nvidia.nemoclaw（显式调用）
- Skill：cotree.nvidia.simready（显式调用）
- Skill：cotree.nvidia.viewer
- Skill：cotree.nvidia.usd-performance
- Skill：cotree.nvidia.infrastructure（显式调用）
- Skill：cotree.nvidia.reconstruction（显式调用）



## 改造内容

- 去除来源强制关键词 finder 和自动远程 skill 安装；由主模型按任务选择 11 项能力。
- 增加有界只读 GPU 查询，区分设备可见与计算/互联验证。
- 拆清部署、研究恢复、数据许可及独立账户，保留完整嵌套资源。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- GPU 查询不证明所有计算、SDK、容器或集群可用；Windows 和远程生产环境分别核实。
- 来源 AI-Q 客户端只支持本地匿名后端；远程认证另适配。
- NGC/HF/NVIDIA/NVCF/云账户、许可与计费未验收；没有运行部署、模型推理、USD渲染或科学计算。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
