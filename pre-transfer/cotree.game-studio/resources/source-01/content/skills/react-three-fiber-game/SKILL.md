---
name: "import.codex.game-studio.react-three-fiber-game"
description: "Build React-hosted 3D browser games with React Three Fiber. Use when the user wants pmndrs-based scene composition, shared React state, and 3D HUD integration inside a React app."
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

# React Three Fiber Game

## Overview

Use this skill when the 3D runtime lives inside a React application. This is the default React-native 3D path in the plugin and should be preferred over vanilla Three.js when the app shell, settings, storefront, editor surface, or surrounding product already uses React.

Recommended stack:

- `@react-three/fiber`
- `three`
- `@react-three/drei`
- `@react-three/rapier`
- `@react-three/postprocessing`
- `@react-three/a11y` when accessibility-sensitive interaction matters
- DOM overlays in the normal React tree

## Use This Skill When

- the project already uses React
- the 3D scene must share state with the rest of the app
- declarative scene composition is a net gain
- the team wants pmndrs helpers instead of building every helper layer by hand

## Do Not Use This Skill When

- the app is not React-based
- the project wants a cleaner imperative runtime with minimal React coordination
- the problem is asset packaging rather than runtime composition

## Best Fit Scenarios

- 3D configurators and tool-rich browser products
- React apps with embedded game or scene surfaces
- 3D menus, editors, or world maps in an existing React app
- 3D game UIs that depend on shared app state and non-canvas shells

## Core Rules

1. Keep simulation state outside render components.
   - React components should describe scene composition, not become the source of truth for gameplay rules.
2. Use React state and scene state deliberately.
   - Shared UI state can live in app state.
   - High-frequency simulation should not force the whole app through unnecessary React churn.
3. Use pmndrs helpers intentionally.
   - Drei for controls, loaders, helpers, environments, and common scene primitives.
   - `@react-three/rapier` for physics integration.
   - `@react-three/postprocessing` for optional effects.
   - `@react-three/a11y` when the interaction model benefits from accessible scene semantics.
4. Keep HUD, settings, and menus in DOM by default.
5. Keep starter scaffolds visually restrained.
   - Start with one compact objective or status surface and transient prompts.
   - Keep notes, maps, and multi-step checklists collapsed until opened.
   - Do not surround the `Canvas` with equally weighted glass cards.

## Architectural Guidance

- Use a dedicated scene root component that owns the `Canvas`.
- Keep camera rigs and control components isolated from gameplay systems.
- Keep loader and asset wrappers predictable.
- Keep DOM overlays and the 3D scene coordinated through explicit state boundaries.
- If a system needs tight imperative control, isolate it rather than forcing everything into declarative patterns.
- If the scene is immediately playable, keep the initial overlay budget low and let the world do more of the onboarding.

## Anti-Patterns

- Treating React components as the gameplay state store
- Pushing heavy per-frame mutation through broad app state
- Using R3F only because React is available, even when the project needs a cleaner imperative runtime
- Building HUD or inventory UI inside the 3D scene by default
- Shipping an initial scaffold with large cards occupying every side of the viewport

## References

- Shared architecture: `../web-game-foundations/SKILL.md`
- Frontend direction: `../game-ui-frontend/SKILL.md`
- 3D HUD layout patterns: `../../references/three-hud-layout-patterns.md`
- React Three Fiber stack: `../../references/react-three-fiber-stack.md`
- React starter: `../../references/react-three-fiber-starter.md`
- GLB loader starter: `../../references/gltf-loading-starter.md`
- Rapier starter: `../../references/rapier-integration-starter.md`
- 3D asset pipeline: `../../references/web-3d-asset-pipeline.md`
- WebGL debugging and perf: `../../references/webgl-debugging-and-performance.md`
