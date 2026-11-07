---
name: "import.codex.game-studio.phaser-2d-game"
description: "Implement 2D browser games with Phaser. Use when the user wants a Phaser, TypeScript, and Vite stack for scenes, gameplay systems, cameras, sprite animation, and DOM-overlay HUD patterns."
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

# Phaser 2D Game

## Overview

Use this skill for the main execution path in this plugin. Phaser is the default stack for 2D browser games here because it handles rendering, timing, sprites, cameras, and scene orchestration well without forcing gameplay rules into the framework.

Preferred stack:

- Phaser
- TypeScript
- Vite
- DOM-based HUD or menus layered over the game canvas

## Architecture

1. Keep gameplay state outside Phaser scenes.
   - Systems own rules, turn order, movement, combat, inventory, objectives, and progression.
   - Phaser scenes adapt system state into sprites, camera motion, animation playback, and effects.
2. Make scenes thin.
   - Boot and asset preload
   - Menu or shell scene
   - Gameplay scene
   - Optional overlay or debug scene
3. Keep renderer-facing objects disposable.
   - Sprite containers, emitters, tweens, and camera rigs are view state, not source of truth.
4. Favor stable asset manifest keys over direct file-path references throughout gameplay code.

## Implementation Guidance

- Use one integration boundary where the scene reads simulation state and emits input actions back.
- Prefer deterministic system updates over scene-local mutation.
- Treat HUD and menus as DOM when text, status density, or responsiveness matter.
- Keep animation state derived from gameplay state rather than ad hoc sprite flags.

## 2D Modes Covered Well

- Turn-based grids and tactics
- Top-down exploration
- Side-view action platformers
- Character-action combat with sprite animation
- Lightweight management or deck-driven battle scenes

## Camera and Presentation

- Choose the camera model early: locked, follow, room-based, or tactical-pan.
- Keep camera logic separate from game rules.
- Use restrained screen shake, hit-stop, and parallax. Effects should improve readability, not obscure it.

## UI Integration

- Use DOM overlays for HUD, command menus, settings, and narrative panels.
- Keep the canvas responsible for the world, combat readability, and motion.
- Avoid shoving dense text or complex settings UIs into Phaser unless the project explicitly needs an in-canvas presentation.

## Asset Organization

- `characters/`
- `environment/`
- `ui/`
- `fx/`
- `audio/`
- `data/`

Keep manifest keys human-readable and stable.

## Default Directory Shape

See `../../references/phaser-architecture.md` for a concrete module split.

## Anti-Patterns

- Game rules inside `update()` loops without a system boundary
- Scene-to-scene state passed through mutable global objects
- HUD text rendered in the game canvas just because it is convenient
- Asset paths embedded everywhere instead of a manifest layer
- Overusing generic React dashboard patterns for game UI

## References

- Shared architecture: `../web-game-foundations/SKILL.md`
- Frontend direction: `../game-ui-frontend/SKILL.md`
- Sprite workflow: `../sprite-pipeline/SKILL.md`
- Phaser structure: `../../references/phaser-architecture.md`
