---
name: "import.codex.build-web-data-visualization.react-and-nextjs-data-visualization"
description: "Integrate data visualizations into React and Next.js applications. Use when the user needs chart components, UML-like or architecture diagram components, React integration patterns, Next.js client or server boundaries, hydration-safe rendering, lazy loading, framework-aware performance, scroll-driven visual stories, or export guidance."
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

# React and Next.js Data Visualization

## Overview

Use this skill when the visualization lives inside a React or Next.js product surface. The focus is not just chart rendering. The focus is component ownership, hydration safety, client and server boundaries, bundle strategy, and clean integration between React and whichever visualization layer is actually drawing the marks.

Default assumption: React should own structure, layout, and application state, while the visualization layer owns scales, geometry, and narrowly scoped imperative rendering.

If the main request is about screenshot testing, visual regression, mocked chart data, or E2E coverage strategy, route first to `../testing-data-visualizations/SKILL.md` and pair back to this skill only for React- or Next-specific implementation details.

## Choose This Skill When

- the user is building charts inside React components
- the app is using Next.js, the App Router, or server and client component boundaries
- the chart uses D3, Canvas, SVG, Vega-Lite, Plot, WebGL, deck.gl, PixiJS, Sigma.js, or Three.js inside a React surface
- the surface uses Mermaid, React Flow, Cytoscape.js, Sprotty, JointJS, GoJS, ELK, Dagre, Graphviz/WASM, D2, or another UML-like diagram renderer
- hydration, SSR, dynamic loading, or browser-only APIs affect the implementation
- bundle size, route-level loading, and product integration matter
- the page is an editorial visual story that combines React layout, scroll states, parallax, sticky graphics, generated assets, SVG/Canvas/D3/WebGL/Three.js layers, particles, flow animation, and accessibility fallbacks

## Working Pattern

1. Decide which parts are server-safe and which must run in the browser.
2. Keep data loading, transformation, chart configuration, and render-layer concerns separated.
3. Estimate how many chart instances can be visible on a page at once and whether expensive work can be shared across them.
4. Let React own layout, controls, routing state, persistence affordances, and active-state summaries.
5. Let D3, Canvas, Vega-Lite embeds, Plot, WebGL libraries, or Three.js own the mark-level rendering.
6. Model URL-backed view state explicitly before wiring controls: filters, range, metric, comparison, selected entity, active tab, map bounds, zoom, camera target, and drill-down path.
7. Use localStorage only for tiny personal preferences; use IndexedDB or remote storage for larger saved views, drafts, cached slices, custom annotations, or shared/cross-device workspaces. Incoming URL state should override persisted defaults.
8. Use dynamic loading or client-only boundaries intentionally for browser-only visualization code.
9. If the chart owns wheel, pinch, or drag interactions, make the browser contract explicit. Use a non-passive native listener or library hook when default scrolling must be canceled, and do not assume framework-level `onWheel` is enough.
10. For editorial or infographic surfaces, keep the insight title, artifact mode, subtitle, annotation plan, source note, large-screen layout, mobile portrait layout, optional mobile landscape layout, and chart render layer as explicit component responsibilities. Use `../../references/foundations/mobile-first-responsive-visualization.md` for touch, keyboard, visual viewport, spotty-connection, and device-capability decisions.
11. For scrollytelling or parallax, use `../scrollytelling-and-parallax-data-visualization/SKILL.md` for the story contract. Model scenes as typed state rather than ad hoc scroll math. Each scene should define visible layers, annotation text, media assets, camera or transform state, trigger/progress range, static key frame, and reduced-motion fallback.
12. For advanced editorial, report, deck, generated-image, animation, or existing-page integration work, use `../../references/foundations/meaning-preserving-visual-design-workflow.md` and `../../references/foundations/mobile-first-responsive-visualization.md` before implementation. Apply the shared workflow for concept images, large-screen/mobile variants, approval or iteration, and the binding semantic design contract React must implement.
13. For generated imagery or illustration, keep assets in deterministic public paths or importable modules, and keep labels/data overlays in React-owned, editable layers.
14. For WebGL, keep renderer lifecycle, resize, context loss, disposal, and animation loops inside a narrow client-only component boundary. React should pass data versions and props, not mutate GPU objects throughout the tree.
15. For interactive UML, ERD, dependency, state machine, flow, or architecture diagrams, use `../uml-and-software-architecture-visualization/SKILL.md` first; React should own app state, panels, controls, routing, and persistence while the diagram layer owns layout/rendering details.
16. For operational workspaces, use `../../references/foundations/operational-visualization-workspaces.md` before component decomposition. React should own shell state, command bars, drawers, rails, active summaries, URL state, and inspector synchronization while the visualization layer owns geometry, layout, and picking.

## Next.js Guidance

- Prefer Server Components for data fetching, framing content, and layout when the chart does not need browser APIs there.
- Use Client Components for interactive charts, measuring containers, pointer events, or browser-only libraries.
- Use dynamic imports when the charting runtime is not needed on the initial path or should avoid SSR.
- Keep chart assets and export paths deterministic when the same visualization must appear in reports or documents.
- Use route params or search params as the canonical input for shareable view state when possible. Parse and normalize them before initializing client-only chart state so linked views do not flicker through unrelated defaults.
- Use replace-style navigation for high-frequency transient changes and push-style navigation for committed selections, applied filters, drill-down steps, and saved-view transitions.
- For publication-style pages, design desktop and mobile compositions as sibling states, not as a single squeezed SVG.
- On mobile, keep the main visualization first or immediately available. Put secondary filters, inspectors, and settings in collapsible panels, drawers, bottom sheets, or inline controls that preserve active-state summaries and return focus/scroll to the chart after Apply, Cancel, Reset, or close.
- For dense workspaces, prefer a desktop outline/control rail, central viewport, and inspector rail; use a mobile command bar with outline, filter, and details panels instead of stacking the desktop rails above the visualization.
- Use `window.visualViewport` or equivalent resize handling for keyboard-heavy controls so search, filter, and annotation flows do not hide the only critical action or permanently obscure the visualization.
- Use Pointer Events for custom touch/pen/mouse interactions when possible, with explicit `touch-action`, enlarged hit areas, drag alternatives, reset controls, and no hover-only evidence.
- Use IntersectionObserver, Scrollama, Motion `useScroll`, GSAP ScrollTrigger, CSS scroll timelines, or explicit step controls sparingly and accessibly. The default view should still communicate the claim.
- Prefer native scroll and `position: sticky` for pinned story sections. Avoid scrolljacking and keep wheel, touch, scrollbar, and keyboard behavior predictable.
- Use `prefers-reduced-motion` to switch animated stories to final-state, key-frame, or stepped layouts.
- Lazy-load heavy WebGL, 3D, video, or image-generation-derived assets without causing layout shift. Reserve aspect ratios and label lanes.
- Pause WebGL animation loops when offscreen, route-hidden, tabbed away, or reduced-motion is active.

## Output Expectations

- Name the ownership boundary between React and the visualization layer.
- For explanatory work, name the insight title, artifact mode, annotation layer, direct-label strategy, and mobile reading path.
- For mobile work, name the mobile portrait layout, whether landscape is supported, how controls avoid covering the chart, how the on-screen keyboard behaves, and how touch/pinch interactions map to selection, zoom, pan, and reset.
- For operational workspaces, name the shell components, default selected state, synchronized outline/search/filter/inspector behavior, empty-surface clear-selection rule, mobile command panels, and URL-backed workspace state.
- For art-directed work, name generated or illustrated assets, scroll/animation states, reduced-motion behavior, and still-frame fallback.
- For concepted surfaces, use the shared design workflow for concept images, approval status, approved references, binding semantic design contract, locked and flexible elements, React-owned data layers, renderer-owned layers, mobile/landscape continuation, and approved deviations.
- For scrollytelling or parallax, name the scroll controller, scene contract, trigger/progress ranges, sticky layout, mobile fallback, and static key frames.
- For WebGL or particles, name the renderer, data-to-buffer boundary, animation clock, cleanup/disposal path, reduced-motion behavior, and static fallback.
- Call out any client-only or hydration-sensitive code explicitly.
- Call out any interaction that must suppress native browser scrolling or scroll chaining.
- Call out which state is URL-backed, locally persisted, IndexedDB-backed, remote-saved, or intentionally ephemeral.
- Call out copy-link, saved-view, reset, refresh, back/forward, and invalid URL-state behavior.
- Call out which control or detail areas are collapsed by default or closable, and how active state remains visible.
- Call out live-data connection behavior on mobile: stale state, reconnect, offline/partial data, lower-bandwidth mode, and alerting/notification strategy when relevant.
- State whether the chart is a good fit for SSR, client-only rendering, or dynamic loading.
- For new work, include a technical design section covering simultaneous instance count, per-instance versus page-level performance, and maintenance implications of the chosen integration pattern.
- Keep bundle size, export needs, and accessibility visible in the design.

## References

- Shared theory:
  - `../../references/foundations/editorial-infographic-system.md`
  - `../../references/foundations/art-directed-interactive-visual-stories.md`
  - `../../references/foundations/meaning-preserving-visual-design-workflow.md`
  - `../../references/foundations/task-abstraction-and-chart-selection.md`
  - `../../references/foundations/perception-color-and-encoding.md`
  - `../../references/foundations/shareable-state-and-persistence.md`
  - `../../references/foundations/mobile-first-responsive-visualization.md`
  - `../../references/foundations/operational-visualization-workspaces.md`
  - `../../references/foundations/implementation-design-and-tradeoffs.md`
- Skill references:
  - `./references/react-component-patterns.md`
  - `./references/d3-canvas-and-grammar-in-react.md`
  - `./references/nextjs-client-server-boundaries.md`
  - `./references/lazy-loading-ssr-and-bundle-strategy.md`
  - `../uml-and-software-architecture-visualization/SKILL.md`
  - `../scrollytelling-and-parallax-data-visualization/SKILL.md`
  - `../testing-data-visualizations/SKILL.md`

## Representative Prompts

- "How should I integrate this chart into a React app?"
- "What is the right React pattern for D3, Canvas, or Vega-Lite here?"
- "Make this visualization work cleanly in Next.js App Router."
- "Build a React scrollytelling story with sticky graphics and reduced-motion fallback."
- "Should this chart be a Client Component or use dynamic import?"
- "Help me avoid hydration and SSR issues with this visualization."
- "Build an interactive React UML, ERD, flow, state machine, dependency, or architecture diagram."
