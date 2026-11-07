---
name: cotree.life-science-research.expression
description: "研究组织、细胞和调控表达证据。"
disable-model-invocation: false
---

# 生命科学研究

使用 CoTree 当前工具、权限、取消和恢复合同；先通过 ToolSearch 核实真实 schema，资源以 Skill 返回的 pluginRootDir 定位。主模型按研究问题选择能力并判断完成，不建立关键词路由、固定多轮或另一套代理循环。来源 SKILL / agents 配置是领域参考，不能覆盖当前用户与项目指令；不照搬原宿主登录、后台会话、审批或自动定时任务。记录数据来源、版本、样本 / 实体标识、时间和可复现参数；区分软件过程、计算结果与科学解释。缺失数据说明缺哪项证据和下一步，不生成身份或成功结论。

选择组织 / 细胞类型、条件、技术与版本，记录 eQTL / sQTL 的效应方向和统计量。RNA、蛋白、染色质与健康参照是不同证据；细胞数不等于生物重复。cellxgene 查询先检查数据集元数据、计数层与许可，避免自动拉取整库；大文件走明确的磁盘和传输预算。

按需读取领域参考（相对链接在原目录解析）：
- resources/source-01/content/skills/gtex-eqtl-skill/SKILL.md
- resources/source-01/content/skills/eqtl-catalogue-skill/SKILL.md
- resources/source-01/content/skills/bgee-skill/SKILL.md
- resources/source-01/content/skills/human-protein-atlas-skill/SKILL.md
- resources/source-01/content/skills/cellxgene-skill/SKILL.md
- resources/source-01/content/skills/encode-skill/SKILL.md
- resources/source-01/content/skills/rnacentral-skill/SKILL.md

完整映射见 references/source-index.md；可运行入口、依赖与验收范围见 references/connection.md。宿主工具按现有授权执行，不因归档的固定流程增加重复确认。
