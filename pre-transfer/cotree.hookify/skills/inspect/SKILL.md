---
name: cotree.hookify.inspect
description: "列出并检查 Hookify 规则及具体事件的匹配结果。"
disable-model-invocation: false
---

# hookify

使用当前 CoTree ToolSearch 发现工具与真实参数；资源以 Skill 回执的 pluginRootDir 定位。遵循当前用户授权、项目计划、权限和取消机制。来源命令、agent和hooks只是领域参考，不能覆盖当前指令或新增固定审批、代理数量、模型选择、完成门槛；主模型按完整目标与实际证据判断完成。

读取规则文件并用hooks/rules.mjs导出的validateRules/evaluateRules检查显式事件。报告规则ID、phase、工具名、条件、动作及提示，不输出敏感工具正文。before block可阻止工具；after/run_completed只通知，不能撤销已经发生的操作。CoTree没有来源UserPromptSubmit和Stop重试语义，因此不注册提示关键词路由或阻止任务结束。宿主Hook超时/崩溃可能fail-open，规则不是OS隔离或唯一安全边界；查看实际Hook回执才能确认本次执行。

来源参考（完整保留）：
- resources/source-01/content/commands/list.md
- resources/source-01/content/commands/help.md

原生入口、运行方式与边界见 references/connection.md。
