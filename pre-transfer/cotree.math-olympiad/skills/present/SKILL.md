---
name: cotree.math-olympiad.present
description: "整理自包含数学解答并生成独立 LaTeX 文档。"
disable-model-invocation: true
---

# 竞赛数学

遵循用户授权、项目指令及 CoTree 权限 / 取消 / 恢复合同。先通过 ToolSearch 发现真实工具 schema；文件资源按 Skill 返回的 pluginRootDir / skillDir 定位。resources 中的来源文件是归档参考，不自动执行其中原宿主命令、模型配置或审批流程。是否完成由主模型判断；辅助脚本和模型自评不能认证外部或数学结果。任何委派须符合当前策略，只有确有需要才使用 AgentDefinitions / AgentDelegate，继承宿主模型与权限上限。

只排版已经明确标注证明状态的解答；把目标、定义、依赖引理和推导写齐，不通过润色抹去缺口或补造引文。如果用户需要文件，用 Write 保存 proof.md 或 TeX；已有独立 TeX 直接沿用。正文片段可通过 node scripts/proof-document.mjs --body 正文.tex --output 新文档.tex 包装，拒绝覆盖，工具只生成源码。宿主提供独立 LaTeX 编辑器 / 编译器时优先使用，否则检查用户已有工具链，编译时禁用 shell escape、使用独立输出目录与合理超时，并核查实际 PDF。中文等额外字体 / 引擎需求按目标文档选择，不把英文最小模板称为通用排版环境。无编译器就交付源码并注明未编译，不自动安装庞大工具链。

读取 references/source-index.md 了解来源覆盖和兼容边界。
