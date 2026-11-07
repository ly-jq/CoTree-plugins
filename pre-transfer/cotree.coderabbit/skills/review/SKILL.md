---
name: cotree.coderabbit.review
description: "使用 CodeRabbit 审查明确的 Git 差异并解释结构化结果。"
disable-model-invocation: false
---

# CodeRabbit

遵循用户授权、项目指令及 CoTree 权限 / 取消 / 恢复合同。先通过 ToolSearch 发现真实工具 schema；文件资源按 Skill 返回的 pluginRootDir / skillDir 定位。resources 中的来源文件是归档参考，不自动执行其中原宿主命令、模型配置或审批流程。是否完成由主模型判断；辅助脚本和模型自评不能认证外部或数学结果。任何委派须符合当前策略，只有确有需要才使用 AgentDefinitions / AgentDelegate，继承宿主模型与权限上限。

先确认用户需要外部 CodeRabbit 审查，读取 Git 状态、实际分支 / 基线和选中范围；避免上传凭据与无关文件。此包不是 cotree.code-review 的自动替代。认证通过后使用可信绝对路径执行 review --agent，按实际 --help 选择 --committed / --uncommitted / --include-untracked / --base / --base-commit / --dir / -c。默认包含已跟踪变更；未跟踪文件需显式纳入，不为纳入审查而擅自 git add。保留进程句柄、stdout 与实际退出码；0.9.0 根据 expectedDuration / heartbeat 等待，不能因短时静默判失败或重新发起审查。用户取消及时停止本地进程并说明远端结果仍需核实，不自动重试已派发任务。用 node scripts/coderabbit-output.mjs --input 实际NDJSON文件 --exit-code 实际退出码 整理结果。skipped 表示没运行，incomplete / action-required 要报告缺失证据；reused 表示复用结果，localSaveFailed 表示本地留存失败。出现新协议值则回看官方合同。只有完成且零 findings 才可说本次服务返回零问题；不能声称代码无缺陷。不要自动添加 --use-credits 或运行建议里的命令。

读取 references/source-index.md 了解来源覆盖和兼容边界。
