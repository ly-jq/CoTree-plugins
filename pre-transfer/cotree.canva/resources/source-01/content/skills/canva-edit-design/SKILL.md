---
name: "import.codex.canva.canva-edit-design"
description: "Make edits to an existing Canva design — change or fix text, replace/insert/delete images and videos, reformat text (size, weight, style, color, alignment, lists, line height), reposition or resize elements, and update the title. Use when the user wants to change, edit, update, fix, translate, replace, or reformat content in a specific Canva design. This is the safe edit engine that other Canva skills (e.g. implement-feedback) build on."
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

# Canva Design Editing

The canonical, safe way to apply edits to an existing Canva design. Every Canva skill that mutates a design should follow this exact protocol: **start a transaction → perform operations → commit (with approval)**. Changes are draft-only until committed and are PERMANENTLY LOST if not committed.

## The Transaction Protocol (always these steps, in order)

1. **`Canva:start-editing-transaction`** — pass the `design_id`. Remember the returned `transaction_id` and the `pages` array; both are required by later calls. ALWAYS show the user the thumbnail(s) returned here.
2. **`Canva:perform-editing-operations`** — apply edits. Pass the `transaction_id`, the `pages` array from the previous response, the `page_index` of the first page being changed, and an `operations` array. Batch multiple operations into a single call wherever possible.
3. **`Canva:commit-editing-transaction`** — save. See the approval gate below. After committing, the `transaction_id` is invalid; a new edit needs a new transaction.
4. **`Canva:cancel-editing-transaction`** — discard the draft instead of saving (e.g. the user rejects the preview, or you opened a transaction only to inspect the design).

## Capabilities — what the API CAN and CANNOT do

### CAN (operations on `perform-editing-operations`)
- **Text content**: `replace_text` (whole element), `find_and_replace_text` (substring)
- **Text formatting** (`format_text`): font size, weight (normal/bold), style (normal/italic), color, alignment, line height, underline, strikethrough, links, list level/marker
- **Media**: `update_fill` (replace image/video), `insert_fill` (add image/video), `delete_element`
- **Layout**: `position_element`, `resize_element`
- **Metadata**: `update_title`
- **Autofill mapping**: `update_autofill_field` (fixed-page designs only)

### CANNOT
- Change font **family/typeface** (only size, weight, style)
- Add **new text elements** (you can only insert media, not new text boxes)
- Change background colors or gradients
- Add, remove, or reorder pages/slides
- Modify animations, transitions, or element opacity (except on newly inserted fills)
- Group/ungroup elements, or restyle shapes (only text inside shapes is editable)

When a requested change is in the CANNOT list, tell the user it must be done manually in the Canva editor — don't attempt a workaround.

## Responsive pages — restricted operation set

Some pages come back marked `is_responsive: true`. On those pages, ONLY these operations are allowed:
`update_title`, `replace_text`, `update_fill`, `delete_element`, `find_and_replace_text`.

Before calling `perform-editing-operations`, check the `pages` array. If any operation targets a responsive page with an unsupported op (e.g. `format_text`, `position_element`, `resize_element`, `insert_fill`), do NOT make the call — tell the user that operation isn't supported on that page and offer an alternative.

## The commit approval gate (required)

`commit-editing-transaction` makes changes permanent. You MUST show the user exactly what changed (and the preview thumbnail) and get explicit approval before committing — e.g. "Here's the preview. Save these changes to your design?" Wait for a clear yes.

- Do NOT commit without approval.
- Do NOT tell the user changes are saved before the commit call has succeeded.
- After a successful commit, give the user a direct link to open the design in Canva.
- If a commit fails, all changes are lost — start a new transaction to retry.

> Note for composing skills: a skill that already collects a single up-front approval for a batch of changes (e.g. `canva-implement-feedback`) should treat that approval as covering the commit and NOT ask again. Follow that skill's own confirmation rules; the gate above is the default for direct, ad-hoc edits.

## Workflow

### Step 1: Resolve the design
- Short link (`canva.link/...`) → `Canva:resolve-shortlink` to get the URL.
- Full Canva URL → extract the design ID (the segment after `/design/`).
- Raw design ID (starts with `D`) → use directly; do NOT search.
- Nothing provided → ask for the design ID or link.

### Step 2: Start the transaction and inspect
Call `Canva:start-editing-transaction`. Show the thumbnail(s). Use the returned content to locate the exact `element_id`s you need to target. (If you only needed to look, call `cancel-editing-transaction` and stop.)

### Step 3: Build and perform operations
Translate the user's request into concrete operations. Confirm scope first when a `find_and_replace_text` string could match in multiple places or contexts — ask which instances they mean. Batch all operations into one `perform-editing-operations` call when you can.

### Step 4: Preview and commit
Show the resulting thumbnail and a plain-language list of what changed. Ask for approval, then `commit-editing-transaction`. Share the edit link.

## Rules
- Always remember and reuse the `transaction_id` and `pages` array within a transaction.
- Never leave a transaction uncommitted without telling the user their draft was discarded.
- For destructive ops (`delete_element`, large `find_and_replace_text`), confirm scope before performing.
- Prefer one batched `perform-editing-operations` call over many small ones.
