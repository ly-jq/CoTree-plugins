---
name: "import.codex.canva.canva-translate-design"
description: "Translate all text in a Canva design to another language, creating a translated copy. Faster than manually copying and editing each text box in Canva's editor. Use when users say \"translate my design to [language]\", \"make a Spanish/French/etc version\", or \"localize my Canva design\"."
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

# Canva Translate

Translate all text elements in a Canva design to a target language, creating a new copy with translated content.

## Workflow

### 1. Locate the Design

If user provides a **design ID** directly (typically starts with `D`, e.g. `DABcd1234ef`), use that as the design identifier; **do not** pass it to `Canva:search-designs` (search is for titles, not IDs).

If user provides a **URL**: Extract the design ID from the URL (format: `https://www.canva.com/design/{design_id}/...`).

If user provides a **name**: Use `Canva:search-designs` to find the design by title. If multiple matches, ask user to clarify.

### 2. Create a Translated Copy

Use `Canva:resize-design` with the same dimensions to create a copy. This preserves the original design untouched.

### 3. Start Editing Transaction

Use `Canva:start-editing-transaction` on the new copy to get:
- `transaction_id` for making edits
- All text elements with their `element_id` and current text content

### 4. Translate Text

For each text element returned:
1. Translate the text to the target language (use Claude's translation capability)
2. Preserve formatting cues (line breaks, emphasis patterns)
3. Keep proper nouns, brand names, and technical terms as appropriate

### 5. Apply Translations

Use `Canva:perform-editing-operations` with `replace_text` operations for all translated elements. Batch all replacements in a single call.

Also update the design title to indicate the language (e.g., append " (Spanish)" or use translated title).

### 6. Commit Changes

After showing the user the translated preview thumbnail:
1. Ask for explicit approval to save
2. Use `Canva:commit-editing-transaction` to finalize
3. Provide the link to the new translated design

## Example Interaction

**User**: Translate my "Summer Sale Poster" to French

**Steps**:
1. Search: `Canva:search-designs` with query "Summer Sale Poster"
2. Copy: `Canva:resize-design` to create duplicate
3. Edit: `Canva:start-editing-transaction` on copy
4. Translate all text elements to French
5. Apply: `Canva:perform-editing-operations` with all `replace_text` operations
6. Show preview, get approval, commit

## Important Notes

- Always create a copy—never modify the original design
- Batch all text replacements in one `perform-editing-operations` call for efficiency
- If translation significantly changes text length, warn user that layout adjustments may be needed in Canva
- For designs with many pages, translate all pages in the same transaction
