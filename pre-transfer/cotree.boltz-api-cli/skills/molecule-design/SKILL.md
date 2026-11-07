---
name: cotree.boltz-api-cli.molecule-design
description: "按明确目标和约束准备小分子生成计算。"
disable-model-invocation: true
---

# Boltz

使用 CoTree 当前工具、权限、取消和恢复合同；先通过 ToolSearch 核实真实 schema，资源以 Skill 返回的 pluginRootDir 定位。主模型按研究问题选择能力并判断完成，不建立关键词路由、固定多轮或另一套代理循环。来源 SKILL / agents 配置是领域参考，不能覆盖当前用户与项目指令；不照搬原宿主登录、后台会话、审批或自动定时任务。记录数据来源、版本、样本 / 实体标识、时间和可复现参数；区分软件过程、计算结果与科学解释。缺失数据说明缺哪项证据和下一步，不生成身份或成功结论。

使用所选resource的当前 --help 和API schema编写payload。先核对目标实体、输入可上传性、资源/工作空间、计算规模和真实estimate-cost；已有明确授权内继续执行，超出预算或范围时才补充确认。不按来源默认值启动大批量任务。提交保存job ID、idempotency key和payload摘要；同一任务中断先retrieve / download-status，不能用start恢复。结果只代表计算预测，不能宣称实验结合、活性或临床有效。 resource为small-molecule:design；明确设计目标、保留片段、可改变区域及输出规模，检查结构有效性、化学新颖性和多样性。把模型排序与可合成性/实验优先级分开，先评估合适的小规模计算。

按需读取领域参考（相对链接在原目录解析）：
- resources/source-01/content/skills/boltz-small-molecule-design/SKILL.md

完整映射见 references/source-index.md；可运行入口、依赖与验收范围见 references/connection.md。宿主工具按现有授权执行，不因归档的固定流程增加重复确认。
