---
name: "import.codex.build-macos-apps.signing-entitlements"
description: "Inspect macOS signing, entitlements, and Gatekeeper issues. Use when diagnosing code signing, sandbox, hardened runtime, or trust failures."
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

# Signing & Entitlements

## Quick Start

Use this skill when the failure smells like codesigning rather than compilation:
launch refusal, missing entitlement, invalid signature, sandbox mismatch,
hardened runtime confusion, or trust-policy rejection.

## Workflow

1. Inspect the bundle or binary.
   - Locate the `.app` or executable.
   - Identify the main binary inside `Contents/MacOS/`.

2. Read signing details.
   - Use `codesign -dvvv --entitlements :- <path>`.
   - Use `spctl -a -vv <path>` when Gatekeeper behavior matters.
   - Use `plutil -p` for entitlements or Info.plist inspection.

3. Classify the failure.
   - Unsigned or ad hoc signed
   - Wrong identity
   - Entitlement mismatch
   - Hardened runtime issue
   - App Sandbox issue
   - Nested code signing issue
   - Distribution/notarization prerequisite issue

4. Explain the minimum fix path.
   - Say exactly what is wrong.
   - Show the shortest set of validation or repair commands.
   - Distinguish local development problems from distribution problems.

## Useful Commands

- `codesign -dvvv --entitlements :- <app-or-binary>`
- `spctl -a -vv <app-or-binary>`
- `security find-identity -p codesigning -v`
- `plutil -p <path-to-entitlements-or-plist>`

## Guardrails

- Never invent missing entitlements.
- Do not conflate notarization with local debug signing.
- If the real issue is a build setting or provisioning profile, say so directly.

## Output Expectations

Provide:
- what artifact was inspected
- what signing state it is in
- the exact failure class
- the minimum fix or validation sequence
