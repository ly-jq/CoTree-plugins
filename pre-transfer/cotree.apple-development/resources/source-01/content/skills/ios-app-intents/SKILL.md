---
name: "import.codex.build-ios-apps.ios-app-intents"
description: "Design App Intents, app entities, and App Shortcuts for iOS system surfaces. Use when exposing app actions or content to Shortcuts, Siri, Spotlight, widgets, or controls."
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

# iOS App Intents

## Overview
Expose the smallest useful action and entity surface to the system. Start with the verbs and objects people would actually want outside the app, then implement a narrow App Intents layer that can deep-link or hand off cleanly into the main app when needed.

Read these references as needed:

- `references/first-pass-checklist.md` for choosing the first intent and entity surface
- `references/example-patterns.md` for concrete example shapes to copy and adapt
- `references/code-templates.md` for generalized App Intents code templates
- `references/system-surfaces.md` for how to think about Shortcuts, Siri, Spotlight, widgets, and other system entry points

## Core workflow

### 1) Start with actions, not screens
- Identify the 1-3 highest-value actions that should work outside the app UI.
- Prefer verbs like compose, open, find, filter, continue, inspect, or start.
- Do not mirror the entire app navigation tree as intents.

### 2) Define a small entity surface
- Add `AppEntity` types only for the objects the system needs to understand or route.
- Keep the entity shape narrower than the app's persistence model.
- Add `EntityQuery` or other query types only where disambiguation or suggestions are genuinely useful.

### 3) Decide whether the action completes in place or opens the app
- Use non-opening intents for actions that can complete directly from the system surface.
- Use `openAppWhenRun` or open-style intents when the user should land in a specific in-app workflow.
- When the app must react inside the main scene, add one clear runtime handoff path instead of scattering ad hoc routing logic.
- If the action can work in both modes, consider shipping both an inline version and an open-app version rather than forcing one compromise.

### 4) Make the actions discoverable
- Add `AppShortcutsProvider` entries for the first set of high-value intents.
- Choose titles, phrases, and symbols that make sense in Shortcuts, Siri, and Spotlight.
- Keep shortcut phrases direct and task-oriented.
- Reuse the same action model for widgets and controls when a widget configuration or intent-driven control already needs the same parameters.

### 5) Validate the runtime handoff
- Build the app and confirm the intents target compiles cleanly.
- Verify the app opens or routes to the expected place when an intent runs.
- Summarize which actions are now exposed, which entities back them, and how the app handles invocation.

## Strong defaults

- Prefer a dedicated intents target or module for the system-facing layer.
- Keep intent types thin; business logic should stay in app services or domain models.
- Keep app entities small and display-friendly.
- Use `AppEnum` for fixed app choices such as tabs, modes, or visibility levels before reaching for a full entity type.
- Prefer one predictable app-intent routing surface in the main app scene or root router.
- Treat App Intents as system integration infrastructure, not only as a Shortcuts feature.

## Anti-patterns

- Exposing every screen or tab as its own intent without a real user value.
- Mirroring the entire model graph as `AppEntity` types.
- Hiding runtime handoff in global side effects with no clear app entry path.
- Adding App Shortcuts with vague phrases or generic titles.
- Treating the first App Intents pass as a broad taxonomy project instead of a small useful release.

## Notes

- Apple documentation to use as primary references:
  - `https://developer.apple.com/documentation/appintents/making-actions-and-content-discoverable-and-widely-available`
  - `https://developer.apple.com/documentation/appintents/creating-your-first-app-intent`
  - `https://developer.apple.com/documentation/appintents/adopting-app-intents-to-support-system-experiences`
- In addition to the links above, use web search to consult current Apple Developer documentation when App Intents APIs or platform behavior may have changed.
- A good first pass often includes one open-app intent, one action intent, one or two entity types, and a small `AppShortcutsProvider`.
- Good example families to cover are:
  - open a destination or editor in the app
  - perform a lightweight action inline without opening the app
  - choose from a fixed enum such as a tab or mode
  - resolve one or more entities through `EntityQuery`
  - power widget configuration or controls from the same entity surface
