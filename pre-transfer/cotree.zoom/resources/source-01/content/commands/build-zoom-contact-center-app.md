---
name: "import.codex.zoom.command.build-zoom-contact-center-app"
description: "Implement a Zoom Contact Center integration for web, mobile, or backend workflows with the right auth and event handling."
disable-model-invocation: true
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

Resource root: resolve `..` from this file's directory to locate `content/`. Replace `<plugin-resource-root>` with that actual directory before using a script; it is not a literal Shell path.

This former slash command is an explicitly requested Elyra Skill. Bind <user-supplied-arguments> / <user-argument-N> from the actual request; ask only for required missing values. There is no import-time Shell or automatic slash-command expansion.

## 工作内容

# Build Zoom Contact Center App

Use this command when the repo needs Zoom Contact Center web, mobile, or backend integration work.

## Preflight

1. Inspect the codebase for existing Contact Center code, SDK usage, OAuth handling, and event consumers.
2. Identify the target platform and workflow: web embed, native wrapper, engagement handling, campaign flow, or backend orchestration.
3. Confirm the owning runtime and UI surface.
4. Check for the required auth, SDK, or endpoint configuration without printing secrets.

## Plan

Before making changes:

- state the target platform and Contact Center workflow
- list the files that will be changed
- state the auth path, event path, and interaction model
- state how the initial integration will be verified

## Commands

1. Add or correct the Contact Center integration at the proper platform layer.
2. Reuse existing app structure and avoid generic abstractions that hide platform-specific requirements.
3. Keep the first pass scoped to one concrete engagement or routing workflow.
4. Add the minimum auth, event, and UI wiring required for a working path.
5. Keep secrets and account-specific identifiers out of output.

## Verification

1. Re-read the platform integration files and supporting auth or event code that changed.
2. Run local build or tests where available.
3. Verify the configured workflow path and handler shape.
4. State any remaining blocker such as missing SDK setup, app configuration, or account prerequisites.

## Summary

```text
## Result
- Action: implemented or updated a Zoom Contact Center workflow
- Status: success | partial | failed
- Details: platform, files changed, auth path, verification run
```

## Next Steps

- Test the target engagement flow in the intended environment.
- Expand to more event or campaign cases only after the base path works.
- If auth or delivery is failing, use the narrower setup or debug commands next.
