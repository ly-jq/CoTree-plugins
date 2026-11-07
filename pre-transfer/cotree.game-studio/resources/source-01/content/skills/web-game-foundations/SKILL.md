---
name: "import.codex.game-studio.web-game-foundations"
description: "Set browser-game architecture before implementation. Use when the user needs engine choice, simulation and render boundaries, input model, asset organization, or save/debug/performance strategy."
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

# Web Game Foundations

## Overview

Use this skill to establish the non-negotiable architecture before implementation starts. Browser games degrade quickly when simulation, rendering, UI, asset loading, and input handling are mixed together.

Default rule: simulation state is owned outside the renderer, browser UI is not forced into the canvas unless there is a clear reason, and shipped 3D assets default to GLB or glTF 2.0 rather than ad hoc model formats.

## Use This Skill When

- the user has not settled the engine or renderer choice
- the task is about boundaries, module shape, state ownership, or asset policy
- multiple specialist skills need one shared architectural frame

## Do Not Stay Here When

- the runtime track is clearly Phaser
- the runtime track is clearly vanilla Three.js
- the runtime track is clearly React Three Fiber
- the task is purely about shipped 3D assets

Once the stack is clear, hand off to the runtime or asset specialist skill.

## Architecture Rules

1. Separate simulation from rendering.
   - Simulation owns entities, turns, timers, collisions, progression, and saveable state.
   - The renderer owns scene composition, animation playback, camera, particles, and input plumbing.
2. Keep input mapping explicit.
   - Define actions such as `move`, `confirm`, `cancel`, `ability-1`, and `pause`.
   - Map physical inputs to actions in one place.
3. Treat asset loading as a first-class system.
   - Use stable manifest keys.
   - Group by domain: characters, environment, UI, audio, FX.
   - For 3D content, standardize on GLB or glTF 2.0 unless the chosen engine ecosystem requires another format upstream.
4. Define save/debug/perf boundaries up front.
   - Save serializable simulation state, not renderer objects.
   - Keep debug overlays and perf probes easy to toggle.
5. Use DOM overlays for menus and HUD by default.
   - Canvas or WebGL should handle the playfield.
   - DOM should handle text-heavy HUD, menus, settings, and accessibility-sensitive controls.
   - In 3D, keep the persistent UI budget small so the scene stays readable and interactive.
6. Lock 3D runtime conventions early.
   - Choose consistent units, origins, pivots, and naming conventions.
   - Decide how collision proxies, LODs, and baked lighting data are authored before runtime integration starts.

## Engine Selection

- Default to Phaser for 2D games with sprites, tilemaps, top-down or side-view action, turn-based grids, and classic browser arcade flows.
- Default to vanilla Three.js for explicit 3D scenes that want direct scene, camera, renderer, and loop control in plain TypeScript or Vite.
- Default to React Three Fiber when the 3D scene lives inside a React application and needs declarative composition, shared app state, or React-first UI coordination.
- Use raw WebGL only for shader-heavy or renderer-first projects where engine abstractions would get in the way.
- Keep Babylon.js and PlayCanvas as alternative-engine paths rather than the default code-generation target.

See `../../references/engine-selection.md` for the default decision table.

## Implementation Checklist

Define these before writing core code:

- Player fantasy and primary verbs
- Core loop and loss or reset states
- Camera model
- Input action map
- Simulation modules
- Renderer modules
- Asset manifest layout
- 3D asset format and optimization rules
- HUD and menu surfaces
- Save data boundary
- Debug and perf surfaces

## Anti-Patterns

- Mixing gameplay rules directly into scene callbacks
- Treating the renderer as the source of truth for game state
- Putting all HUD and menu UI into the canvas by default
- Letting asset filenames become the public API instead of manifest keys
- Shipping unoptimized 3D assets straight from the DCC tool into the browser
- Mixing camera-control state and menu or modal state without an explicit input boundary
- Rebuilding architecture every time the game changes genre

## References

- Engine selection: `../../references/engine-selection.md`
- Phaser structure: `../../references/phaser-architecture.md`
- Three.js structure: `../../references/three-webgl-architecture.md`
- Three.js ecosystem stack: `../../references/threejs-stack.md`
- React Three Fiber stack: `../../references/react-three-fiber-stack.md`
- 3D asset shipping: `../../references/web-3d-asset-pipeline.md`
