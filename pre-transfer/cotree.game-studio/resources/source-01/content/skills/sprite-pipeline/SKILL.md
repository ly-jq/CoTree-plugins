---
name: "import.codex.game-studio.sprite-pipeline"
description: "Generate and normalize 2D sprite animations. Use when the user asks for full-strip generation from approved source frames, consistent anchor and scale normalization, or preview assets for browser-game animation."
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

# Sprite Pipeline

## Overview

Use this skill for 2D sprite generation and normalization. This workflow is intentionally anchored around one approved frame and a whole-strip generation pass because frame-by-frame generation drifts too easily.

This skill is 2D-specific. If the request is for 3D characters, meshes, or materials, route back through `../game-studio/SKILL.md`.

## Core Workflow

1. Start from an approved in-game seed frame.
   - The seed frame should already reflect the right silhouette, palette, costume, and proportions.
2. Build a larger transparent reference canvas around that frame.
   - Use `../../scripts/build_sprite_edit_canvas.py`.
3. Ask for the full animation strip in one edit request.
   - Do not generate each frame independently unless the user explicitly accepts lower consistency.
4. Normalize the result into fixed-size game frames.
   - Use `../../scripts/normalize_sprite_strip.py`.
   - Use one shared scale across the whole strip.
   - Align frames with one shared anchor, typically bottom-center.
5. Optionally lock frame 01 back to the shipped seed frame.
   - Do this when the animation should begin from the exact idle or base pose already in game.
6. Render a preview sheet and inspect the animation in-engine before approving it.
   - Use `../../scripts/render_sprite_preview_sheet.py`.

## Prompting Rules

Always preserve these invariants in the prompt:

- same character
- same facing direction
- same palette family
- same silhouette family
- same readable face or key features
- same outfit proportions
- transparent background
- exact frame count and slot layout

Always ask for:

- one strip at once
- a transparent canvas
- no scenery, labels, or poster composition
- crisp pixel-art clusters for pixel work
- production asset tone, not concept art

## Using Image Generation

For live asset generation or edits, use the installed `imagegen` skill in this workspace. This skill defines the game-specific process; `imagegen` handles the API-backed generation or edit execution.

## Script Recipes

Create a reference canvas:

```bash
python3 scripts/build_sprite_edit_canvas.py \
  --seed output/sprites/idle-01.png \
  --out output/sprites/hurt-edit-canvas.png \
  --frames 4 \
  --slot-size 256 \
  --canvas-size 1024
```

Normalize a raw strip:

```bash
python3 scripts/normalize_sprite_strip.py \
  --input output/sprites/hurt-raw.png \
  --out-dir output/sprites/hurt \
  --frames 4 \
  --frame-size 64 \
  --anchor output/sprites/idle-01.png \
  --lock-frame1
```

Render a preview sheet:

```bash
python3 scripts/render_sprite_preview_sheet.py \
  --frames-dir output/sprites/hurt \
  --out output/sprites/hurt-preview.png \
  --columns 4
```

## Quality Gates

- proportions stay stable across frames
- frame-to-frame size does not drift
- action reads clearly at game scale
- transparency is preserved
- frame 01 matches the shipped sprite when lockback is enabled
- preview looks correct before any in-engine asset index update

## References

- Detailed workflow: `../../references/sprite-pipeline.md`
- Shared frontend context: `../game-ui-frontend/SKILL.md`
