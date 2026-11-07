---
name: cotree.life-science-research.proteins
description: "检索 UniProt、PDB 与 AlphaFold 的蛋白及结构证据。"
disable-model-invocation: false
---

# 生命科学研究

使用 CoTree 当前工具、权限、取消和恢复合同；先通过 ToolSearch 核实真实 schema，资源以 Skill 返回的 pluginRootDir 定位。主模型按研究问题选择能力并判断完成，不建立关键词路由、固定多轮或另一套代理循环。来源 SKILL / agents 配置是领域参考，不能覆盖当前用户与项目指令；不照搬原宿主登录、后台会话、审批或自动定时任务。记录数据来源、版本、样本 / 实体标识、时间和可复现参数；区分软件过程、计算结果与科学解释。缺失数据说明缺哪项证据和下一步，不生成身份或成功结论。

按 accession、物种和 isoform 确认序列、链与残基编号。用公共读取器查询 UniProt / PDB 单条记录，结构下载按来源文档。区分实验方法 / 分辨率与预测的 pLDDT / PAE；低置信区域、缺失残基、配体和 biological assembly 单列。结构相似或高置信不直接证明结合、活性或药效；需要新预测时交给 Boltz 对应能力。

按需读取领域参考（相对链接在原目录解析）：
- resources/source-01/content/skills/uniprot-skill/SKILL.md
- resources/source-01/content/skills/rcsb-pdb-skill/SKILL.md
- resources/source-01/content/skills/alphafold-skill/SKILL.md

完整映射见 references/source-index.md；可运行入口、依赖与验收范围见 references/connection.md。宿主工具按现有授权执行，不因归档的固定流程增加重复确认。
