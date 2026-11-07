---
name: "import.codex.build-web-data-visualization.grammar-of-graphics-and-declarative-visualization"
description: "Build data visualizations with declarative grammars. Use when the user needs Vega-Lite, Vega, Observable Plot, or grammar-of-graphics reasoning, especially for tabular charts that do not require bespoke rendering."
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

# Grammar of Graphics and Declarative Visualization

## Overview

Use this skill as the default implementation path for many tabular charts. Declarative grammars are often the fastest, clearest, and most maintainable route when the chart can be expressed as data plus marks plus encodings plus transforms.

This skill covers Vega-Lite, Vega, and Observable Plot. Default to the highest-level tool that cleanly expresses the needed chart and interaction.

## Selection Rules

1. Use Observable Plot for fast exploratory and explanatory charts in JavaScript when concise code is valuable.
2. Use Vega-Lite for portable, declarative specs, multi-view composition, transforms, and embed-friendly chart definitions.
3. Use Vega when the user needs lower-level control that still benefits from a declarative runtime.
4. Leave this skill and route to D3, Canvas, or the Three.js/WebGL skill only when the chart requires bespoke layout, extreme density, GPU-scale rendering, particles, true 3D, or rendering control that the grammar no longer expresses cleanly.

## Working Pattern

1. Normalize the table shape.
2. Name the mark, encodings, transforms, faceting, and interaction model explicitly.
3. Choose the highest-level grammar that supports the chart without contortions.
4. Keep specs readable and portable.
5. Check whether the declarative approach still fits the expected number of simultaneous chart instances on the page.
6. Check mobile portrait and optional landscape behavior: responsive spec, label/tick reduction, hover replacement, touch target policy, and whether the grammar can keep the main visualization visible around controls.
7. Use declarative composition before custom code.

## Output Expectations

- Explain why the chosen grammar fits better than bespoke rendering.
- Keep the spec readable enough to be reused, embedded, or translated across stacks.
- Call out when the declarative path is reaching its limits and a lower-level skill should take over.
- Call out whether the grammar can support the mobile concept contract or whether D3, Canvas, WebGL, or framework-owned layout should take over.
- For new work, include a technical design section covering instance-count assumptions, performance implications, and the maintenance upside of staying declarative.

## References

- Shared theory:
  - `../../references/foundations/task-abstraction-and-chart-selection.md`
  - `../../references/foundations/perception-color-and-encoding.md`
  - `../../references/foundations/mobile-first-responsive-visualization.md`
  - `../../references/foundations/implementation-design-and-tradeoffs.md`
- Skill references:
  - `./references/vega-lite-and-vega.md`
  - `./references/observable-plot.md`
  - `./references/when-to-stay-declarative.md`

## Representative Prompts

- "Write a Vega-Lite spec for this dataset."
- "Should I use Plot, Vega-Lite, or D3 for this chart?"
- "Build a layered declarative chart with faceting and tooltips."
- "Tell me when this declarative approach stops being a good fit."
