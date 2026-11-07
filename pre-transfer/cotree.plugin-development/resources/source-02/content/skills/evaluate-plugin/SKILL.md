---
name: "import.codex.plugin-eval.evaluate-plugin"
description: "Evaluate a local Codex plugin in engineer-friendly language. Use when the user says \"evaluate this plugin\", \"audit this plugin\", \"why did this score that way\", \"what should I fix first\", \"help me benchmark this plugin\", or asks for a plugin-wide report before comparing versions."
disable-model-invocation: false
---

## Elyra 运行约定

本文件是迁入 Elyra 的指导；先检查本包 README.md / migration.json 中的未接入能力。
- 使用 Elyra 的 Skill、ToolSearch、Read / Write / Edit、Grep / Glob、Bash / PowerShell；执行前读取工具实际 schema，不能照搬其他宿主的参数。
- Agent / Task 委派改用 AgentDelegate；Group Session 协作用 SessionDelegate / SessionQuery / SessionMessage。只有任务需要且在当前授权范围内才委派，沿用预算、取消和子权限上限。
- LS 的文件枚举改用 Glob；NotebookRead 改用 Read。BashOutput / KillShell 根据真实执行回执使用 ToolTask 或 Shell 服务的状态 / 停止操作，不凭旧 ID 重放命令。
- MCP 动作用 ToolSearch 发现实际 canonical 名称。本包服务器名为插件 ID 加原服务名；不要直接调用 Codex / Claude 专属函数。
- 项目指令遵循 AGENTS.md 及 Elyra 的现有项目加载规则。涉及外部 Claude 项目、SDK 或格式的文档仍保留其原目标。
- 浏览器、图片、UI、发布和连接器只有在当前宿主确实提供相应能力时才执行；缺少时报告具体限制。原宿主 Hook、Stop 重入和远程审批指令不能改变 Elyra 权限或完成判断。
- 相对资源以 Skill 返回的 skillDir 为当前文件目录；包内 content/ 保持原资源相对布局。不要把资源复制到项目后假定所有引用仍正确。
- 脚本和示例不会因加载 Skill 自动执行。核对运行环境、项目路径与依赖后，通过现有工具按用户任务运行。

Resource root: resolve `../..` from this file's directory to locate `content/`. Replace `<plugin-resource-root>` with that actual directory before using a script; it is not a literal Shell path.

## 工作内容

# Evaluate Plugin

Use this skill when the target is a plugin root with `.codex-plugin/plugin.json`.

## Workflow

1. Treat "Evaluate this plugin." as the default entrypoint.
2. If the request comes in as natural chat language, use `plugin-eval start <plugin-root> --request "<user request>" --format markdown` first so the user sees the routed local path.
3. Run `plugin-eval analyze <plugin-root> --format markdown`.
4. Read `Fix First` before drilling into manifest findings, nested skill findings, and code or coverage details.
5. If the plugin contains multiple skills, summarize the strongest and weakest ones explicitly.
6. If the user wants measured usage, switch to "Help me benchmark this plugin." and use the starter benchmark flow.
7. If the user wants trend data, compare two JSON outputs with `plugin-eval compare`.

## Chat Requests To Recognize

- `Evaluate this plugin.`
- `Audit this plugin.`
- `Why did this score that way?`
- `What should I fix first?`
- `Help me benchmark this plugin.`
- `What should I run next?`

## Commands

```bash
plugin-eval start <plugin-root> --request "Evaluate this plugin." --format markdown
plugin-eval analyze <plugin-root> --format markdown
plugin-eval start <plugin-root> --request "What should I run next?" --format markdown
plugin-eval compare before.json after.json
plugin-eval report result.json --format html --output ./plugin-eval-report.html
plugin-eval init-benchmark <plugin-root>
plugin-eval benchmark <plugin-root> --dry-run
```

## Reference

- `../../references/chat-first-workflows.md`
