---
name: cotree.skill-creator.evaluate
description: "用真实场景比较 Skill 的任务效果、选择准确度和实际用量。"
disable-model-invocation: false
---

# Skill 编写

通过 ToolSearch 读取实际 CoTree 工具 schema，遵循当前用户授权和项目约定。资源相对 Skill 回执的 pluginRootDir；不引入独立模型循环、关键词路由或另一份持久化权威。
把典型请求、相近但不适用请求、边界输入列为场景，定义可观察结果与原始输入。正反例评估 Skill 的选择，不编写关键词触发路由。版本对照保持同一任务、模型与权限；没有运行授权、账户或预算的场景记录 not-run 和原因。
用现有会话 / 工具执行，按产物或可复现检查记录结果，客观检查用脚本，主观质量说明判断依据。不要将期待答案先交给评估者；适合独立验证且允许委派时才使用宿主协作。记录实际事件的 token / elapsedMs，没有数据就省略，不用字符数冒充 token。
按 templates/results.json 的结构填真实结果，用 scripts/summarize.mjs <输入JSON> 汇总。输出运行数、失败 / 未运行、已测用量、均值和方差；检查全通过也只说明已测场景，不构成外部业务证书。
