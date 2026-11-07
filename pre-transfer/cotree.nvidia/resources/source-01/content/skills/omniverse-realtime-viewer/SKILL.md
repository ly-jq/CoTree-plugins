---
name: "import.codex.nvidia.omniverse-realtime-viewer"
description: "Use as the top-level router for Omniverse Realtime Viewer USD app requests and focused viewer reference documents."
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

<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Omniverse Realtime Viewer

This is the top-level entry point for the Omniverse Realtime Viewer skill package.
It is self-contained: all required routing, conventions, and validation
guidance live in the selected references.

Use the focused reference documents as implementation recipes. This file chooses the
right recipes and preserves the architectural rules that must hold across all
generated viewer apps.

## Instructions

Start by classifying the requested viewer, then read only the references needed
for that delivery path and feature set. Implement the render path first, layer
interaction and UI behavior on top of it, and finish by capturing validation
evidence from `references/validation.md`.

## Read Order

1. Read `references/routing.md` to choose the delivery path and focused references.
2. Read `references/conventions.md` before implementing camera, input,
   selection, viewport, streaming protocol, scene loading, or environment
   behavior.
3. For broad viewer requests, read `references/usd-viewer-app/README.md`.
4. If the delivery path is unclear, read `references/streaming-vs-local/README.md`.
5. If the prompt includes layout, panels, controls, inspectors, status, or UX,
   read `references/viewer-ux-workflow/README.md` and then the focused viewer UI references.
   This applies to React/WebRTC, Tauri, Electron, `ovui`, `ovwidgets`, and Dear
   ImGui apps; "frontend" means user-facing UI, not only browser UI.
6. For viewport interaction, read `references/viewer-input-routing/README.md` before
   `references/camera-controls/README.md`, `references/native-picking-selection/README.md`, or `references/object-selection/README.md`.
7. Read only the focused capability references needed for the requested app.
8. Use `references/validation.md` to capture review evidence before handoff.

## Non-Negotiables

- Use `ovrtx` for all USD and 3D rendering.
- Browser apps display an `ovstream` WebRTC video stream plus UI. The browser
  does not render USD geometry.
- Do not substitute WebGL, Three.js, Babylon.js, PlayCanvas, A-Frame,
  model-viewer, react-three-fiber, glTF browser viewers, or other client-side
  3D renderers.
- If local validation cannot run because the GPU/runtime environment is absent,
  scaffold the `ovrtx` path and document the runtime requirement. Do not add a
  browser-renderer fallback.
- Keep user USD files unmodified. Viewer cameras, render products, render vars,
  settings, selection metadata, and runtime state belong in session/composite
  layers or app state.
- Keep one owner for `renderer.step()`, stage mutation, native picking,
  selection writes, and live attribute writes.
- Keep dependency acquisition in `references/dependencies/README.md` and deployment choices in
  `references/cloud-deployment/README.md`; do not duplicate package locations or deployment setup.

## Focused Reference Families

- Entry points and recipes: `references/usd-viewer-app/README.md`, `references/streaming-viewer-recipe/README.md`,
  `references/ovui-local-viewer-recipe/README.md`, `references/streaming-vs-local/README.md`, `references/electron-shm-viewer/README.md`,
  `references/ovwidgets-editor-shell/README.md`.
- Rendering and stage: `references/ovrtx-rendering/README.md`, `references/stage-loading/README.md`, `references/stage-management/README.md`,
  `references/render-settings/README.md`, `references/aov-switching/README.md`, `references/stage-hierarchy/README.md`, `references/stage-queries/README.md`,
  `references/stage-attribute-reads/README.md`, `references/prim-transform-safety/README.md`, `references/usd-sample-data/README.md`.
- Delivery and runtime: `references/streaming-server/README.md`, `references/streaming-client/README.md`,
  `references/streaming-messages/README.md`, `references/streaming-lifecycle/README.md`, `references/local-viewer/README.md`,
  `references/tauri-local-viewer/README.md`, `references/cpp-native-viewer/README.md`, `references/headless-shm-cli/README.md`,
  `references/viewer-backend-interface/README.md`, `references/webgl-shm-transport/README.md`.
- Viewer UI/UX: `references/viewer-ux-workflow/README.md`, `references/viewer-layout-patterns/README.md`,
  `references/viewer-control-patterns/README.md`, `references/viewer-data-view-patterns/README.md`,
  `references/viewer-feedback-status/README.md`.
- Interaction: `references/viewer-input-routing/README.md`, `references/camera-controls/README.md`,
  `references/object-selection/README.md`, `references/native-picking-selection/README.md`, `references/selection-feedback/README.md`,
  `references/selection-animation/README.md`, `references/transform-manipulator/README.md`, `references/gl-viewport-overlay/README.md`,
  `references/ovui-library/README.md`, `references/prim-pick-effects/README.md`, `references/prim-info-display/README.md`,
  `references/viewport-overlays/README.md`.
- Infrastructure: `references/dependencies/README.md`, `references/windows-native-setup/README.md`, `references/cloud-assets/README.md`,
  `references/cloud-deployment/README.md`, `references/troubleshooting/README.md`.

## Build Workflow

1. Classify the prompt by delivery path, target user, required capabilities,
   runtime environment, validation needs, and explicit constraints.
2. Select a small reference set. Start with the recipe or routing reference, then add
   focused capabilities such as camera, picking, hierarchy, properties, render
   settings, transform tools, cloud assets, or deployment.
3. Read selected references before writing app code. Follow their build order,
   import order, data-channel contracts, and renderer ownership rules.
4. Implement the core render path first, then input routing and camera, then
   selection and data panels, then scene/settings features, then packaging or
   deployment.
5. Treat the selected references as the behavior contract for API shape,
   compatibility, and generated project structure.
6. Capture validation evidence before calling the viewer ready.

## Examples

- For a browser viewer request, use the streaming recipe references plus camera,
  picking, hierarchy, properties, render settings, and stream-status references.
- For a local workstation viewer request, use the local or native delivery
  references plus renderer setup, stage loading, viewport input, and validation.

## Completion Checklist

- Selected references match the user's intent and delivery path.
- No code path uses a browser-side 3D renderer for USD.
- The generated app has one clear owner for render stepping and stage mutation.
- User USD files remain untouched by viewer-owned session data.
- Camera, input, selection, scene loading, and stream behavior follow
  `references/conventions.md`.
- Setup/build/run results and visual interaction evidence are captured with
  `references/validation.md`.
