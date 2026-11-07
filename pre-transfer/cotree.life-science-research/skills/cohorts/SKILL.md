---
name: cotree.life-science-research.cohorts
description: "查询多队列 PheWAS 与基因负担证据并比较复现性。"
disable-model-invocation: false
---

# 生命科学研究

使用 CoTree 当前工具、权限、取消和恢复合同；先通过 ToolSearch 核实真实 schema，资源以 Skill 返回的 pluginRootDir 定位。主模型按研究问题选择能力并判断完成，不建立关键词路由、固定多轮或另一套代理循环。来源 SKILL / agents 配置是领域参考，不能覆盖当前用户与项目指令；不照搬原宿主登录、后台会话、审批或自动定时任务。记录数据来源、版本、样本 / 实体标识、时间和可复现参数；区分软件过程、计算结果与科学解释。缺失数据说明缺哪项证据和下一步，不生成身份或成功结论。

先确认各队列要求的坐标版本和表型编码；调用目录内 variant_resolution.py 时保留原始输入及转换依据。区分单变异和基因 burden、样本量、祖源、表型定义、效应等位基因及多重校正。跨队列同向不表示独立样本；受控个体数据须独立准入，公开聚合结果不赋予个体数据权限。

按需读取领域参考（相对链接在原目录解析）：
- resources/source-01/content/skills/genebass-gene-burden-skill/SKILL.md
- resources/source-01/content/skills/finngen-phewas-skill/SKILL.md
- resources/source-01/content/skills/ukb-topmed-phewas-skill/SKILL.md
- resources/source-01/content/skills/biobankjapan-phewas-skill/SKILL.md
- resources/source-01/content/skills/tpmi-phewas-skill/SKILL.md

完整映射见 references/source-index.md；可运行入口、依赖与验收范围见 references/connection.md。宿主工具按现有授权执行，不因归档的固定流程增加重复确认。
