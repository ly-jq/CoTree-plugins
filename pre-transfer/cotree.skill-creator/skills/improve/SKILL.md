---
name: cotree.skill-creator.improve
description: "根据已观察失败修订 Skill 描述、步骤与资源，并防止覆盖并行版本。"
disable-model-invocation: false
---

# Skill 编写

通过 ToolSearch 读取实际 CoTree 工具 schema，遵循当前用户授权和项目约定。资源相对 Skill 回执的 pluginRootDir；不引入独立模型循环、关键词路由或另一份持久化权威。
先读当前 Skill、版本、真实失败输入与产物，区分说明缺陷、工具不可用和环境问题。优先做能够改变失败结果的最小修改，不累计所有历史例外为强制流程，不添加固定评分器或无界优化循环。
由 SkillManage view 获取最新版本，update 携带 expectedVersion；并行变化时重读合并。远程包用 SkillInstall diff / update，固定版本与来源审计继续保留。插件内技能修改源包并提高版本，重新校验完整性，不能改安装快照。
重跑受影响场景及必要相邻反例，对比真实产物和成本，说明改善、回归与未知项。用户授权范围完成后交付，不为了统计分数反复消耗模型。
