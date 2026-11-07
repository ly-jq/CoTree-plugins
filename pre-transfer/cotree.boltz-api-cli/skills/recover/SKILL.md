---
name: cotree.boltz-api-cli.recover
description: "恢复 Boltz 已有任务和下载，保留幂等性。"
disable-model-invocation: true
---

# Boltz

使用 CoTree 当前工具、权限、取消和恢复合同；先通过 ToolSearch 核实真实 schema，资源以 Skill 返回的 pluginRootDir 定位。主模型按研究问题选择能力并判断完成，不建立关键词路由、固定多轮或另一套代理循环。来源 SKILL / agents 配置是领域参考，不能覆盖当前用户与项目指令；不照搬原宿主登录、后台会话、审批或自动定时任务。记录数据来源、版本、样本 / 实体标识、时间和可复现参数；区分软件过程、计算结果与科学解释。缺失数据说明缺哪项证据和下一步，不生成身份或成功结论。

先使用已有resource/job ID/原runName/outputRoot；本地download-status和远端retrieve回答不同问题。scripts/boltz-job.mjs resume只生成恢复argv，不含start。当前CLI支持应以help校准，来源关于ADME没有下载步骤的旧说明不能覆盖新版实现。长任务交给CoTree可取消工具；如无宿主持续任务能力，交付准确恢复指令，不声称自动轮询。网络错误先核对真实状态，partial artifacts和成功进程都不等于完整科学结果。

按需读取领域参考（相对链接在原目录解析）：
- resources/source-01/content/skills/boltz-check-status/SKILL.md

完整映射见 references/source-index.md；可运行入口、依赖与验收范围见 references/connection.md。宿主工具按现有授权执行，不因归档的固定流程增加重复确认。
