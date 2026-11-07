---
name: cotree.life-science-research.literature
description: "使用 NCBI 与预印本数据库检索可追溯的研究文献。"
disable-model-invocation: false
---

# 生命科学研究

使用 CoTree 当前工具、权限、取消和恢复合同；先通过 ToolSearch 核实真实 schema，资源以 Skill 返回的 pluginRootDir 定位。主模型按研究问题选择能力并判断完成，不建立关键词路由、固定多轮或另一套代理循环。来源 SKILL / agents 配置是领域参考，不能覆盖当前用户与项目指令；不照搬原宿主登录、后台会话、审批或自动定时任务。记录数据来源、版本、样本 / 实体标识、时间和可复现参数；区分软件过程、计算结果与科学解释。缺失数据说明缺哪项证据和下一步，不生成身份或成功结论。

构造明确检索式、时间范围与分页，记录PMID/PMCID/DOI并按身份去重；摘要、全文与补充数据分别读取。区分预印本和同行评审，核实更正 / 撤稿及研究设计。NCBI email/tool标识、速率限制与可选API key按官方规则配置；保存用户需要的引用与摘要，不自动整库下载或复制全文。

按需读取领域参考（相对链接在原目录解析）：
- resources/source-01/content/skills/ncbi-entrez-skill/SKILL.md
- resources/source-01/content/skills/ncbi-pmc-skill/SKILL.md
- resources/source-01/content/skills/biorxiv-skill/SKILL.md

完整映射见 references/source-index.md；可运行入口、依赖与验收范围见 references/connection.md。宿主工具按现有授权执行，不因归档的固定流程增加重复确认。
