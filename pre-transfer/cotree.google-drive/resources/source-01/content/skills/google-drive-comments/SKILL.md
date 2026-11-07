---
name: "import.codex.google-drive.google-drive-comments"
description: "Write, reply to, and resolve Google Drive comments on Docs, Sheets, Slides, and Drive files with evidence-backed location context. Use when the user asks to leave comments, review a file with comments, respond to comment threads, or resolve Drive comments."
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

# Google Drive Comments

Use this skill for comment workflows in the unified Google Drive plugin. Drive comments can apply to Docs, Sheets, Slides, and generic Drive files, but API-created comments may appear unanchored in the Google editor UI. Every new top-level comment must therefore include enough surface-specific evidence for the reader to find the target without relying on native UI anchoring.

## Workflow

1. Ground the target file first.
- If the user did not provide an exact file URL or ID, search Drive, list recent files, list folders, or read metadata until the target file is unambiguous.
- Identify whether the file is a Google Doc, Sheet, Slides deck, or generic Drive file before drafting comments.

2. Read the surface that will be commented on.
- For Docs or text-like files, read the document text around each likely target.
- For Sheets, read spreadsheet metadata first, then read the specific sheet tabs and ranges that may receive comments.
- For Slides, read the presentation outline or text first, then read specific slides or thumbnails when visual context is needed.
- Do not guess a target quote, slide number, sheet name, or cell range from memory or search snippets.

3. Draft all intended comment updates before writing.
- Prefer one `bulk_update_file_comments` call for all creates, replies, and resolves in the same user request.
- Keep the batch to the action limit exposed by the tool. If the request needs more comments than the limit, ask before splitting into another batch.
- For replies and resolves, use existing comment IDs from the live comment thread data.

4. Attach surface-specific evidence to every new top-level comment.
- The comment body must explicitly name or quote the target evidence, because the Google editor UI may not show API-created anchors.
- Docs or text-like files: include `quoted_text` with the exact sentence, phrase, heading, or nearby text the comment refers to. Also quote that same text in the comment body when the critique would otherwise say "this sentence" or "this paragraph."
- Sheets: include `sheet_cell_range` with the sheet name and A1 cell or range, such as `Budget!C12` or `Pipeline!A2:D10`. Also name that sheet and range in the comment body, and include `quoted_text` when a displayed value, header, formula, or label would make the target clearer.
- Slides: include `slide_number`. Also name that slide number in the comment body, and include `quoted_text` when commenting on a title, bullet, label, chart text, or other visible slide text.
- Generic Drive files: if no structured surface exists, make the comment content explicitly name the file-level, page-level, timestamp-level, or section-level evidence it refers to.

5. Reject vague comments before sending them.
- Do not create comments that say only "this sentence," "this paragraph," "this slide," "this cell," or similar without the matching evidence field.
- If the model has a useful critique but cannot identify the exact evidence target, either turn it into an explicitly file-level summary comment or omit it and say the target was not specific enough.
- Do not rely on tool fields alone for location context. If the comment body would feel hand-wavy after removing the hidden tool fields, rewrite it before sending.

6. Verify the result.
- After writing, summarize how many comments were created, replied to, or resolved.
- Mention the evidence used for the highest-risk comments, especially any file-level comments that intentionally do not target a specific quote, slide, or cell.

## Limitations

- Do not rely on Drive comment `anchor` data for Google Docs, Sheets, or Slides unless the connector explicitly documents a provider-supported shape for that surface. Drive API-created comments may still display as unanchored in the Google editor UI.
- The evidence fields are the durable location contract for this workflow: exact quoted text for Docs and text-like files, sheet/cell range for Sheets, and slide number plus visible text for Slides.
