---
name: "import.codex.plugin-eval.plugin-eval"
description: "Help engineers evaluate a local skill or plugin, explain why it scored that way, show what to fix first, measure real token usage, benchmark starter scenarios, or decide what to run next. Use when the user says things like \"evaluate this skill\", \"give me an analysis of the game dev skill\", \"why did this score that way\", \"what should I fix first\", \"measure the real token usage of this skill\", or \"what should I run next?\"."
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

# Plugin Eval

Use this as the beginner-friendly umbrella entrypoint for local Codex skill and plugin evaluation.

## Start Here

1. Resolve whether the target path is a skill, a plugin, or another local folder.
2. Prefer the chat-first router when the user speaks naturally or is not sure which command they need:

```bash
plugin-eval start <path> --request "<user request>" --format markdown
```

3. Route natural chat requests to the matching workflow:
   - "Give me an analysis of the game dev skill." -> resolve the named skill path, run `plugin-eval analyze <path> --format markdown`, then initialize a benchmark and show the setup questions needed to tailor `benchmark.json`
   - "Evaluate this skill." -> `plugin-eval analyze <path> --format markdown`
   - "Why did this score that way?" -> `plugin-eval analyze <path> --format markdown`
   - "What should I fix first?" -> `plugin-eval analyze <path> --format markdown`
   - "Explain the token budget for this skill." -> `plugin-eval explain-budget <path> --format markdown`
   - "Measure the real token usage of this skill." -> benchmark flow, then `plugin-eval measurement-plan`
   - "Help me benchmark this plugin." -> starter benchmark flow
   - "What should I run next?" -> `plugin-eval start <path> --request "What should I run next?" --format markdown`
4. If the user wants rewrite help after evaluation, route to `../improve-skill/SKILL.md`.
5. If the user wants a custom rubric, route to `../metric-pack-designer/SKILL.md`.
6. If the user names a skill instead of giving a path, resolve it locally before running commands:
   - check `~/.codex/skills/<skill-name>` first
   - then check any repo-local `skills/<skill-name>` directory
   - if the name is still ambiguous, ask one short clarifying question before continuing
7. When the request sounds like "analysis" rather than just "evaluate", do the fuller path:
   - run the report
   - initialize `.plugin-eval/benchmark.json`
   - surface the setup questions that will refine the starter scenarios
   - preview the dry-run command the user can execute next

## Chat Requests To Recognize

- `Give me an analysis of the game dev skill.`
- `Evaluate this skill.`
- `Evaluate this plugin.`
- `Why did this score that way?`
- `What should I fix first?`
- `Explain the token budget for this skill.`
- `Measure the real token usage of this skill.`
- `Help me benchmark this plugin.`
- `What should I run next?`

## Matching Commands

```bash
plugin-eval start <path> --request "Evaluate this skill." --format markdown
plugin-eval start <path> --request "Give me a full analysis of this skill, including benchmark setup." --format markdown
plugin-eval analyze <path> --format markdown
plugin-eval explain-budget <path> --format markdown
plugin-eval measurement-plan <path> --format markdown
plugin-eval init-benchmark <path>
plugin-eval benchmark <path> --dry-run
plugin-eval benchmark <path>
```

## Output Expectations

- Prefer the JSON result as the source of truth.
- Lead with `At a Glance`, `Why It Matters`, `Fix First`, and `Recommended Next Step`.
- Keep the `why` content terse and easy to skim.
- Call out whether budget numbers are static estimates or measured harness results.
- Show the user the exact chat phrase they can reuse next, the `plugin-eval start` command that routes it, and the first local workflow command behind it.
- When the user asks for an analysis of a named skill, do not stop at the report if benchmark setup is still missing.
- When the user is asking about a skill specifically, hand off to `../evaluate-skill/SKILL.md`.
- When the user is asking about a plugin bundle, hand off to `../evaluate-plugin/SKILL.md`.

## References

- `../../references/chat-first-workflows.md`
- `../../references/technical-design.md`
- `../../references/evaluation-result-schema.md`
