---
name: cotree.life-science-research.chemistry
description: "综合化合物、靶点结合、代谢物与药理注释。"
disable-model-invocation: false
---

# 生命科学研究

使用 CoTree 当前工具、权限、取消和恢复合同；先通过 ToolSearch 核实真实 schema，资源以 Skill 返回的 pluginRootDir 定位。主模型按研究问题选择能力并判断完成，不建立关键词路由、固定多轮或另一套代理循环。来源 SKILL / agents 配置是领域参考，不能覆盖当前用户与项目指令；不照搬原宿主登录、后台会话、审批或自动定时任务。记录数据来源、版本、样本 / 实体标识、时间和可复现参数；区分软件过程、计算结果与科学解释。缺失数据说明缺哪项证据和下一步，不生成身份或成功结论。

核对结构、盐型、立体化学、InChIKey / CID 与测定条件。Ki/Kd/IC50/EC50 不能不加转换地混排；保留单位、限定符、细胞或生化体系和来源。PharmGKB / HMDB 的访问条款及许可按实际接口核实；参考数据不是用药或毒理结论。新分子预测 / 筛选由 Boltz 处理，本包保留实测与数据库证据。

按需读取领域参考（相对链接在原目录解析）：
- resources/source-01/content/skills/bindingdb-skill/SKILL.md
- resources/source-01/content/skills/chembl-skill/SKILL.md
- resources/source-01/content/skills/pubchem-pug-skill/SKILL.md
- resources/source-01/content/skills/chebi-skill/SKILL.md
- resources/source-01/content/skills/pharmgkb-skill/SKILL.md
- resources/source-01/content/skills/hmdb-skill/SKILL.md

完整映射见 references/source-index.md；可运行入口、依赖与验收范围见 references/connection.md。宿主工具按现有授权执行，不因归档的固定流程增加重复确认。
