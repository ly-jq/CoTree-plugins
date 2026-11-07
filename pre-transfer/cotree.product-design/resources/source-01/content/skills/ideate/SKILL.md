---
name: "import.codex.product-design.ideate"
description: "Generate image-based alternatives, remixes, or new design directions from a Product Design brief. Use when the user asks for design variants, visual exploration, remixes, or image-generated approaches from provided context."
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

# Ideate

You're tasked with generating design concepts for a user's idea.

Follow the shared Product Design routing guidance in [$index](../index/SKILL.md).

## Critical Overrides

- Refer to the Plugin router [$index](../index/SKILL.md) before proceeding.
- Follow [$critical-overrides](../../references/critical-overrides.md).

## User Context

Before starting, load [$user-context](../user-context/SKILL.md) and run its preflight script when local shell access is available.

Attach provided product URLs, Figma files, screenshots, reference images, codebase paths, Storybook, tokens, design systems, brand assets, component refs, browser preferences, and share targets to the Image Gen generations to align them to the design brief.

Do not inspect every saved reference. Inspect only what the current task needs.

## Workflow

Do not generate images until `$get-context` has satisfied the minimum required design brief.

Before generating images:

1. Understand the brief.

- Identify the target: component, screen, feature/workflow, or broad product idea.
- Identify the intended user, product surface, and goal.
- Preserve hard constraints from the user.
- Run `get-context` if the minimum required design brief isn't satisfied.

2. Resolve context.

- Use provided files, screenshots, links, and visible references.
- In a local workspace, look for nearby design documentation and other local visual context.
- Check likely design context folders such as `user-context`, `storybook/`, `.storybook/`, `design-system/`, `design-systems/`, `tokens/`, `components/`, `app/`, and generated prototype roots.
- In an existing project, look for existing product screenshots, similar flows, Storybook captures, design tokens, and component references before generating. Ask if the user can provide example screens similar to the one they are building if the existing app isn't accessible. Ensure you add design language and tokens to the Image Gen prompt.

3. Inspect references directly.

- Look at screenshots, images, Figma frames, app surfaces, or other visual references before generating.
- Do not infer from filenames alone.
- If a named local path or reference is not visible, stop and ask the user to confirm the path, upload the file, start the local app, or point to the correct workspace.

4. Decide the variation mode.

- If useful local design context exists and the user has not asked for a new style, stay within that existing direction.
- If no useful design context exists, or the user asks for broad exploration, vary both concept and visual system.
- For a specific component or existing surface, vary structure, interaction, hierarchy, and emphasis before varying brand style.
- For a broad product idea, explore three meaningfully different product directions.

5. Choose target dimensions before Image Gen.

- Pick the dimensions that best match the user's request and any provided visual reference.
- Mobile app: `390 x 844`.
- Tablet app: `834 x 1194`.
- Desktop app, dashboard, admin, or SaaS: `1440 x 1024`.
- Landing or marketing page: `1440` wide and scrollable.
- Modal, panel, widget, or component: natural container size.
- Provided screenshot, Figma frame, mockup, or reference image: match its dimensions and aspect ratio when the user wants to continue from that visual.
- Avoid crowding. Make the design fit the chosen dimensions cleanly, with realistic spacing, readable type, and no clipped content.
- Include the chosen dimensions in every Image Gen prompt.

6. Check for access gaps.

- If a connector, reference, or file cannot be accessed because of auth, permissions, expired login, missing scope, suspiciously empty results, or unavailable local state, stop.
- Name the gap clearly and ask whether to troubleshoot access or continue without that source.
- Do not generate images while silently ignoring a named reference.

7. Attach images and mocks provided by the user to the Image Gen call along with your design brief.

8. Generate 3 independent options that have distinct information hierarchy, layout strategy, interaction model, or product framing.

Rules you must follow:

- Use the Image Gen prompt below.
- Use the built-in Image Gen tool.
- Generate exactly three independent images unless the user overrides the count.
- Launch each Image Gen call independently. Do not batch Image Gen calls with `Promise.all`, collect them into an ordered array, or replay them in request order.
- Each option must be its own Image Gen result. Do not put multiple ideas in one image.
- Give each direction a distinct, descriptive name before generation, but do not call it `option 1`, `option 2`, or `option 3` and do not put planned numeric labels in Image Gen prompts. Parallel results can arrive in a different order from the requests.
- Number options only after the Image Gen results are present in the thread. The only authoritative option order is the order those generated-image results are displayed in the current thread. Ignore the planned concept order, original request chain, prompt submission order, `Promise.all` result order, batch order, array indexes, retry order, and assumed completion order.
- After all results return, bind each visible option number to the result in that displayed order. Do not name or describe the options in the final selection message.
- Attach provided screenshots, files, app captures, Figma references, and visual source material as moodboard inspiration when available.
- Attach existing product screenshots, similar flows, Storybook captures, design tokens, and component references as grounding material when available.
- When mock data includes dates or time-sensitive information, resolve the exact current date and include it in every Image Gen prompt. Derive visible dates from that anchor; preserve dates required by the user or source design.
- If a screenshot, image, or visual file is available, attach the actual image to the Image Gen call. Do not rely on text descriptions of it.
- Only claim a visual reference was attached if the Image Gen call actually received that image or a readable local image path.
- If you cannot attach the image, say that clearly and ask whether to continue with text-only direction.
- Preserve hard constraints from the brief in every image.
- After generating options, stop for the user's selection before any build work begins.
- When the user later selects option `N`, resolve it against the Nth displayed generated-image result from the most recent ideation set, not the original planned concept order. If the exact displayed result cannot be resolved, do not build from a guess; ask the user to name the concept or reattach/select the image.
- The selected option is the visual target for `$image-to-code`.

## Feedback Loop

If the user gives feedback after seeing options, generate revised options with that feedback.

If the user selects an option and gives feedback, generate a revised option with that feedback before build.

If the user likes parts of more than one option, combine those choices into a new Image Gen design and show it before build.

## Image Gen Prompt

Adapt this prompt to the current design brief, attach any available image references, and send it to Image Gen:

```text
Create realistic, production-quality UI designs with clear hierarchy, strong typography, intentional imagery, and purposeful spacing.

Design a focused primary screen, not a feature inventory. The product may support many workflows, but this frame should show the hero use case, one clear primary action, and only one or two supporting actions or content areas. Do not add cards, panels, tabs, badges, metrics, filters, or navigation items merely to advertise every feature. Let the rest of the product exist off-screen. Prefer strong hierarchy and generous whitespace; if the screen feels crammed, remove UI.

### Target Dimensions

Pick the dimensions that best match the user's request and any provided visual reference.

Default to a desktop web-app frame unless the user or reference clearly calls for mobile, tablet, or another format.

 - Mobile app: `390 x 844`
 - Tablet app: `834 x 1194`
 - Desktop app, dashboard, admin, or SaaS: `1440 x 1024`
 - Landing or marketing page: `1440` wide and scrollable
 - Modal, panel, widget, or component: natural container size
 - Provided screenshot, Figma frame, mockup, or reference image: match its dimensions and aspect ratio when the user wants to continue from that visual

Use a natural viewport ratio for the intended surface. Never stretch, squash, or warp the generated screen, imagery, typography, or UI elements to fill the canvas. If the composition does not fit naturally, recompose or simplify the layout instead.

Avoid crowding. Make the design fit the chosen dimensions cleanly, with realistic spacing, readable type, and no clipped content.

### Layout

When deciding how to lay elements out on the page, this should be your priority order for tools to differentiate sections:

1. Use spacing, grouping, alignment, typography, and hierarchy on the same product surface.
2. Use simple dividers or row separators.
3. Use a subtle surface tint only when the base surface is not enough.
4. Use borders only when separation still is not clear.
5. Use shadows/elevation last, and sparingly.

Don'ts:
 - Do not default to a centered "app card" (the whole UI is in a card on the page) on top of a contrasting page background. Use the base page surface first unless the source product or user explicitly asks for a contained app panel.
 - Do not put cards inside cards. Do not make every major section a card. Do not make each list item its own card unless each item is truly a standalone object. A normal list should usually read as one grouped surface with lightweight row separation.
 - Do not make up extraneous features. Add only the things essential to accomplish what the prototype's goal is. Don't make up more features just to fill out a UI.

### Typography

 - Anchor UI typography to readable product sizes. Body text should usually sit between 14px and 16px, with the rest of the type scale built around that baseline.
 - Keep long-form text to a comfortable line length, generally no more than 65 characters per line.
 - Use no more than 2 fonts in a UI. You can use any font available in the project, or fonts provided free on Google Fonts. Pick the font that is best for the goal of the product and that matches with its intended look and feel.

### Presentation

 - For mobile app concepts, output app content only. Do not include a device bezel, phone body, notch, Dynamic Island, OS status bar, clock, signal or battery indicators, home indicator, browser chrome, rounded device mask, or device shadow.
 - Do not put multiple ideas into a single image generation.
 - Vary each idea as much as possible while adhering to the constraints given entirely.

### Data Freshness

When the design includes dates or time-sensitive mock data, use the supplied current date as the anchor. Weekly views must show the real containing week with correct weekday/date pairs. Feeds, charts, notifications, and recent activity must use plausible chronological dates relative to today. Mark today when useful. Preserve dates required by the brief or source design.
```

## Output

Wait until all Image Gen calls have returned before sending the final message that asks the user to choose.

Do not send the final selection message until every requested generated image is visible exactly once in the main chat.

If fewer Image Gen outputs are visible than requested, retry the missing generation. Do not send the selection message.

Number the returned Image Gen outputs in the order they appear in the conversation context:

- First Image Gen output = Option 1
- Second Image Gen output = Option 2
- Third Image Gen output = Option 3

Ignore the planned concept order, original request chain, request order, `Promise.all` result order, batch order, array indexes, retry order, and tool submission order.

Do not name or describe the options. For the default three images, send only:

`Which option should I build: 1, 2, or 3? Or tell me what you'd like to refine or personalize first.`

Adjust the numbers only if the user requested a different count.

If the user chooses a number, acknowledge the chosen option before routing to `$image-to-code`, for example: `Building option 2!` Do not ask for confirmation when the mapping is clear.

Done means the requested number of independent images have been generated and the user has been asked to select one.
