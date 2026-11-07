---
name: "import.codex.build-ios-apps.swiftui-ui-patterns"
description: "Build and refactor SwiftUI UI with component patterns and examples. Use when shaping navigation, state, layouts, controls, or screen composition."
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

# SwiftUI UI Patterns

## Quick start

Choose a track based on your goal:

### Existing project

- Identify the feature or screen and the primary interaction model (list, detail, editor, settings, tabbed).
- Find a nearby example in the repo with `rg "TabView\("` or similar, then read the closest SwiftUI view.
- Apply local conventions: prefer SwiftUI-native state, keep state local when possible, and use environment injection for shared dependencies.
- Choose the relevant component reference from `references/components-index.md` and follow its guidance.
- If the interaction reveals secondary content by dragging or scrolling the primary content away, read `references/scroll-reveal.md` before implementing gestures manually.
- Build the view with small, focused subviews and SwiftUI-native data flow.

### New project scaffolding

- Start with `references/app-wiring.md` to wire TabView + NavigationStack + sheets.
- Add a minimal `AppTab` and `RouterPath` based on the provided skeletons.
- Choose the next component reference based on the UI you need first (TabView, NavigationStack, Sheets).
- Expand the route and sheet enums as new screens are added.

## General rules to follow

- Use modern SwiftUI state (`@State`, `@Binding`, `@Observable`, `@Environment`) and avoid unnecessary view models.
- If the deployment target includes iOS 16 or earlier and cannot use the Observation API introduced in iOS 17, fall back to `ObservableObject` with `@StateObject` for root ownership, `@ObservedObject` for injected observation, and `@EnvironmentObject` only for truly shared app-level state.
- Prefer composition; keep views small and focused.
- Use async/await with `.task` and explicit loading/error states. For restart, cancellation, and debouncing guidance, read `references/async-state.md`.
- Keep shared app services in `@Environment`, but prefer explicit initializer injection for feature-local dependencies and models. For root wiring patterns, read `references/app-wiring.md`.
- Prefer the newest SwiftUI API that fits the deployment target and call out the minimum OS whenever a pattern depends on it.
- Maintain existing legacy patterns only when editing legacy files.
- Follow the project's formatter and style guide.
- **Sheets**: Prefer `.sheet(item:)` over `.sheet(isPresented:)` when state represents a selected model. Avoid `if let` inside a sheet body. Sheets should own their actions and call `dismiss()` internally instead of forwarding `onCancel`/`onConfirm` closures.
- **Scroll-driven reveals**: Prefer deriving a normalized progress value from scroll offset and driving the visual state from that single source of truth. Avoid parallel gesture state machines unless scroll alone cannot express the interaction.

## State ownership summary

Use the narrowest state tool that matches the ownership model:

| Scenario | Preferred pattern |
| --- | --- |
| Local UI state owned by one view | `@State` |
| Child mutates parent-owned value state | `@Binding` |
| Root-owned reference model on iOS 17+ | `@State` with an `@Observable` type |
| Child reads or mutates an injected `@Observable` model on iOS 17+ | Pass it explicitly as a stored property |
| Shared app service or configuration | `@Environment(Type.self)` |
| Legacy reference model on iOS 16 and earlier | `@StateObject` at the root, `@ObservedObject` when injected |

Choose the ownership location first, then pick the wrapper. Do not introduce a reference model when plain value state is enough.

## Cross-cutting references

- In addition to the references below, use web search to consult current Apple Developer documentation when SwiftUI APIs, availability, or platform guidance may have changed.
- `references/navigationstack.md`: navigation ownership, per-tab history, and enum routing.
- `references/sheets.md`: centralized modal presentation and enum-driven sheets.
- `references/deeplinks.md`: URL handling and routing external links into app destinations.
- `references/app-wiring.md`: root dependency graph, environment usage, and app shell wiring.
- `references/async-state.md`: `.task`, `.task(id:)`, cancellation, debouncing, and async UI state.
- `references/previews.md`: `#Preview`, fixtures, mock environments, and isolated preview setup.
- `references/performance.md`: stable identity, observation scope, lazy containers, and render-cost guardrails.

## Anti-patterns

- Giant views that mix layout, business logic, networking, routing, and formatting in one file.
- Multiple boolean flags for mutually exclusive sheets, alerts, or navigation destinations.
- Live service calls directly inside `body`-driven code paths instead of view lifecycle hooks or injected models/services.
- Reaching for `AnyView` to work around type mismatches that should be solved with better composition.
- Defaulting every shared dependency to `@EnvironmentObject` or a global router without a clear ownership reason.

## Workflow for a new SwiftUI view

1. Define the view's state, ownership location, and minimum OS assumptions before writing UI code.
2. Identify which dependencies belong in `@Environment` and which should stay as explicit initializer inputs.
3. Sketch the view hierarchy, routing model, and presentation points; extract repeated parts into subviews. For complex navigation, read `references/navigationstack.md`, `references/sheets.md`, or `references/deeplinks.md`. **Build and verify no compiler errors before proceeding.**
4. Implement async loading with `.task` or `.task(id:)`, plus explicit loading and error states when needed. Read `references/async-state.md` when the work depends on changing inputs or cancellation.
5. Add previews for the primary and secondary states, then add accessibility labels or identifiers when the UI is interactive. Read `references/previews.md` when the view needs fixtures or injected mock dependencies.
6. Validate with a build: confirm no compiler errors, check that previews render without crashing, ensure state changes propagate correctly, and sanity-check that list identity and observation scope will not cause avoidable re-renders. Read `references/performance.md` if the screen is large, scroll-heavy, or frequently updated. For common SwiftUI compilation errors — missing `@State` annotations, ambiguous `ViewBuilder` closures, or mismatched generic types — resolve them before updating callsites. **If the build fails:** read the error message carefully, fix the identified issue, then rebuild before proceeding to the next step. If a preview crashes, isolate the offending subview, confirm its state initialisation is valid, and re-run the preview before continuing.

## Component references

Use `references/components-index.md` as the entry point. Each component reference should include:
- Intent and best-fit scenarios.
- Minimal usage pattern with local conventions.
- Pitfalls and performance notes.
- Paths to existing examples in the current repo.

## Adding a new component reference

- Create `references/<component>.md`.
- Keep it short and actionable; link to concrete files in the current repo.
- Update `references/components-index.md` with the new entry.
