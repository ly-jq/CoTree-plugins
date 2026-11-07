---
name: cotree.ngs-analysis.demultiplex
description: "校验 BCL 样本表、索引与拆样配置并分析 demux 指标。"
disable-model-invocation: false
---

# NGS 测序分析

使用 CoTree 当前工具、权限、取消和恢复合同；先通过 ToolSearch 核实真实 schema，资源以 Skill 返回的 pluginRootDir 定位。主模型按研究问题选择能力并判断完成，不建立关键词路由、固定多轮或另一套代理循环。来源 SKILL / agents 配置是领域参考，不能覆盖当前用户与项目指令；不照搬原宿主登录、后台会话、审批或自动定时任务。记录数据来源、版本、样本 / 实体标识、时间和可复现参数；区分软件过程、计算结果与科学解释。缺失数据说明缺哪项证据和下一步，不生成身份或成功结论。

核对RunInfo、SampleSheet版本、lane、index方向、允许mismatch与UMI布局，保持样本真实ID。runtime/scripts/run_bcl_to_fastq.py 保留拆样封装；bcl-convert / bcl2fastq安装与许可单独核实。先检查当前help与输出目录，非执行计划可能仍探测工具版本。读回拆样率、Q30、undetermined与未知barcode来源；缺SampleID必须报错，不能合并成匿名样本。

按需读取领域参考（相对链接在原目录解析）：
- resources/source-01/content/skills/ngs-bcl-to-fastq/SKILL.md

完整映射见 references/source-index.md；可运行入口、依赖与验收范围见 references/connection.md。宿主工具按现有授权执行，不因归档的固定流程增加重复确认。
