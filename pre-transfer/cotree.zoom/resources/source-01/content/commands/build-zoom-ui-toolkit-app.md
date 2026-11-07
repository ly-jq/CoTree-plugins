---
name: "import.codex.zoom.command.build-zoom-ui-toolkit-app"
description: "Implement a Zoom Video SDK UI Toolkit integration for a prebuilt web session UI with the right auth, mount strategy, and session lifecycle."
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

# Build Zoom UI Toolkit App

Use this command when the repo needs a prebuilt web UI for a Zoom Video SDK session instead of a fully custom video interface.

## Preflight

1. Inspect the codebase for existing Video SDK usage, web frontend structure, server-side token generation, and session UI shells.
2. Confirm the requirement is a prebuilt Video SDK UI and not a real Zoom meeting flow.
3. Identify the host framework and where the UI Toolkit should mount.
4. Check whether the required Video SDK session auth path exists without printing secrets.

## Plan

Before making changes:

- state the target web framework and session UX goal
- list the files that will be changed
- state the auth path, mount strategy, and session lifecycle responsibilities
- state how the UI Toolkit flow will be verified

## Commands

1. Add or correct the UI Toolkit integration in the appropriate web UI layer.
2. Wire the minimum server-side signature or auth path required for a working session join.
3. Keep custom UI work limited unless the user explicitly needs it beyond the toolkit surface.
4. Configure permissions, session join and leave behavior, and any required media settings.
5. Avoid mixing Meeting SDK assumptions into a Video SDK UI Toolkit integration.

## Verification

1. Re-read the UI mount code, Video SDK auth path, and session join flow after changes.
2. Run the relevant local build or tests where available.
3. Verify the toolkit mount path, auth flow, and base session lifecycle.
4. State any remaining blocker such as browser restrictions, token generation gaps, or unsupported environment requirements.

## Summary

```text
## Result
- Action: implemented or updated a Zoom UI Toolkit integration
- Status: success | partial | failed
- Details: files changed, auth path, mount strategy, verification run
```

## Next Steps

- Test the session in the target browser environment.
- If deeper layout control is required, switch to `/build-zoom-video-sdk-app`.
- If auth is incomplete, fix the token path before expanding UI work.
