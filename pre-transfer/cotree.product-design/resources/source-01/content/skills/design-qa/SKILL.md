---
name: "import.codex.product-design.design-qa"
description: "Internal prototype QA helper. Use only after a Product Design prototype, URL-to-code build, or image-to-code build has a source visual target and a rendered implementation to compare before handoff. Do not use for broad UX critique, design critique, product audits, or flow reviews; route those user-facing requests to audit."
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

# Design QA

Use this internal helper to compare a prototype's source design against the rendered implementation before handoff.

Do not use this skill for broad UX critique, design critique, product audits, or flow reviews. Use [audit](../audit/SKILL.md) for those user-facing requests.

Use this skill before every Product Design build handoff.

A passing QA run requires both:

- a source visual target: Figma node, image, screenshot, mockup, or source capture
- a rendered implementation: local URL, deployed URL, app screen, component, or screenshot

If either artifact cannot be opened, captured, or compared, write `design-qa.md` with `final result: blocked` and name the blocker. Do not let the build skill hand off as done.

## Critical Overrides

Follow [critical-overrides](../../references/critical-overrides.md).

## Workflow

Compare the intended design to the implementation as a product-quality reviewer, not as a generic aesthetic critic. The output must be a prioritized fix list grounded in evidence from both artifacts.

Do not write the QA review from memory, code, or file paths alone. Open or capture both the source design and the implementation first, then compare what is actually visible.

Do not pretend separate image views are side-by-side comparison. Put the source image and the implementation screenshot together in the same comparison input, then judge the visible differences from that combined input.

Design QA is an iteration loop. The first comparison may pass only when it finds no actionable P0/P1/P2 differences and no visual fixes are made in response.

When a comparison finds any P0/P1/P2 issue:

- Record the finding and keep the current result blocked.
- Apply the fix.
- Capture the revised implementation at the same viewport and state.
- Compare the revised capture against the source again.

A later pass must identify the earlier findings, the fixes made, and the post-fix visual evidence. Build, dependency, lint, deployment, and preview troubleshooting do not count as design-QA iterations.

1. Identify the comparison target.
   - Determine the source design: Figma node, image, design board, screenshot, spec, or mockup.
   - Determine the implementation: local URL, deployed URL, app screen, component, screenshot, or code-rendered view.
   - Match the same viewport, state, theme, device density, route, content, auth state, and interaction state before judging.
   - If artifacts do not represent the same state, call that out first and avoid false precision.

2. Capture evidence.
   - For Figma, use design context and screenshot tools when available.
   - For Product Design `mobile-app` template implementations, capture the app viewport itself, not the whole browser page, desktop canvas, or surrounding phone stage. Use `data-testid="device-screen"` / `[data-phone-screen]` for content-only comparisons; use `data-testid="phone-frame"` only when the source visual includes the device bezel.
   - Before capturing a `mobile-app` template, run `npm run check:runtime`. Treat a failure as blocking. Do not bypass the check or accept a rasterized or duplicated status bar, device bezel, or home indicator as app content.
   - For web/app implementations, follow the Browser Choice rule in [index](../index/SKILL.md#browser-choice). In ChatGPT Work Mode, follow the active build skill's "Previewing prototypes in ChatGPT Work Mode" section before opening a local implementation. Then capture screenshots at the intended viewport.
   - Capture additional states when relevant: mobile/desktop, hover/focus/active, empty/loading/error, dark/light, and key responsive breakpoints.
   - Save paths or URLs for screenshots when available so findings can cite evidence.
   - Capturing screenshots is not enough. Put the source image and the implementation screenshot together in the same comparison input before judging.

3. Normalize before comparing.
   - Align crop, viewport size, scale, and device frame. Do not compare a framed mockup to an unframed page without noting the mismatch.
   - Prefer comparing content regions over full browser chrome or surrounding canvas.
   - For the `mobile-app` template, force or verify a 1:1 phone-screen capture before judging fidelity. The template scales the device down to fit small browser viewports; use a large enough Playwright viewport for scale `1` and verify `[data-phone-screen]` measures `393 x 852` CSS px before capture. If the screen measures smaller, the screenshot is scaled and is not valid for 1:1 comparison.
   - Capture the mobile app with an element screenshot or an explicit clip from the screen element, for example:

   ```ts
   const page = await browser.newPage({
     viewport: { width: 1400, height: 1200 },
     deviceScaleFactor: 1,
   });
   await page.goto("http://127.0.0.1:8796");
   const screen = page.getByTestId("device-screen");
   await screen.waitFor({ state: "visible" });

   const box = await screen.boundingBox();
   if (!box || Math.abs(box.width - 393) > 1 || Math.abs(box.height - 852) > 1) {
     throw new Error(`Expected unscaled mobile screen at 393 x 852, got ${box?.width} x ${box?.height}`);
   }

   await screen.screenshot({ path: "implementation-mobile-screen.png" });
   ```

   - Normalize image density before comparing. If the source or implementation is `@2x` or otherwise double-density, compare against a same-size normalized copy: either downsample `786 x 1704` source captures to the `393 x 852` CSS target, or capture the implementation at the same density and compare equal pixel dimensions. Record the source pixels, implementation pixels, CSS viewport, and `deviceScaleFactor` in `design-qa.md`.
   - Do not file visual findings caused only by density mismatch, browser chrome, canvas padding, or device-frame mismatch. Normalize those first, then judge typography, spacing, color, imagery, and state.

4. Compare at the right level of detail.
   - Use a full-view comparison to judge overall composition, hierarchy, layout, density, and responsive structure.
   - Use focused region comparisons when important details are too small to judge in the full-view comparison.
   - Choose focused regions from the actual source and implementation. Use them where fidelity depends on precise typography, alignment, imagery, assets, icons, logos, controls, forms, navigation, tables, dense UI, or visible interaction states.
   - If no focused region is needed, say why in `design-qa.md`.
   - Do not pass QA from a full-view comparison alone when important details are not clearly readable.

5. Review systematically.
   - Read [qa-rubric](./references/qa-rubric.md) when the QA pass spans more than a quick visual check.
   - Check information architecture, layout, spacing, typography/fonts, color, imagery/image quality, icons, copy, affordances, interaction states, responsiveness, accessibility, and polish.
   - Always make a specific pass over the five required fidelity surfaces: fonts/typography, spacing/layout rhythm, colors/tokens, image quality, and copy/content. Do this even if the user did not name those areas explicitly.
   - If the mock does not address some issue you're seeing (e.g. a null state), call that out as a separate finding as a shortcoming of the mock to be addressed.
   - Your other goal is to decide whether the implementation "looks as good" as the mock. If there are stylistic problems, call them out. If the user's prompt is leaking into the implementation (vs letting the app stand on its own), call that out as well.
   - Distinguish design drift from intentional product/code constraints. If a deviation may be intentional, phrase it as a question or assumption.

6. Produce a fix-oriented QA report.
   - Lead with findings, ordered by severity and user impact.
   - For each finding include: severity, location, what differs, evidence, why it matters, and the concrete fix.
   - Include exact CSS/component/token suggestions when the implementation context is available.
   - Separate objective mismatches from subjective polish recommendations.
   - Do not say a design matches, is done, or is as good as it can get until the required fidelity surfaces have been checked and any remaining differences are explicitly classified as acceptable, expected, or still actionable.
   - End with a concise implementation checklist.

## Required Fidelity Surfaces

Every QA report must explicitly evaluate these surfaces:

- Fonts and typography: family, fallback, weight, size, line height, letter spacing, antialiasing, hierarchy, wrapping, truncation, and whether display text and small UI text use appropriate optical weights. It is incredibly important to check fonts carefully for fidelity, including looking up similar typefaces or using image analysis to find the font differences.
- Spacing and layout rhythm: frame size, crop, alignment, margins, padding, grid tracks, section gaps, component spacing, radii, shadows/elevation, and vertical rhythm.
- Colors and visual tokens: sampled or inferred palette, gradients, opacity, contrast, semantic state colors, foreground/background balance, and whether CSS tokens map to the source design.
- Image quality and asset fidelity: subject correctness, crop, scale, sharpness, compression, transparency halos, masking, background treatment, raster-vs-vector appropriateness, and whether generated assets match the source art direction. Fail QA if logos, illustrations, decorative marks, product imagery, non-standard icons, or other visible image assets from the visual target were replaced with custom inline SVG, handcrafted SVG, HTML elements, div/span shapes, CSS drawings, gradients, emoji, text glyphs, placeholder shapes, or code-native approximations.
- Copy and content of app-specific text

## Severity

- `P0`: Blocks core use, severe accessibility failure, broken layout, or impossible task.
- `P1`: Major design mismatch or usability regression likely to be noticed by users.
- `P2`: Moderate visual drift, inconsistent state, responsive issue, or fixable polish gap.
- `P3`: Minor refinement that improves fidelity but does not block acceptance.

Treat viewport overflow that hides persistent app controls, and mismatches that materially change above-the-fold content, major-region proportions, text wrapping, or interface density, as P2 or higher.

## Output Format

Use this structure unless the user asks otherwise:

```markdown
**Findings**
- [P1] Short issue title
  Location: screen/component/selector/file if known.
  Evidence: design does X, implementation does Y.
  Impact: why this matters.
  Fix: concrete change.

**Open Questions**
- Any ambiguity about intentional deviations, unavailable states, or missing artifacts.

**Implementation Checklist**
- Ordered fixes that can be executed directly.

**Follow-up Polish**
- P3 refinements that can improve fidelity after handoff.
```

If there are no substantive mismatches, say that clearly and list any residual test gaps.

When this skill is used before handoff, save the latest QA report as project-root `design-qa.md`.

`design-qa.md` must include:

- source visual truth path
- implementation screenshot path
- viewport
- source and implementation pixel dimensions, CSS size, and density normalization used
- state
- full-view comparison evidence
- focused region comparison evidence, or why it was not needed
- findings
- comparison history for every P0/P1/P2 iteration: earlier findings, fixes made, and post-fix visual evidence
- final result

For ChatGPT Work Mode builds, `design-qa.md` must include the browser-rendered implementation screenshot, viewport, primary interactions tested, console errors checked, and final result. If browser-rendered evidence is missing, `final result` is `blocked`.

`final result` must be exactly `passed` or `blocked`.

Use `passed` when there are no actionable P0/P1/P2 findings. P3 findings may remain as follow-up polish.
Use `blocked` when actionable P0/P1/P2 findings remain and name the blocker.

Return the file path with the QA report.
