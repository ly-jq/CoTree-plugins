---
name: cotree.ngs-analysis.single-cell
description: "执行单细胞计数、矩阵 QC、聚类及带证据的注释。"
disable-model-invocation: false
---

# NGS 测序分析

使用 CoTree 当前工具、权限、取消和恢复合同；先通过 ToolSearch 核实真实 schema，资源以 Skill 返回的 pluginRootDir 定位。主模型按研究问题选择能力并判断完成，不建立关键词路由、固定多轮或另一套代理循环。来源 SKILL / agents 配置是领域参考，不能覆盖当前用户与项目指令；不照搬原宿主登录、后台会话、审批或自动定时任务。记录数据来源、版本、样本 / 实体标识、时间和可复现参数；区分软件过程、计算结果与科学解释。缺失数据说明缺哪项证据和下一步，不生成身份或成功结论。

FASTQ入口runtime/scripts/run_scrnaseq_fastq_to_count.py，后计数入口run_scrnaseq_post_count_qc.py。核对建库化学、barcode whitelist、UMI长度、物种、基因层和批次；保留doublet、ambient RNA、过滤阈值和实际检测证据。来源PBMC marker回退不适用于所有组织；没有匹配marker或doublet结果时记录缺失原因并使用合适参照。UMAP位置不能单独确定身份或轨迹。

按需读取领域参考（相对链接在原目录解析）：
- resources/source-01/content/skills/ngs-scrna-seq/SKILL.md
- resources/source-01/content/skills/scrna-seq-qc/SKILL.md

完整映射见 references/source-index.md；可运行入口、依赖与验收范围见 references/connection.md。宿主工具按现有授权执行，不因归档的固定流程增加重复确认。
