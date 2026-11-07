---
name: "import.codex.build-macos-apps.view-refactor"
description: "Refactor macOS SwiftUI views and scenes into stable structure. Use when splitting large views, tightening scene state, or narrowing AppKit escapes."
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

# View Refactor

## Overview

Refactor macOS views toward small, explicit, stable scene and view types. Default
to native SwiftUI for layout, selection, commands, and settings. Reach for AppKit
only at the narrow edges where desktop behavior truly requires it.

## Core Guidelines

### 1) Model scenes explicitly

- Break the app into meaningful scene roots: main window, settings, utility windows, inspectors, or menu bar extras.
- Do not let one giant root view silently own every desktop surface.

### 2) Keep a predictable file shape

- Follow this ordering unless the file already has a stronger local convention:
- Environment
- `private`/`public` `let`
- `@State` / other stored properties
- computed `var` (non-view)
- `init`
- `body`
- computed view builders / other view helpers
- helper / async functions

### 2b) Split files by responsibility

- For non-trivial apps, do not keep the full app, all views, models, stores, networking clients, process clients, and helpers in one Swift file.
- Accept a single Swift file only for tiny throwaway examples or snippets: roughly under 50 lines, one screen, no persistence, no networking/process client, and no reusable models.
- Use `App/<AppName>App.swift` for the `@main` app and `AppDelegate` only.
- Keep `Views/ContentView.swift` focused on root layout and composition; move feature UI into files such as `Views/SidebarView.swift`, `Views/DetailView.swift`, and `Views/ComposerView.swift`.
- Move value types and selection enums into `Models/*.swift`, stores into `Stores/*.swift`, app-server/network/process clients into `Services/*.swift`, and small formatters/resolvers/extensions into `Support/*.swift`.
- Keep files small and named after the primary type they contain.

### 3) Prefer dedicated subview types over many computed `some View` fragments

- Extract meaningful desktop sections like sidebar rows, detail panels, inspectors, or toolbar content into focused subviews.
- Keep computed `some View` helpers small and rare.
- Pass explicit data, bindings, and actions into subviews instead of handing down the whole scene model.

### 4) Keep selection and layout stable

- Prefer one stable split or window layout with local conditionals inside it.
- Avoid top-level branch swapping between radically different roots when selection changes.
- Let the layout be constant; let state drive the content inside it.

### 5) Extract commands, toolbars, and actions out of `body`

- Do not bury non-trivial button logic inline.
- Do not mix command routing, menu state, and layout in the same block if they can be named clearly.
- Keep `body` readable as UI, not as a desktop view controller.

### 6) Use scene and app storage intentionally

- Use `@SceneStorage` for per-window ephemeral state when it truly helps restore the scene.
- Use `@AppStorage` for durable preferences, not transient UI toggles that only matter in one window.
- Keep scene-owned state close to the scene root.

### 7) Keep AppKit escape hatches narrow

- If a representable or `NSWindow` bridge exists, isolate it behind a small wrapper or helper.
- Do not let AppKit references spread through unrelated SwiftUI views.
- If the bridge starts owning the feature, re-evaluate the architecture.

### 8) Observation usage

- For `@Observable` reference types on modern macOS targets, store them as `@State` in the owning view.
- Pass observables explicitly to children.
- On older deployment targets, fall back to `@StateObject` and `@ObservedObject` where needed.

## Workflow

1. Identify the current scene boundary and whether the file is trying to do too much.
2. Reorder the file into a predictable top-to-bottom structure.
3. Extract desktop-specific sections into dedicated subview types.
4. Stabilize the root layout around selection, scenes, and commands rather than top-level branching.
5. Move action logic, command routing, and toolbar behavior into named helpers or separate types.
6. Tighten any AppKit bridge so the imperative edge is small and explicit.
7. Keep behavior intact unless the request explicitly asks for structural and behavioral changes together.

## Refactor Checklist

- Split oversized view files before adding more UI.
- Move pure models, identifiers, and selection enums out of view files.
- Move `Process`, `URLSession`, app-server, and platform client code out of SwiftUI views into `Services/`.
- Keep `AppDelegate` and the `@main` app entrypoint minimal.
- Build after each major split so compile errors stay local.

## Common Smells

- A root view that mixes window scaffolding, settings, toolbar code, command handling, and detail layout.
- A single app file that mixes app entrypoint, root layout, feature views, models, stores, service clients, and support extensions.
- iOS-style push navigation forced into a Mac sidebar-detail problem.
- Several booleans for mutually exclusive inspectors, sheets, or utility windows.
- AppKit objects passed through many SwiftUI layers without a clear ownership reason.
- Large computed view fragments standing in for real subviews.

## Notes

- A good macOS refactor should make scene structure, selection flow, and command ownership obvious.
- When the problem is fundamentally a missing desktop pattern, use `swiftui-patterns`.
- When the problem is fundamentally a boundary with AppKit, use `appkit-interop`.
