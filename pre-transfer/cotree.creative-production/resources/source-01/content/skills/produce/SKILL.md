---
name: "import.codex.creative-production.produce"
description: "Use when the user wants to create, explore, adapt, refine, polish, or review visual creative such as campaigns, ads, social posts, product imagery, scenes, offers, logos, brand systems, styles, charts, decks, or related marketing and design assets."
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

# Produce

Produce is the main Creative Production workflow. It turns a concrete brief, source asset, selected board item, or starter follow-up into reviewable visual work inside the Creative Production app.

## App-First Workflow

1. If the request lacks a real subject, business, offer, campaign, source asset, or desired output, use `intake` to mount the zero-state board. Do not use structured intake.
2. If enough context exists and no board is visible, call `creative_production_board` directly once with `action=open`. Do not invoke it through `functions.exec`; the direct MCP result carries the UI resource the host needs. Keep the returned `boardId` for the entire workflow.
3. Immediately before generation starts, call the same tool with `action=begin_generation` and stable placeholder IDs. After each generated file exists, call `action=complete_generation` with the matching item ID and absolute `imagePath`. Use `fail_generation` for failed outputs. Never call `open` again to refresh or continue a board.
4. Read `references/board-runtime.md` when creating, importing into, or refreshing a board.
5. Choose only the conditional references that match the request. Do not load every mode.
6. Generate through the active route. For 1 uncached native image, the coordinator uses built-in Codex ImageGen directly. Starting at 2 uncached native images, delegate generation to Desktop subagents. Keep at most 4 native-image worker threads open across the workflow, counting active workers and terminal workers not yet closed. Queue excess work in later waves. Consume and close each worker immediately when it reaches success, failure, cancellation, or `NEEDS_COORDINATOR_INPUT`; close terminal workers before replacements or retries. If runtime capacity is lower than expected, reduce the wave size. Validate that every returned path exists and is non-empty. Preserve successful and cached outputs. Retry only outputs that are missing or invalid, with at most 2 total attempts per output. Do not use the local `/api/images` endpoint for native generation. Do not use `codex exec`, restore `runtime/codex_exec_image_batch.py`, or introduce another process-based native fallback.
7. Verify each completion receipt reports the expected `boardId`, item ID, and revision. Every result identifies the same widget resource and board session so the host can update the existing mounted board; the bounded refresh watcher is recovery, not the primary delivery path. Do not render or remount another board.
8. Keep iteration, remixing, selection, and follow-up work in that same board.

## Reference Routing

Load one or more mode references only when the request needs their distinct prompt or artifact guidance:

- `references/modes/ads.md` for paid social, display, OOH, ecommerce, UGC, proof-led, or campaign ad directions.
- `references/modes/scenes.md` for product, service, venue, or offer placement in realistic contexts.
- `references/modes/offers.md` for offer-led, product-led, service-led, hero, or landing-page visual families.
- `references/modes/shots.md` for angles, crops, pans, zooms, macro details, or camera variants from an anchor image.
- `references/modes/logos.md` for new identity directions, marks, wordmarks, and lockups.
- `references/modes/styles.md` for reusable palette, typography, texture, lighting, and visual-system directions.
- `references/modes/positioning.md` for audience, occasion, proof, differentiation, and visual implication exploration.
- `references/modes/charts.md` for chart-specific visual treatment that preserves data and meaning.

Load cross-cutting contracts only when their condition applies:

- `references/review-renderer.md` when a helper produces a review manifest or local review page.
- `references/contracts/source-preservation.md` when an existing image, selected board item, product, person, packaging, logo, or chart must remain recognizable.
- `references/contracts/exact-content.md` when copy, chart values, labels, logos, claims, dimensions, or legal content must remain exact.
- `references/contracts/deterministic-exports.md` when the user asks for publish-ready, platform-specific, or final exported assets.

## Default Generation Shape

When no mode requires a different structure, generate 4-6 distinct visual directions. Each board tile must be one clean visual asset, not a collage, contact sheet, or mood board inside a mood board.

Use safe defaults for sparse but concrete requests. Do not invent claims, prices, certifications, endorsements, product facts, or readable copy.

## Handoff

Lead with the active board and what the user should compare, select, reject, or refine next. Do not lead with local files, manifests, server URLs, or implementation details.
