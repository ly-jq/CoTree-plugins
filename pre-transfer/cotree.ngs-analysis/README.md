# NGS 测序分析

规划、预检并执行可复现的测序分析，保留样本、参考、运行和科学证据。

- 插件：cotree.ngs-analysis，版本 0.2.1，CoTree Manifest v3。
- 分类：研究与专业工具；优先级 P0；第 24 批。
- 完整度：**native-adapted**。native-adapted 表示运行内容已按 CoTree 重写；不表示真实模型或所有外部场景已验收。其余状态仍在改造队列。

## 能力

- Skill：cotree.ngs-analysis.plan
- Skill：cotree.ngs-analysis.demultiplex
- Skill：cotree.ngs-analysis.fastq
- Skill：cotree.ngs-analysis.bulk-counts
- Skill：cotree.ngs-analysis.differential-expression
- Skill：cotree.ngs-analysis.single-cell
- Skill：cotree.ngs-analysis.germline
- Skill：cotree.ngs-analysis.somatic
- Skill：cotree.ngs-analysis.umi
- Skill：cotree.ngs-analysis.atac
- Skill：cotree.ngs-analysis.chip-cutrun
- Skill：cotree.ngs-analysis.amplicon
- Skill：cotree.ngs-analysis.metagenomics



## 改造内容

- 18个技能按13条分析路线归并，保留完整runner、registry、schema与可视化资源。
- 29份运行资源按来源摘要适配，移除工作区隐藏.env注入并读取CoTree包身份。
- 拒绝空FASTQ，并按请求上限检查配对名；缺FastQC模块/样本ID明确拒绝，UMI标签、细胞注释与结果缺口提供证据归因及下一步。

## 使用

使用 CoTree 标准目录安装，按现有生命周期启用。通过 Skill 调用上述技能；资源由 Skill 返回的 skillDir / pluginRootDir 定位。Agent 与 MCP 名称通过原生发现接口读取。此目录没有自动安装到活动环境。需要支持 disableModelInvocation、Skill 资源路径和 MCP cwdBase 的 CoTree 构建。

## 依赖和验证边界

- Windows完成预检和合成数据验证；Nextflow/多数生信工具需Linux、macOS或WSL，具体R/Python/容器依赖与真实样本全流程未验收。
- 来源部分runner只完成准备或QC，实际分类/峰调用/变异等须核对具体产物；没有默认自动完成保证。
- 云计算、受控样本、商业拆样许可和大reference/database获取分别核对；不自动读取隐藏.env或上传私人数据。

根 plugin.json 是唯一注册清单；resources/ 保留来源资源和许可；只有根清单列出的组件会加载，其他内容不会自动执行。来源及逐组件历史见 provenance/，当前适配差异见 migration.json。包完整性验证结果不等于业务任务验证。
