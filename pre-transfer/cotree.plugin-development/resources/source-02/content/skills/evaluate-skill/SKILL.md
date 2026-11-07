---
name: "import.codex.plugin-eval.evaluate-skill"
description: "Evaluate a local Codex skill in engineer-friendly terms. Use when the user says \"evaluate this skill\", \"give me an analysis of the game dev skill\", \"audit this skill\", \"why did this score that way\", \"what should I fix first\", or asks for a skill-specific report before benchmarking it."
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

# Evaluate Skill

Use this skill when the target is a local skill directory or `SKILL.md` file.

## Workflow

1. Treat "Evaluate this skill." as the default entrypoint.
2. If the user names a skill instead of giving a path, resolve it locally first, preferring `~/.codex/skills/<skill-name>` and then repo-local `skills/<skill-name>`.
3. If the user says the request in natural language first, use `plugin-eval start <skill-path> --request "<user request>" --format markdown` to show the routed path clearly.
4. Run `plugin-eval analyze <skill-path> --format markdown`.
5. Review `At a Glance`, `Why It Matters`, `Fix First`, and `Recommended Next Step` before drilling into details.
6. Explain which findings are structural, which are budget-related, and which are code-related.
7. If the user asks for an "analysis" of the skill, do not stop at the report. Also run `plugin-eval init-benchmark <skill-path>` and show the setup questions for refining the starter scenarios in `.plugin-eval/benchmark.json`.
8. If the user wants real usage numbers, switch to "Measure the real token usage of this skill." and run the benchmark flow.
9. After observed usage is available, use `plugin-eval measurement-plan <skill-path> --observed-usage <usage.jsonl> --format markdown` to recommend what to instrument or improve next.
10. If the user wants a rewrite plan, route to `../improve-skill/SKILL.md`.

## Skill-Specific Priorities

- frontmatter validity
- `name` and `description` quality
- progressive disclosure and reference usage
- broken relative links
- oversized `SKILL.md` or descriptions
- helper script quality for TypeScript and Python files

## Chat Requests To Recognize

- `Evaluate this skill.`
- `Give me an analysis of the game dev skill.`
- `Audit this skill.`
- `Why did this skill score that way?`
- `What should I fix first?`
- `Measure the real token usage of this skill.`

## Commands

```bash
plugin-eval start <skill-path> --request "Evaluate this skill." --format markdown
plugin-eval analyze <skill-path> --format markdown
plugin-eval explain-budget <skill-path> --format markdown
plugin-eval measurement-plan <skill-path> --format markdown
plugin-eval init-benchmark <skill-path>
plugin-eval benchmark <skill-path> --dry-run
```

## Reference

- `../../references/chat-first-workflows.md`
