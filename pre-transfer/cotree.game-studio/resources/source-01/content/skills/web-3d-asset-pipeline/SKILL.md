---
name: "import.codex.game-studio.web-3d-asset-pipeline"
description: "Prepare and optimize browser-game 3D assets. Use when the user asks for GLB or glTF shipping work, including Blender cleanup and export, collision or LOD setup, compression, texture packaging, and runtime validation."
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

# Web 3D Asset Pipeline

## Overview

Use this skill for shipped 3D assets, not runtime scene code. The default output format for browser 3D work in this plugin is GLB or glTF 2.0. The goal is predictable runtime assets, not whatever the DCC tool happened to export first.

This guidance is engine-agnostic and can serve Three.js, React Three Fiber, Babylon.js, or PlayCanvas.

## Use This Skill When

- the task is about GLB or glTF shipping format
- the task is about model cleanup, texture packaging, compression, LOD, or collision proxies
- the runtime stack is already chosen and the remaining problem is asset quality or size

## Do Not Use This Skill When

- the task is about scene, camera, renderer, or game-loop structure
- the task is purely about React versus vanilla Three.js routing
- the user is still deciding between runtime engines

## Default Pipeline

1. Author and clean the source asset in a DCC tool such as Blender.
2. Export to GLB or glTF 2.0.
3. Optimize with glTF Transform.
4. Validate naming, pivots, transforms, material reuse, and texture budgets.
5. Add collision proxies, LOD strategy, and baked-lighting assumptions as needed.
6. Ship the optimized asset and load it with engine-native GLTF support.

## Format Rules

- Default shipping format: GLB or glTF 2.0.
- Do not treat FBX, OBJ, or DCC-native formats as the long-term runtime contract.
- Apply or normalize transforms before shipping.
- Keep units, pivots, and orientation conventions consistent across the whole asset set.

## Optimization Rules

- Use glTF Transform for pruning, deduplication, simplification, and packaging.
- Use geometry compression intentionally.
  - Draco is a valid option when decode cost and compatibility fit the runtime.
  - Meshopt is often a strong default for web delivery.
- Compress textures deliberately.
  - Use KTX2 or BasisU when the runtime stack supports it.
  - Use WebP or AVIF where they make sense in the broader asset pipeline.
- Reuse materials and textures where possible to cut memory and draw-call cost.

## Runtime-Ready Asset Rules

- Keep model hierarchy names stable and meaningful.
- Set pivots and origins for gameplay interaction, not just for DCC convenience.
- Author explicit collision proxies for physics-heavy scenes.
- Decide whether lighting is dynamic, baked, or hybrid before final export.
- Plan LODs for large environments or repeated props.
- Keep texture resolution proportional to on-screen use, not source-art ambition.

## Common Failure Modes

- Shipping raw DCC exports without cleanup
- Too many unique materials
- Texture sizes far above visible need
- Missing collision proxies
- Scale or pivot mismatches between assets
- Runtime code compensating for asset mistakes that should be fixed upstream

## References

- Three.js stack: `../../references/threejs-stack.md`
- React Three Fiber stack: `../../references/react-three-fiber-stack.md`
- GLB loader starter: `../../references/gltf-loading-starter.md`
- Rapier starter: `../../references/rapier-integration-starter.md`
- 3D asset pipeline reference: `../../references/web-3d-asset-pipeline.md`
- Alternative engines: `../../references/alternative-3d-engines.md`
