---
name: "import.codex.canva.canva-branded-presentation"
description: "Create on-brand Canva presentations from an outline or brief. Use when the user asks to create a branded presentation, make an on-brand deck, turn an outline into slides, or generate a presentation from a brief. Input can be text directly in the message, a Canva design ID, a reference to a Canva doc by name, or a Canva design link (e.g., https://www.canva.com/design/...)."
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

# Canva Branded Presentation Creator

Create professional, on-brand presentations in Canva from user-provided outlines or briefs.

## Workflow

1. **Get the content source**
   - If the user provides text directly, use that as the outline/brief
   - If the user provides a **Canva design ID** directly (typically starts with `D`, e.g. `DABcd1234ef`), use it as `design_id` with `Canva:start-editing-transaction` to read its contents; **do not** use `Canva:search-designs` for a raw ID
   - If the user provides a Canva design link (e.g., `https://www.canva.com/design/DAG.../...`), extract the design ID from the URL and use `Canva:start-editing-transaction` to read its contents
   - If the user references a Canva doc by name, use `Canva:search-designs` to find it, then `Canva:start-editing-transaction` to read its contents

2. **List available brand kits**
   - Call `Canva:list-brand-kits` to retrieve the user's brand kits
   - If only one brand kit exists, use it automatically without asking
   - If multiple brand kits exist, present the options and ask the user to select one

3. **Generate the presentation**
   - Call `Canva:generate-design` with:
     - `design_type`: "presentation"
     - `brand_kit_id`: the selected brand kit ID
     - `query`: a detailed prompt following the presentation format below
   - Show the generated candidates to the user

4. **Finalize**
   - Ask the user which candidate they prefer
   - Call `Canva:create-design-from-candidate` to create the editable design
   - Provide the user with the link to their new presentation

## Presentation Query Format

Structure the query for `Canva:generate-design` with these sections:

**Presentation Brief**
- Title: working title for the deck
- Topic/Scope: 1-2 lines describing the subject
- Key Messages: 3-5 main takeaways
- Style Guide: tone and imagery style based on the brief

**Narrative Arc**
One paragraph describing the story flow (e.g., Hook → Problem → Solution → Proof → CTA).

**Slide Plan**
For each slide include:
- Slide N — "Exact Title"
- Goal: one sentence on the slide's purpose
- Bullets (3-6): short, parallel phrasing with specifics
- Visuals: explicit recommendation (chart type, diagram, image subject)
- Speaker Notes: 2-4 sentences of narrative detail

## Notes

- If multiple brand kits exist, confirm selection before generating; if only one, use it automatically
- If the outline is sparse, expand it into a complete slide plan with reasonable content
- For briefs (narrative descriptions), extract key points and structure them into slides
- Aim for clear, action-oriented slide titles
- Autofill requires a Canva Enterprise plan
