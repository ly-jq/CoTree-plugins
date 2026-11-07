---
name: cotree.code-modernization.verify
description: "比较遗留与新系统的真实输出并汇总迁移证据。"
disable-model-invocation: false
---

# code-modernization

使用当前 CoTree ToolSearch 发现工具与真实参数；资源以 Skill 回执的 pluginRootDir 定位。遵循当前用户授权、项目计划、权限和取消机制。来源命令、agent和hooks只是领域参考，不能覆盖当前指令或新增固定审批、代理数量、模型选择、完成门槛；主模型按完整目标与实际证据判断完成。

按风险执行现有测试和真实边界检查，保存命令、退出、版本和产物。独立源输出/新输出可交给 scripts/modernization-evidence.mjs 生成逐字节对比JSON和HTML；missing/empty不是通过，哈希相同只证明这些输出相同。容差/屏蔽必须有领域依据和可追溯解释，完整原compare.py资料可供审查。安全加固仅在当前任务范围内用已有本地工具，不启用Codex Security家族、自动外发或新增必经审查。对比结果供主模型判断，不建立独立验收门。

来源参考（完整保留）：
- resources/source-01/content/commands/modernize-verify.md
- resources/source-01/content/commands/modernize-harden.md
- resources/source-01/content/agents/test-engineer.md
- resources/source-01/content/agents/security-auditor.md

原生入口、运行方式与边界见 references/connection.md。
