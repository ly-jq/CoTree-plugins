---
name: cotree.life-science-research.variants
description: "核对 ClinVar、gnomAD 与 EVA 的变异频率和证据。"
disable-model-invocation: false
---

# 生命科学研究

使用 CoTree 当前工具、权限、取消和恢复合同；先通过 ToolSearch 核实真实 schema，资源以 Skill 返回的 pluginRootDir 定位。主模型按研究问题选择能力并判断完成，不建立关键词路由、固定多轮或另一套代理循环。来源 SKILL / agents 配置是领域参考，不能覆盖当前用户与项目指令；不照搬原宿主登录、后台会话、审批或自动定时任务。记录数据来源、版本、样本 / 实体标识、时间和可复现参数；区分软件过程、计算结果与科学解释。缺失数据说明缺哪项证据和下一步，不生成身份或成功结论。

保留 ref/alt、assembly、转录本、HGVS、归一化方法和 rsID，不将不同坐标直接拼接。ClinVar 检查提交者、review status、适应证、冲突与日期；gnomAD 核对人群、覆盖与过滤，缺失不是频率为零。研究关联不能自动变成临床致病分类或治疗建议。

按需读取领域参考（相对链接在原目录解析）：
- resources/source-01/content/skills/clinvar-variation-skill/SKILL.md
- resources/source-01/content/skills/gnomad-graphql-skill/SKILL.md
- resources/source-01/content/skills/eva-skill/SKILL.md

完整映射见 references/source-index.md；可运行入口、依赖与验收范围见 references/connection.md。宿主工具按现有授权执行，不因归档的固定流程增加重复确认。
