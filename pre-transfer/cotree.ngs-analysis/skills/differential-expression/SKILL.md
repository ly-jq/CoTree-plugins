---
name: cotree.ngs-analysis.differential-expression
description: "核对实验设计并执行 bulk RNA-seq 差异表达。"
disable-model-invocation: false
---

# NGS 测序分析

使用 CoTree 当前工具、权限、取消和恢复合同；先通过 ToolSearch 核实真实 schema，资源以 Skill 返回的 pluginRootDir 定位。主模型按研究问题选择能力并判断完成，不建立关键词路由、固定多轮或另一套代理循环。来源 SKILL / agents 配置是领域参考，不能覆盖当前用户与项目指令；不照搬原宿主登录、后台会话、审批或自动定时任务。记录数据来源、版本、样本 / 实体标识、时间和可复现参数；区分软件过程、计算结果与科学解释。缺失数据说明缺哪项证据和下一步，不生成身份或成功结论。

runtime/scripts/run_bulk_rnaseq_de.py 保留DESeq2/edgeR/limma实现。先检验计数类型、样本匹配、重复、design/contrast、批次和可识别性；混杂设计不能靠增加协变量自动解决。主模型结合实际实验选择方法，检查源码自动选择是否适用，再核对当前help参数。报告效应大小、FDR、低计数处理、QC图与方法，不以显著性替代生物意义。

按需读取领域参考（相对链接在原目录解析）：
- resources/source-01/content/skills/ngs-bulk-rnaseq-differential-expression/SKILL.md

完整映射见 references/source-index.md；可运行入口、依赖与验收范围见 references/connection.md。宿主工具按现有授权执行，不因归档的固定流程增加重复确认。
