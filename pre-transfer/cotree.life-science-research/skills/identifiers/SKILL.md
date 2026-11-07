---
name: cotree.life-science-research.identifiers
description: "解析基因、物种与表型本体标识，保留坐标版本。"
disable-model-invocation: false
---

# 生命科学研究

使用 CoTree 当前工具、权限、取消和恢复合同；先通过 ToolSearch 核实真实 schema，资源以 Skill 返回的 pluginRootDir 定位。主模型按研究问题选择能力并判断完成，不建立关键词路由、固定多轮或另一套代理循环。来源 SKILL / agents 配置是领域参考，不能覆盖当前用户与项目指令；不照搬原宿主登录、后台会话、审批或自动定时任务。记录数据来源、版本、样本 / 实体标识、时间和可复现参数；区分软件过程、计算结果与科学解释。缺失数据说明缺哪项证据和下一步，不生成身份或成功结论。

先用实体查询区分符号、稳定 ID、转录本、物种和本体，记录查询与返回身份。基因位置必须携带 GRCh37 / GRCh38 或对应物种 assembly、染色体、方向及坐标基准；不要把同名符号当唯一身份。公共单条 Ensembl 元数据可用 scripts/public-research.mjs；映射不一致时明确候选和缺失信息。

按需读取领域参考（相对链接在原目录解析）：
- resources/source-01/content/skills/ensembl-skill/SKILL.md
- resources/source-01/content/skills/ncbi-clinicaltables-skill/SKILL.md
- resources/source-01/content/skills/efo-ontology-skill/SKILL.md

完整映射见 references/source-index.md；可运行入口、依赖与验收范围见 references/connection.md。宿主工具按现有授权执行，不因归档的固定流程增加重复确认。
