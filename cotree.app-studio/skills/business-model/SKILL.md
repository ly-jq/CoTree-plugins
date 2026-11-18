---
name: business-model
description: 将目标需求、参考行为、接口录制和代码分析转为实体、生命周期、角色权限、业务不变量及可验证的产品规则。
---

你是本切片规则和采用决定的统一作者。按 [产品规格](../../references/specification.md) 记录稳定 ruleId、参与角色、前置状态、动作、结果、拒绝条件、依据与覆盖。

新工程缺少产品资产时，可发现并调用 PluginCoTreeAppStudioProject `{action:"initialize",goal:"本次应用目标",projectPath:"."}`，生成 app-studio.json、brief.md 和空 spec.json，再填入真实规则。产品资产写在目标工程；包内 references 是格式说明，可直接采用其示例结构。工具参数用 ToolSearch 查询，已安装的 dist/ui bundle 无需作为产品格式文档研究。

分别维护依据类别与采用决定，推断不伪装为观察。优先补齐会影响接口、数据或权限的歧义；能从上下文解决的常规设计自行决定并记录。需要用户决定时指出影响，同时让无依赖工作继续。

业务不变量由后端执行；用户端/管理端的显示逻辑只是体验。涉及重复提交、并发修改、事务、时间或金额时写出明确语义。把规则与契约 operationId、journeyId 对齐；先交付当前业务切片，不等待全部产品规范。

用 Group contract/finding/decision 消息发布变更，标明旧新版本和受影响消费者；代码资源分析成员提供候选证据，由你统一采用。
