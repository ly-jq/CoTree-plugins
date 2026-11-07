---
name: "import.codex.build-web-data-visualization.accessibility-and-inclusive-visualization"
description: "Make data visualizations accessible and inclusive. Use when the user needs chart or diagram accessibility guidance, text alternatives for complex visuals, color and contrast review, keyboard support, reduced-motion behavior for animation or parallax, or an accessibility QA workflow for exported figures, UML-like diagrams, and dashboards."
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

# Accessibility and Inclusive Visualization

## Overview

Use this skill when a visualization must be understandable by more people, in more contexts, with more assistive needs. Accessibility is not a post-processing step. It shapes chart selection, color, labeling, interaction, fallback text, and export strategy.

Default assumption: every important visualization should have a non-visual path to the key insight, whether through surrounding text, direct labels, data tables, or formal text alternatives.

## Working Pattern

1. Identify whether the chart is exploratory, explanatory, interactive, or exported.
2. Decide which information must remain available without hover, color discrimination, pointer precision, expanded panels, private persisted state, permission-gated capabilities, or a strong connection.
3. If the story uses generated imagery, illustration, WebGL, particles, 3D, maps, scrollytelling, parallax, or animation, separate what the asset shows from what the data proves.
4. If Codex image generation was used for a layout, figure, page-integration, asset, or key-frame concept, verify that the large-screen and mobile concept images were shown with concise plan and interaction bullets, the user approved the generated design set before project changes or implementation code began, and the semantic design contract from `../../references/foundations/meaning-preserving-visual-design-workflow.md` exists: the accessible path must preserve the same claim, caveat, source context, evidence hierarchy, locked layout elements, mobile continuation, and interaction meaning as the visual design.
5. If the view is a UML-like, ERD, state machine, workflow, dependency, or architecture diagram, preserve a text outline of nodes, groups, relationships, and selected paths; use `../uml-and-software-architecture-visualization/SKILL.md` for diagram-specific semantics.
6. Use `../../references/foundations/mobile-first-responsive-visualization.md` to verify touch targets, drag alternatives, keyboard-open visual viewport behavior, main-visualization visibility, spotty-connection states, and fallbacks for AR, camera, motion, vibration, notifications, and geolocation.
7. Provide direct labels, strong contrast, redundant encodings, keyboard paths, reduced-motion alternatives, accessible disclosure controls, and text alternatives.
8. For interactive visualizations, check that shared URLs, saved views, refresh, and back/forward navigation preserve the same accessible state summaries as the visual surface.
9. Test both the chart or diagram and the surrounding narrative.

## Output Expectations

- Name the accessibility risks specific to the chart, not just generic WCAG items.
- Provide fallback strategies for screen readers, PDFs, and static exports.
- Explain what to keep visible without relying on hover or color alone.
- Explain which active filters, selections, caveats, and summary values remain visible when configuration or drill-down panels are collapsed.
- For color guidance, name the semantic color roles, contrast risks, redundant encodings, and grayscale or color-deficiency review path.
- For image-supported visual stories, provide alt text or long descriptions that cover the scene, the data layer, the main takeaway, and the caveat without overstating generated imagery.
- For concepted visualizations, make sure the user approval record exists and the long description, reduced-motion path, static export, and source/caveat text preserve the approved semantic design contract and locked concept elements, not just the final rendered pixels.
- For mobile visualizations, make sure the main evidence is not pushed below settings, touch targets and hit areas are large enough, drag has alternatives, hover has tap/focus equivalents, keyboard-open states remain operable, stale/offline states are named, and sensor/camera/notification features have non-permission fallbacks.
- For animation, specify reduced-motion behavior and key-frame or final-state fallback.
- For scrollytelling or parallax, preserve native scroll and keyboard behavior, specify static key frames or stacked fallback, and make sure motion can be disabled without losing the evidence.
- For WebGL or particle effects, describe the data meaning in text, expose keyboard-accessible focus or selection paths for important marks, and provide a non-animated fallback that preserves flow, direction, focus, and uncertainty.
- For interactive diagrams, make search, selection, details panels, reset, export, expand/collapse, and drill-down reachable without pointer-only interaction.
- For shareable visualizations, make copy-link, saved-view, reset, expanded/collapsed panels, and restored URL state reachable and understandable by keyboard and screen-reader users.

## References

- Shared theory:
  - `../../references/foundations/perception-color-and-encoding.md`
  - `../../references/foundations/storytelling-annotation-and-critique.md`
  - `../../references/foundations/meaning-preserving-visual-design-workflow.md`
  - `../../references/foundations/mobile-first-responsive-visualization.md`
- Skill references:
  - `./references/text-alternatives-and-complex-images.md`
  - `./references/color-contrast-and-redundant-encoding.md`
  - `./references/keyboard-screen-reader-and-export.md`
  - `./references/testing-and-review-workflow.md`
  - `../uml-and-software-architecture-visualization/SKILL.md`
  - `../scrollytelling-and-parallax-data-visualization/references/accessibility-testing-and-review.md`

## Representative Prompts

- "Make this chart accessible."
- "How should I write alt text or a long description for this visualization?"
- "Review this dashboard for color, keyboard, and screen-reader issues."
- "What needs to change before this chart goes into a PDF report?"
- "How do I design tooltips and hover interactions without excluding people?"
- "Make this parallax scrollytelling visualization safe for reduced-motion users."
- "Make this UML, ERD, workflow, state machine, or architecture diagram accessible."
