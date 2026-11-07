---
name: "import.codex.canva.canva-bulk-create"
description: "Bulk-create Canva designs from tabular data using a brand template with autofill fields, producing one design per row. Use when users say \"bulk create designs from this CSV\", \"generate one design per row\", \"create a design for each product\", \"batch generate from a template\", or \"autofill a template from a spreadsheet\". Accepts any tabular data source — uploaded files, pasted tables, JSON, or URLs."
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

# Canva Bulk Design Creation

Create one Canva design per row of data by autofilling a brand template with data tags.

## Workflow

### Step 1: Get the Data

Accept data in any form the user provides and extract a list of rows with named columns:

- **Uploaded file**: read the file and extract headers and rows
- **Pasted data**: parse markdown tables, tab-separated values, or JSON arrays directly from the chat
- **URL**: fetch the resource and parse the response as tabular data

If no data has been provided, ask the user to share it in whatever format is convenient for them.

Once parsed, show the user:
- Column headers found
- Number of rows (= number of designs that will be created)
- A preview of the first few rows

### Step 2: Select the Brand Template

If the user hasn't specified a template, search for autofill-capable ones:

```
Canva:search-brand-templates  dataset=non_empty
```

Show the results and ask the user to pick one. If they already named or described a template, search with that query.

### Step 3: Inspect the Template Schema

```
Canva:get-brand-template-dataset  template_id=<selected_id>
```

This returns the field names and types (text, image, chart) that the template expects.

### Step 4: Map CSV Columns to Template Fields

Present a mapping table to the user:

| Template Field | Type | Matched CSV Column | Notes |
|---|---|---|---|
| `product_name` | text | `Product Name` | auto-matched |
| `price` | text | `Price` | auto-matched |
| `hero_image` | image | *(none)* | no match — image fields need asset IDs |

**Matching rules:**
- Do case-insensitive, fuzzy matching between CSV headers and template field names
- Text fields can be filled directly from CSV string values
- Image fields require a Canva asset ID — see **Image Field Handling** below
- Chart fields require structured data — treat as advanced and ask the user for clarification

Confirm the mapping with the user before proceeding, especially if there are unmapped fields or ambiguous matches.

#### Image Field Handling

There are two ways a CSV can supply images for image-type template fields:

**Pattern A — CSV has a Canva asset ID column** (e.g. `image_asset_id`):
Use the asset ID value directly in the `autofill-design` call:
```json
{ "image": { "type": "image", "asset_id": "<value from CSV column>" } }
```

**Pattern B — CSV has an image URL column** (e.g. `image_url`):
URLs cannot be passed directly to `autofill-design`. Upload each URL to Canva first using `Canva:upload-asset-from-url`, capture the returned asset ID, then use it in the autofill call. Do the upload immediately before creating that row's design so failures stay localised.

**Pattern C — No image column in CSV:**
Ask the user whether to skip the image field (template default image stays) or abort. Skipping is safe — just omit the image key from the `data` payload entirely.

### Step 5: Bulk Create — One Design per Row

Loop through every CSV row and call `Canva:autofill-design` for each one. Call them **sequentially**, not all at once — the API may have rate limits and sequential calls are easier to debug.

For each row:

1. If the row has an image URL column (Pattern B), first call `Canva:upload-asset-from-url` to get a Canva asset ID.
2. Build the `data` payload from the confirmed field mapping:

```json
{
  "text_field_name": { "type": "text", "text": "<value from CSV>" },
  "image_field_name": { "type": "image", "asset_id": "<asset ID>" }
}
```

3. Call `Canva:autofill-design` with the template ID, data payload, and a descriptive title using the row number or a meaningful column value (e.g. `"Bulk Design - Row 3 - <identifier>"`).

Track results as you go:

```
Row 1 / 50: Created — <design_url>
Row 2 / 50: Created — <design_url>
Row 3 / 50: Failed — <error>
```

### Step 6: Report Results

After all rows are processed, summarise:

- Total rows attempted
- Successes (with links)
- Failures (with row number and reason)

Offer to save a summary CSV with columns: `row`, `status`, `design_url`, `error`.

## Notes

- Autofill requires a Canva Enterprise plan.
- For large CSVs (50+ rows), warn the user upfront that this will make N API calls and may take a while. Offer to do a test run on the first 3 rows before proceeding with the full batch.
- If some rows fail, continue with the rest — don't abort the whole batch.
- Skip rows where all mapped fields are empty and warn the user about them.
- If no CSV column matches a required template field, ask the user to confirm which column to use or whether to skip that field.
- Template field names are case-sensitive in the API — use the exact keys from `get-brand-template-dataset`.
- There is no "undo bulk create" — warn the user before starting large runs.
- Designs created this way are full Canva designs the user can further edit in their account.
