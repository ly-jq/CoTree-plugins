# 竞赛数学

求解、核查并排版竞赛数学题，保留严谨论证、反例与明确的未解决部分。

- 插件：cotree.math-olympiad，版本 0.2.0，CoTree Manifest v3。
- 分类：研究与专业工具；优先级 P0；第 22 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.math-olympiad.solve
- Skill：cotree.math-olympiad.verify
- Skill：cotree.math-olympiad.present（显式调用）



## 改造内容

- 竞赛数学改为 solve / verify / present 三项原生能力；数字题也要求可核对推导。
- 保留全部题型方法、构造、复核与排版资料；移除固定模型投票、强制追加轮次与原宿主工具禁令。
- 用跨平台 Node 文档生成替换 Bash 包装；编译与数学正确性分开报告。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- 参考资料和数学模型输出可能存在错误；投票、有限枚举和格式检查不能认证证明。
- TeX 源生成不等于 PDF 编译；实际 PDF 需要宿主编译能力或已有 TeX 工具链。
- 独立复核仅在当前宿主允许并实际委派后才可如此标注；否则明确为主模型检查。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
