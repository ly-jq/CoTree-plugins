---
name: "import.codex.canva.canva-design-feedback"
description: "Read a Canva design and return structured, actionable design feedback — visual hierarchy, copy/messaging, layout & spacing, consistency, readability, and accessibility. Read-only; makes no changes to the design. Use when the user asks to \"review my design\", \"give me feedback on this\", \"critique my deck/poster/flyer\", \"how can I improve this design\", or \"what's wrong with this slide\"."
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

# Get Design Feedback

Act as a design reviewer: read the design as it actually appears, then return concrete, prioritised feedback the user can act on. This skill is **read-only** — it never edits the design. When the user wants the changes made, hand off to `canva-edit-design` or `canva-implement-feedback`.

## What you can actually read (and the gap to know about)

- **`Canva:get-design-content`** returns text (`richtexts`) only — good for copy, headings, and wording, but it does NOT include colors, fonts, sizes, or element positions.
- **`Canva:get-design-thumbnail`** gives you the rendered image — this is how you "see" layout, hierarchy, balance, color, and contrast. Always pull this; visual critique depends on it.
- **Element positions, sizes, and text** are reliably available from a **read-only** editing transaction: `Canva:start-editing-transaction`, inspect the returned `richtexts`/`fills`, then `Canva:cancel-editing-transaction` (never commit — you are not changing anything). Use this for layout/spacing/alignment detail.
- **Colors and fonts are NOT reliably exposed.** Tested: the transaction payload often returns only text + position + dimension per element, with no color or font attributes. So treat the **thumbnail as the primary source** for any color, contrast, or typography judgement, and treat transaction style data as best-effort (use it when present, don't depend on it). Never report a specific hex/font as fact unless the payload actually contained it.

## Workflow

### Step 1: Resolve the design
Short link → `Canva:resolve-shortlink`; full URL → extract the ID; raw `D...` ID → use directly; otherwise ask.

### Step 2: Read the design
- `Canva:get-design` for title and page count.
- `Canva:get-design-thumbnail` (and/or `Canva:get-design-pages`) to see each page.
- `Canva:get-design-content` for the text.
- Optional (typography/color detail): read-only transaction as described above, then cancel it.

### Step 3: Evaluate across dimensions
Assess the design against these lenses. Skip any that don't apply to the design type:

- **Visual hierarchy** — does the eye land on the most important thing first? Title/subtitle/body contrast.
- **Layout & spacing** — alignment, balance, crowding, consistent margins/gutters.
- **Copy & messaging** — clarity, length, tone, typos, jargon, a single clear takeaway per page.
- **Consistency** — repeated fonts, sizes, colors, and spacing across pages.
- **Readability & contrast** — text size vs. viewing context, text-on-image legibility, color contrast.
- **Accessibility** — contrast ratios, alt text, text not conveyed by color alone.
- **Fit for purpose** — does it suit the stated channel/audience (a slide ≠ an Instagram post ≠ a flyer)?

### Step 4: Return structured feedback
Organise findings by **page**, each with a **severity** and a **concrete fix**:

```
## Feedback — "<design title>" (N pages)

### Top priorities
1. [High] Page 2 — Title competes with the body text (same size/weight).
   Fix: bump the title to ~1.5× and bold it so it reads first.
2. [High] Page 4 — White caption over a light photo is hard to read.
   Fix: darken the image or add a scrim; or move the caption to a solid band.

### Page-by-page
**Page 1** — [Med] Three different accent colors; pick one. [Low] "recieve" → "receive".
**Page 2** — ...

### What's working
- Consistent margins; strong cover image.
```

Use severities **High / Med / Low**. Lead with the few highest-impact items, then the per-page detail. Be specific and located (page + element), not generic ("make it pop").

### Step 5: Offer to act
End by offering to implement the API-fixable items via **`canva-edit-design`**, and note which items need manual work in Canva (e.g. font-family or background changes the API can't touch — see `canva-edit-design` for the full CANNOT list).

## Rules
- Never edit or commit anything — this skill is strictly read-only. If you open a transaction to inspect, always `cancel-editing-transaction`.
- Ground every point in something you actually observed in the thumbnail or content — no generic advice.
- Prioritise. A ranked shortlist beats an exhaustive list the user won't read.
- Be candid but constructive; always pair a problem with a specific fix.
