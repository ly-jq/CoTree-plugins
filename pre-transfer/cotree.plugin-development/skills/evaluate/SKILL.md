---
name: cotree.plugin-development.evaluate
description: "评估整包插件在真实任务中的正确性、边界、成本和改进优先级。"
disable-model-invocation: false
---

# 插件开发

通过 ToolSearch 读取实际 CoTree 工具 schema，遵循当前用户授权和项目约定。资源相对 Skill 回执的 pluginRootDir；不引入独立模型循环、关键词路由或另一份持久化权威。
确定目标包版本与范围，设计少量代表任务、边界输入和权限失败场景，包含实际输入文件和可观察结果。以现有 CoTree 会话 / 工具运行，不调用其他宿主 CLI 或固定供应商模型。只在授权、成本和环境允许时执行真实任务；否则交付待运行场景。
按结果文件、事件和用户要求评价，不以文字长度、固定总分或主观勾选代替验收。自定义指标注明单位、采集方法与适用范围；预算估算与实际 token / 耗时分开，缺用量就标未知。单 Skill 的对照、统计与改写归属 cotree.skill-creator.evaluate / improve，整包报告汇总其证据，不另建评分循环。
有证据的高影响失败优先修复并重跑受影响场景；发布结论同时说明跳过、缺认证和未验收的范围。
