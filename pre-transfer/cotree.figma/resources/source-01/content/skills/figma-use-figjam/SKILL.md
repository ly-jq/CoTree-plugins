---
name: "import.codex.figma.figma-use-figjam"
description: "This skill helps agents use Figma's use_figma MCP tool in the FigJam context. Can be used alongside figma-use which has foundational context for using the use_figma tool."
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

# use_figma — Figma Plugin API Skill for FigJam

This skill contains FigJam-specific context for the `use_figma` MCP tool. The [figma-use](../figma-use/SKILL.md) skill provides foundational context for plugin API execution via MCP as well as the full Figma plugin API for more advanced use-cases that are not described here.

**Always include `figma-use-figjam` in the comma-separated `skillNames` parameter when calling `use_figma` for FigJam operations. If this skill was loaded via an MCP resource, you MUST prefix the name with `resource:` (e.g. `resource:figma-use-figjam`).** This is a logging parameter used to track skill usage — it does not affect execution.

> **FigJam URL is `figma.com/board/...`.** Do NOT call `figma.createPage()` in FigJam — it throws `TypeError: figma.createPage no such property 'createPage' on the figma global object`. `createPage()` is a Design-file API only (`figma.com/design/...`). FigJam files have a single implicit page; organize content with sections instead (see [create-section](references/create-section.md)).

## Inspecting FigJam Files

**`get_figjam` is the inspection tool for FigJam files.** It returns the full node tree as XML, including IDs of pages, sections, stickies, connectors, and other nodes you need to reference in subsequent `use_figma` calls.

- **Use `get_figjam` upfront** before writing any `use_figma` code that needs to reference existing nodes (page IDs, section IDs, etc.). Don't try to discover IDs by running an inspection script — `console.log` output from `use_figma` is **not returned to the agent** (see [figma-use Critical Rule #4](../figma-use/SKILL.md)). Only the `return` value comes back.
- **`get_metadata` does NOT work on FigJam files** — it is design-mode only and will fail immediately with "unsupported for FigJam files".
- **`get_screenshot` requires a valid `nodeId`** — passing an empty nodeId returns "invalid nodeId" error. Get IDs from `get_figjam` first.
- If you forgot to `return` an ID from a previous `use_figma` call and need it now, call `get_figjam` rather than re-running an inspection script.

## Loading Reference Docs Efficiently

Load only the references your task needs — but when you do need to load multiple, **issue all reads in a single parallel tool-call batch**, not sequentially across turns. For a typical board-creation task, that means a single message containing reads for `plan-board-content` plus the 3-4 specific node-type references you'll use.

## Deferred Tools — Batch-Load Schemas

The Figma MCP tools (`use_figma`, `get_figjam`, `get_screenshot`, `get_metadata`, `create_new_file`, `whoami`) often appear as deferred tools that require `ToolSearch` to load their schemas before they can be called. **Load all schemas in a single `ToolSearch` call** using the `select:` syntax instead of one call per tool:

```
ToolSearch query="select:use_figma,get_figjam,get_screenshot,get_metadata,create_new_file"
```

Six sequential `ToolSearch` calls is six round trips before any work happens. One batched call is one round trip.

## Text Mutations — Canonical Recipe

Every FigJam text mutation (sticky/shape/label/table cell/connector text, standalone text nodes) follows the same recipe as Design files: load font → `await` → mutate → return affected IDs. Skipping the load throws `Cannot write to node with unloaded font "<family> <style>"`. See [figma-use → gotchas.md → Canonical text-edit recipe](../figma-use/references/gotchas.md#canonical-text-edit-recipe-font-load--await--mutate--return-ids). FigJam-specific note: sublayer defaults vary (sticky → `Inter Medium`, shape → `Inter Medium`, connector → invalid until set), so always load from `node.text.fontName` rather than hardcoding `{ family: 'Inter', style: 'Regular' }`.

## Adding Images to a FigJam Board

**`upload_assets` is the ONLY supported way to add images to a FigJam file.** Do NOT use `figma.createImage()` or `figma.createImageAsync()` from inside `use_figma` — they are unsupported as image-upload entry points in FigJam. Call `upload_assets` with the FigJam `fileKey`; the tool returns single-use upload URLs that you POST raw image bytes to, and the image is committed and placed automatically. Pass `nodeId` (with `count: 1`) to attach the upload to an existing FigJam node as a fill; omit `nodeId` to drop the image onto the board as a new layer.

For the full request/response shape, see [figma-use → api-reference.md → Images](../figma-use/references/api-reference.md#images).

## Reference Docs

- [plan-board-content](references/plan-board-content.md) - Read this for any board content request — board template, retro, brainstorm, ice breaker, meeting board, scaffold
  - Covers planning of generated board content, including sequential outline, sections, intents, and hierarchical text
  - Delegates to other references for specific API details
- [create-section](references/create-section.md) — Create and configure FigJam sections (sizing, naming, colors, content visibility, organizing nodes, column layouts)
- [create-sticky](references/create-sticky.md) — Create and configure FigJam sticky notes (colors, sizing, text, author visibility, batch creation)
- [create-connector](references/create-connector.md) — Create and configure FigJam connectors (endpoints, arrows, line types, labels, colors, diagram wiring)
- [create-text](references/create-text.md) — Create and configure FigJam text nodes (font loading, preset fonts and colors, sizing, lists, mind map operations)
- [position-figjam-nodes](references/position-figjam-nodes.md) — Position, size, and reparent nodes on the canvas (including within sections)
- [create-shape-with-text](references/create-shape-with-text.md) — Create and configure FigJam shapes with embedded text (shape types, color presets, sizing to fit text, diagram layouts)
- [create-code-block](references/create-code-block.md) — Create and configure FigJam code block nodes (languages, syntax highlighting, positioning, embedding in sections)
- [create-table](references/create-table.md) — Create and configure FigJam tables (rows, columns, cell text, color presets, resizing)
- [edit-text](references/edit-text.md) — Edit existing text nodes (font loading, styled ranges, find/replace, FigJam Charcoal default color)
- [create-label](references/create-label.md) — Create and configure FigJam label nodes (small numbered/lettered circle callout markers, sequences, positioning)
- [batch-modify](references/batch-modify.md) — Patterns for modifying many existing nodes at once (bulk style changes, repositioning, property updates)
- [figjam-colors](references/figjam-colors.md) — Canonical FigJam color palettes for every node type (sticky, section, connector, shape, label) plus the `hex/255` notation rule and the `h()` helper
