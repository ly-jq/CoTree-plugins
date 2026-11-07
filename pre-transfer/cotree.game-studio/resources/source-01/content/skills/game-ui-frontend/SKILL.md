---
name: "import.codex.game-studio.game-ui-frontend"
description: "Design UI surfaces for browser games. Use when the user asks for HUDs, menus, overlays, responsive layouts, or visual direction that must protect the playfield."
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

# Game UI Frontend

## Overview

Use this skill whenever the game needs a visible interface layer. The job is not to produce generic dashboard UI. The job is to produce a readable, thematic browser-game interface that supports the play experience.

Default assumption: build the game world in canvas or WebGL, and build text-heavy UI in DOM.

## Frontend Standards

1. Establish visual direction before coding.
   - Genre and fantasy
   - Material language
   - Typography
   - Palette
   - Motion tone
2. Use CSS variables for the UI theme.
3. Build clear hierarchy.
   - Critical combat or survival information first
   - Secondary tools second
   - Rarely used settings behind menus or drawers
4. Protect the playfield first, especially in 3D.
   - The initial screen should feel playable within a few seconds.
   - Default to one primary persistent HUD cluster and at most one small secondary cluster.
   - Keep the center of the playfield clear during normal play.
   - Keep the lower-middle playfield mostly clear during normal play.
   - Put lore, field notes, quest details, and long control lists behind drawers, toggles, or pause surfaces.
   - Prefer contextual prompts and transient hints over permanent boxed panels.
5. Keep overlays readable over motion.
   - Use backing panels, edge treatment, contrast, and restrained blur where needed.
6. Design for both desktop and mobile from the start.
7. Design 3D UI around camera and input control boundaries.
   - Pause or gate camera-control input when menus, dialogs, or pointer-driven UI are active.
   - Keep pointer-lock, drag-to-look, and menu interaction states explicit.

## 3D Starter Defaults

For exploration, traversal, or third-person starter scaffolds, prefer this UI budget:

- one compact objective chip or status strip at the edge
- one transient controls hint or interaction prompt
- one optional collapsible secondary surface such as a journal, map, or quest log

Do not open every informational surface on first load. The scene should be readable before the user opens any deeper UI.

As a default implementation constraint for 3D browser games:

- no always-on full-width header plus multi-card body plus full-width footer layout
- no large center-screen or lower-middle overlays during normal movement
- no more than roughly 20-25% of the viewport covered by persistent HUD on desktop unless the user explicitly requests a denser layout
- on mobile, collapse to a narrow stack or contextual chips before covering the playfield with larger panels

## Prompting Rules

When asking the model to design or implement game UI, include:

- the game fantasy
- the camera or viewpoint
- the player verbs
- the HUD layers
- the camera or control mode when the game is 3D
- the tone of motion
- desktop and mobile expectations
- playfield protection and disclosure strategy
- explicit anti-patterns to avoid

Use `../../references/frontend-prompts.md` for concrete prompt shapes.

## Motion Rules

- Prefer a few meaningful transitions over constant micro-animation.
- Reserve strong motion for state change, reward, danger, and onboarding.
- Respect reduced-motion settings for non-essential animation.
- Keep 3D HUD motion from competing with camera motion.

## What Good Looks Like

- HUD elements are legible without flattening the scene.
- Menus feel native to the game world, not like a SaaS admin panel.
- Layout adapts cleanly across breakpoints.
- Pointer, keyboard, and game-state feedback are obvious.
- In 3D games, menu and HUD states do not fight camera control or pointer-lock.
- In 3D games, the first playable view keeps most of the viewport available for movement, aiming, and spatial reading.
- Persistent information density is low enough that screenshots still read as game scenes, not UI comps.

## Anti-Patterns

- Generic app dashboard layouts
- Flat placeholder styling with no theme
- Default font stacks without intent
- Dense overlays that obscure the playfield
- Large title cards or multi-paragraph notes sitting over a live playable scene
- Equal-weight boxed panels distributed around every edge of the viewport
- Controls, objectives, notes, and lore all expanded at once on first load
- Full-width top-and-bottom chrome with large always-on center or body panels in 3D play
- Excessive motion on every element
- Canvas-only UI when DOM would be clearer and cheaper
- Forcing HUD controls into the 3D scene when standard DOM would be clearer
- Letting camera input remain active under modals or inventory panels

## References

- Shared architecture: `../web-game-foundations/SKILL.md`
- Prompt recipes: `../../references/frontend-prompts.md`
- Low-chrome 3D layout patterns: `../../references/three-hud-layout-patterns.md`
- React-hosted 3D UI context: `../react-three-fiber-game/SKILL.md`
- Playtest review: `../../references/playtest-checklist.md`
