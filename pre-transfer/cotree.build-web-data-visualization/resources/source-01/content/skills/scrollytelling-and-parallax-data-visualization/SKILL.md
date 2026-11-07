---
name: "import.codex.build-web-data-visualization.scrollytelling-and-parallax-data-visualization"
description: "Design and implement parallax scrolling and scrollytelling data visualizations. Use when the user asks for parallax scrolling, scrollytelling, scroll-driven timelines, sticky graphics, Scrollama, ScrollTrigger, ScrollTimeline, view timelines, rich-media timelines, moviescrollers, scroll-scrubbed charts, staged narrative reveals, or interactive visual stories where scrolling changes a data visualization or media scene."
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

# Scrollytelling and Parallax Data Visualization

## Overview

Use this skill when scrolling is part of the explanation, not just navigation. Scrollytelling is an author-led narrative structure in which text, data marks, imagery, video, maps, or camera states change as the reader scrolls. Parallax is one possible scrollytelling technique: layers move at different rates to create depth, reveal scale, or connect foreground evidence to background context.

Default assumption: preserve native scrolling and make every scene meaningful as a still. Do not use parallax or scroll-scrubbed motion as decoration. Use it only when staged reveal, state change, elapsed time, spatial movement, or rich-media synchronization materially reduces interpretation cost.

## When To Use It

- A timeline, map, chart, 3D scene, video, or illustrated substrate needs staged reveal while the reader scrolls.
- The story benefits from a linear author-led path before optional reader exploration.
- A sticky graphic, side-by-side text/visual layout, overlay text on media, or scroll-scrubbed transition is being planned or implemented.
- The user mentions Scrollama, GSAP ScrollTrigger, Motion `useScroll`, CSS `ScrollTimeline`, ViewTimeline, IntersectionObserver, `position: sticky`, parallax layers, moviescroller, or scroll-driven animation.

Avoid scrollytelling when the story is clearer as a static chart, direct-label small multiples, a conventional article with inline figures, or an explicit stepper. Prefer a stepper when the states are discrete and the reader needs direct access, known length, replay, or controlled comparison more than continuous scroll.

## Working Pattern

1. Define the story contract:
   - one-sentence takeaway
   - author-led sequence and any reader-controlled exploration
   - why scrolling is necessary
   - what the first frame, each key frame, and final frame prove
2. For fictional, synthetic, or illustrative stories, require a data-rich simulation before storyboarding. Use `../../references/foundations/fictional-data-story-simulation.md` to define entity, temporal, spatial or physical, event, outcome, and derived comparison layers.
3. For art-directed, image-supported, composite, or existing-page scrollytelling work, use `../../references/foundations/meaning-preserving-visual-design-workflow.md` and `../../references/foundations/mobile-first-responsive-visualization.md`. Apply those shared references for Codex concept generation, large-screen/mobile variants, approval or iteration, scene contracts, and implementation deferral.
4. Choose the scrollytelling technique:
   - graphic sequence
   - animated transition
   - pan and zoom
   - moviescroller
   - show-and-play
   - parallax depth layer
   - sticky side-by-side or overlay
   - stacked mobile fallback or mobile-specific stepper
5. Model scenes as data, not ad hoc scroll math. Each scene declares text, visual state, data layer, media asset, annotation, scroll trigger or progress range, reduced-motion fallback, static key frame, embedded visualization skill owner, visual-density role, interactive discovery affordance, asset-continuity requirement, scroll-controlled media behavior, and any approved concept/key-frame contract. Approved key-frame concepts are binding scene contracts: the implementation must preserve their evidence hierarchy, staging, label-safe regions, interaction meaning, and static fallback unless a deviation is approved or recorded as meaning-preserving.
6. For each embedded visual layer, use `../../references/foundations/embedded-visualization-self-use.md` to name the primary specialist owner and mini-brief the layer's job, data shape, encoding, interaction, fallback, accessibility, QA check, and delegated or local fresh-pass status before scene composition.
7. Require every scene to include at least one evidence-bearing visual change: chart transition, map or layer reveal, annotation shift, camera move, particle or flow state, video frame or state, or interactive hotspot. If the scene only adds drama, simplify or add real evidence.
8. Pick the lightest implementation:
   - native scroll and `position: sticky` for pinning
   - IntersectionObserver or Scrollama for step triggers
   - CSS scroll-driven animations for simple transform or opacity when support and fallback are acceptable
   - Motion or GSAP ScrollTrigger for complex React choreography, scrubbing, pinning, snapping, or timeline labels
   - D3/SVG, Canvas2D, WebGL, deck.gl, PixiJS, Three.js, or video only when the visual layer requires it
9. Protect the browser contract:
   - do not scrolljack
   - keep feedback immediate, reversible, and interruptible
   - preserve standard wheel, touch, scrollbar, and keyboard behavior
   - avoid surprise autoplay, especially audio
   - account for mobile browser chrome, changing viewport height, touch momentum, and keyboard-open states
10. Build accessibility and fallbacks before polish:
   - honor `prefers-reduced-motion`
   - provide static key frames, a stacked version, or a stepped fallback
   - keep focus order and reading order coherent
   - ensure the main claim survives screenshots and static export
11. Test performance and interpretation:
   - profile scroll jank on desktop and mobile
   - verify no layout thrashing or layout-triggering animation
   - reserve media dimensions and lazy-load offscreen assets
   - test fast scroll, reverse scroll, resize, reduced motion, keyboard navigation, and mobile browser chrome changes

## Routing

- Use `../visualization-strategy-and-critique/SKILL.md` first when deciding whether the story should be scrollytelling, a stepper, small multiples, or a static editorial chart.
- Use `../react-and-nextjs-data-visualization/SKILL.md` when the implementation is a React or Next.js story surface, especially with hydration, client-only libraries, dynamic imports, or route-level asset loading.
- Use `../d3-data-visualization/SKILL.md` when SVG data marks, labels, annotations, and scene-state transitions are the core work.
- Use `../canvas2d-data-visualization/SKILL.md` when dense flat marks or custom hit testing make SVG too heavy.
- Use `../threejs-data-visualization/SKILL.md` when WebGL, GPU layers, particles, flow, or camera-led 3D are necessary.
- Use `../geospatial-and-cartographic-visualization/SKILL.md` for map scrollytelling, fly-to sequences, route stories, or pan/zoom geography.
- Use `../accessibility-and-inclusive-visualization/SKILL.md` when motion sensitivity, keyboard path, screen-reader alternatives, or static fallbacks are central.
- Use `../testing-data-visualizations/SKILL.md` when validating scroll states, visual regression, render readiness, media loading, or reduced-motion behavior.
- Use `../../references/foundations/fictional-data-story-simulation.md` when sparse invented data would otherwise force the scroll story to rely on walls of text, decorative parallax, or generic chart tiles.

## Output Expectations

- State whether scrollytelling is justified and what would be lost in a simpler format.
- Name the scrollytelling technique and the reader's path through scenes.
- Provide a scene contract with trigger/progress ranges and static fallbacks.
- For Codex image-generated layout or key-frame concepts, use the shared design workflow for concept images, approval status, approved references, binding semantic design contract, locked and flexible elements, data-bound layers, mobile/landscape continuation, approved deviations, and concept-to-result fidelity checks.
- For every embedded visual layer, provide the specialist owner, mini-brief summary, QA check, and whether delegated fresh context, a local fresh specialist pass, or a lightweight exception was used.
- For fictional stories, provide the simulated-world data richness contract and the specialist mini-brief for every embedded visualization layer.
- Name the implementation stack and why it is the lightest reliable option.
- Call out browser behavior explicitly: native scroll, sticky pinning, event listeners, scroll ownership, and keyboard behavior.
- State reduced-motion behavior, mobile portrait path, optional landscape path, media loading plan, spotty-connection behavior, and performance risks.
- Include the first-frame, key-frame, final-frame, and screenshot acceptance criteria.

## References

- `./references/story-patterns-and-scene-contracts.md`
- `./references/implementation-and-performance.md`
- `./references/accessibility-testing-and-review.md`
- `../../references/foundations/meaning-preserving-visual-design-workflow.md`
- `../../references/foundations/embedded-visualization-self-use.md`
- `../../references/foundations/mobile-first-responsive-visualization.md`

## Representative Prompts

- "Make a parallax scrolling timeline with maps and video."
- "Use Scrollama for a data story."
- "Should this be scrollytelling or a stepper?"
- "Design a scroll-driven visualization that is accessible and performant."
- "Build a sticky graphic story where the chart changes as the reader scrolls."
- "Storyboard a moviescroller that advances video frames with scroll progress."
