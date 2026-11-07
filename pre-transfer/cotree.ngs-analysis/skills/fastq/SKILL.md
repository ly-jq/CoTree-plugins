---
name: cotree.ngs-analysis.fastq
description: "校验 FASTQ 配对并运行 QC、必要修剪和 MultiQC。"
disable-model-invocation: false
---

# NGS 测序分析

使用 CoTree 当前工具、权限、取消和恢复合同；先通过 ToolSearch 核实真实 schema，资源以 Skill 返回的 pluginRootDir 定位。主模型按研究问题选择能力并判断完成，不建立关键词路由、固定多轮或另一套代理循环。来源 SKILL / agents 配置是领域参考，不能覆盖当前用户与项目指令；不照搬原宿主登录、后台会话、审批或自动定时任务。记录数据来源、版本、样本 / 实体标识、时间和可复现参数；区分软件过程、计算结果与科学解释。缺失数据说明缺哪项证据和下一步，不生成身份或成功结论。

runtime/scripts/run_fastq_qc.py 支持 --r1 / --r2 或 --sample-sheet，以及全新的 --outdir。只准备时加 --no-dry-run；抽样 --quick-validation --pair-check-reads N 不能证明全文件有效。执行须明确 --execute 且工具可用，记录FastQC/MultiQC、修剪前后和真实产物。缺适配器证据不自动修剪；不把进程0、预检或缺失报告称为QC通过。

按需读取领域参考（相对链接在原目录解析）：
- resources/source-01/content/skills/ngs-fastq-qc/SKILL.md

完整映射见 references/source-index.md；可运行入口、依赖与验收范围见 references/connection.md。宿主工具按现有授权执行，不因归档的固定流程增加重复确认。
