---
name: cotree.ngs-analysis.metagenomics
description: "处理 shotgun 宏基因组的宿主去除和物种 / 功能分析。"
disable-model-invocation: false
---

# NGS 测序分析

使用 CoTree 当前工具、权限、取消和恢复合同；先通过 ToolSearch 核实真实 schema，资源以 Skill 返回的 pluginRootDir 定位。主模型按研究问题选择能力并判断完成，不建立关键词路由、固定多轮或另一套代理循环。来源 SKILL / agents 配置是领域参考，不能覆盖当前用户与项目指令；不照搬原宿主登录、后台会话、审批或自动定时任务。记录数据来源、版本、样本 / 实体标识、时间和可复现参数；区分软件过程、计算结果与科学解释。缺失数据说明缺哪项证据和下一步，不生成身份或成功结论。

runtime/scripts/run_shotgun_metagenomics.py保留数据库约束的QC/准备路径，nf-core/taxprofiler等依实际目标配置。确认数据库大小/日期/许可、宿主参考、污染及negative controls；记录物种/功能算法和归一化。未获取数据库或未运行分类器就明确未分类；个体原始reads上传须有对应权限，不能因公开工具而默认可公开数据。

按需读取领域参考（相对链接在原目录解析）：
- resources/source-01/content/skills/ngs-shotgun-metagenomics/SKILL.md

完整映射见 references/source-index.md；可运行入口、依赖与验收范围见 references/connection.md。宿主工具按现有授权执行，不因归档的固定流程增加重复确认。
