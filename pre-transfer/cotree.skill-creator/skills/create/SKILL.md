---
name: cotree.skill-creator.create
description: "创建或迁移 CoTree Skill 及必要脚本、模板和参考资料。"
disable-model-invocation: false
---

# Skill 编写

通过 ToolSearch 读取实际 CoTree 工具 schema，遵循当前用户授权和项目约定。资源相对 Skill 回执的 pluginRootDir；不引入独立模型循环、关键词路由或另一份持久化权威。
先明确目标任务、适用边界和非显然步骤，搜索已有技能并检查内容，能更新就不复制。description 写何时有用，正文只保留改变决策的信息；长参考按需链接，资源自包含而不是引用开发机器绝对路径。
读取 references/authoring.md。独立工作区技能用 SkillManage create，给出 name、description、retrievalHints 和 content；包内技能用模板并在根 plugin.json 注册。更新先 view 获取 expectedVersion，保持他人改动。权限由实际工具控制，不能写 allowed-tools 伪装授权。
使用宿主 catalog / Skill 确认加载与资源可达，再按实际任务检查脚本或模板。新程序至少运行一次有意义的输入。写入成功与真实模型任务成功分开报告。
