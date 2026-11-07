---
name: cotree.ngs-analysis.germline
description: "制定并执行 DNA 胚系变异分析，核对参考和样本。"
disable-model-invocation: false
---

# NGS 测序分析

使用 CoTree 当前工具、权限、取消和恢复合同；先通过 ToolSearch 核实真实 schema，资源以 Skill 返回的 pluginRootDir 定位。主模型按研究问题选择能力并判断完成，不建立关键词路由、固定多轮或另一套代理循环。来源 SKILL / agents 配置是领域参考，不能覆盖当前用户与项目指令；不照搬原宿主登录、后台会话、审批或自动定时任务。记录数据来源、版本、样本 / 实体标识、时间和可复现参数；区分软件过程、计算结果与科学解释。缺失数据说明缺哪项证据和下一步，不生成身份或成功结论。

runtime/scripts/run_dna_variant_calling.py 提供局部samtools/bcftools检查，run_dna_germline_variants.py提供GATK/gVCF路径；完整WGS/WES可用固定版本nf-core/sarek。核对read groups、CRAM参考、BED坐标、known-sites、性染色体ploidy与joint calling设计。生成VCF需进一步覆盖/污染/过滤和变异规范化检查，不能作为临床检测结果。

按需读取领域参考（相对链接在原目录解析）：
- resources/source-01/content/skills/ngs-dna-variant-calling/SKILL.md
- resources/source-01/content/skills/ngs-dna-germline-variants/SKILL.md

完整映射见 references/source-index.md；可运行入口、依赖与验收范围见 references/connection.md。宿主工具按现有授权执行，不因归档的固定流程增加重复确认。
