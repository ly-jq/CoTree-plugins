---
name: cotree.life-science-research.datasets
description: "发现公共序列、表达、蛋白质组、代谢组和微生物研究数据。"
disable-model-invocation: false
---

# 生命科学研究

使用 CoTree 当前工具、权限、取消和恢复合同；先通过 ToolSearch 核实真实 schema，资源以 Skill 返回的 pluginRootDir 定位。主模型按研究问题选择能力并判断完成，不建立关键词路由、固定多轮或另一套代理循环。来源 SKILL / agents 配置是领域参考，不能覆盖当前用户与项目指令；不照搬原宿主登录、后台会话、审批或自动定时任务。记录数据来源、版本、样本 / 实体标识、时间和可复现参数；区分软件过程、计算结果与科学解释。缺失数据说明缺哪项证据和下一步，不生成身份或成功结论。

先查accession、实验设计、格式、大小、许可和关联文献，再决定获取范围。BLAST提交会向远端发送序列，确认数据可发送及当前任务授权后提交；记录RID并有界等待，恢复查询使用已有RID。NCBI Datasets可能依赖独立CLI；元数据检索和数据下载分别处理。原脚本的save_raw输出只用明确新路径，压缩包先检查路径和体积。测序分析交给NGS工作流，下载成功不等于数据可用。

按需读取领域参考（相对链接在原目录解析）：
- resources/source-01/content/skills/biostudies-arrayexpress-skill/SKILL.md
- resources/source-01/content/skills/ncbi-datasets-skill/SKILL.md
- resources/source-01/content/skills/ncbi-blast-skill/SKILL.md
- resources/source-01/content/skills/pride-skill/SKILL.md
- resources/source-01/content/skills/proteomexchange-skill/SKILL.md
- resources/source-01/content/skills/metabolights-skill/SKILL.md
- resources/source-01/content/skills/mgnify-skill/SKILL.md

完整映射见 references/source-index.md；可运行入口、依赖与验收范围见 references/connection.md。宿主工具按现有授权执行，不因归档的固定流程增加重复确认。
