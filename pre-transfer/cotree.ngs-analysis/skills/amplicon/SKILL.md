---
name: cotree.ngs-analysis.amplicon
description: "处理扩增子引物、去噪、分类和多样性分析。"
disable-model-invocation: false
---

# NGS 测序分析

使用 CoTree 当前工具、权限、取消和恢复合同；先通过 ToolSearch 核实真实 schema，资源以 Skill 返回的 pluginRootDir 定位。主模型按研究问题选择能力并判断完成，不建立关键词路由、固定多轮或另一套代理循环。来源 SKILL / agents 配置是领域参考，不能覆盖当前用户与项目指令；不照搬原宿主登录、后台会话、审批或自动定时任务。记录数据来源、版本、样本 / 实体标识、时间和可复现参数；区分软件过程、计算结果与科学解释。缺失数据说明缺哪项证据和下一步，不生成身份或成功结论。

runtime/scripts/run_amplicon_microbiome.py保留QC/准备封装，nf-core/ampliseq或QIIME2/DADA2完成目标分析。确认标记区域、引物方向、读长与截断、阴性对照、taxonomy数据库和训练区域。ASV/OTU、相对丰度和测序深度不同；未装后端时交付明确准备状态，不能把FASTQ QC当作分类或多样性结果。

按需读取领域参考（相对链接在原目录解析）：
- resources/source-01/content/skills/ngs-amplicon-microbiome/SKILL.md

完整映射见 references/source-index.md；可运行入口、依赖与验收范围见 references/connection.md。宿主工具按现有授权执行，不因归档的固定流程增加重复确认。
