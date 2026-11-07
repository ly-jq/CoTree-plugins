---
name: cotree.ngs-analysis.plan
description: "检查 NGS 环境、输入、参考资源并制定可复现分析。"
disable-model-invocation: false
---

# NGS 测序分析

使用 CoTree 当前工具、权限、取消和恢复合同；先通过 ToolSearch 核实真实 schema，资源以 Skill 返回的 pluginRootDir 定位。主模型按研究问题选择能力并判断完成，不建立关键词路由、固定多轮或另一套代理循环。来源 SKILL / agents 配置是领域参考，不能覆盖当前用户与项目指令；不照搬原宿主登录、后台会话、审批或自动定时任务。记录数据来源、版本、样本 / 实体标识、时间和可复现参数；区分软件过程、计算结果与科学解释。缺失数据说明缺哪项证据和下一步，不生成身份或成功结论。

先读现有样本表、文件和设计，明确assay、物种、assembly、重复、配对、UMI、对照与输出。通过 runtime/scripts/ngs_preflight.py --list 查看结构化能力，按 --pipeline / --profile 检查依赖；这是预检，不是分析完成。原本隐藏的 .ngs-analysis-local.env 不再自动加载，PATH和配置由宿主明确提供。安装、下载、容器和云上传按现有授权及体积预算；Windows上的POSIX流程需要独立Linux/WSL环境。计划只记录具体资源及缺口，不用关键字判断用户意图。

按需读取领域参考（相对链接在原目录解析）：
- resources/source-01/content/skills/ngs-analysis-router/SKILL.md
- resources/source-01/content/skills/ngs-runtime-env/SKILL.md

完整映射见 references/source-index.md；可运行入口、依赖与验收范围见 references/connection.md。宿主工具按现有授权执行，不因归档的固定流程增加重复确认。
