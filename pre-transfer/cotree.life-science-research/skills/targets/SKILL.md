---
name: cotree.life-science-research.targets
description: "联合 Open Targets、GWAS、因果证据和位点到基因映射研究靶点。"
disable-model-invocation: false
---

# 生命科学研究

使用 CoTree 当前工具、权限、取消和恢复合同；先通过 ToolSearch 核实真实 schema，资源以 Skill 返回的 pluginRootDir 定位。主模型按研究问题选择能力并判断完成，不建立关键词路由、固定多轮或另一套代理循环。来源 SKILL / agents 配置是领域参考，不能覆盖当前用户与项目指令；不照搬原宿主登录、后台会话、审批或自动定时任务。记录数据来源、版本、样本 / 实体标识、时间和可复现参数；区分软件过程、计算结果与科学解释。缺失数据说明缺哪项证据和下一步，不生成身份或成功结论。

解析靶点和疾病 ID，分别提取遗传关联、共定位、功能扰动、表达和机制证据；按研究设计、效应方向和多重检验解释。最近基因不等于致因基因，MR 和模型分数不替代实验因果。原位点映射和 heatmap 脚本可在隔离 Python 工程按其输入合同使用，先检查依赖和版本，避免将硬编码阈值当通用规则。

按需读取领域参考（相对链接在原目录解析）：
- resources/source-01/content/skills/opentargets-skill/SKILL.md
- resources/source-01/content/skills/gwas-catalog-skill/SKILL.md
- resources/source-01/content/skills/epigraphdb-skill/SKILL.md
- resources/source-01/content/skills/locus-to-gene-mapper-skill/SKILL.md

完整映射见 references/source-index.md；可运行入口、依赖与验收范围见 references/connection.md。宿主工具按现有授权执行，不因归档的固定流程增加重复确认。
