---
name: "import.codex.canva.canva-implement-feedback"
description: "Implement reviewer feedback on a Canva design. Reads all comment threads, synthesises what reviewers want, makes the clear-cut changes directly, and flags anything that needs a human decision. Use when the user asks to \"implement feedback on my deck\", \"address comments on a design\", \"apply review feedback\", \"fix the comments on my presentation\", or \"implement the feedback\"."
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

# Feedback to Finished

A deck has been out for review — stakeholders have left comments scattered across slides. This skill reads every thread, summarises what reviewers actually want, makes the clear-cut changes directly, and flags anything ambiguous for a human decision.

## Canva Editing API — What You Can and Cannot Do

Before triaging feedback, you MUST know these constraints. This avoids wasted back-and-forth with the user on changes that are impossible via the API.

### What the API CAN do (via `perform-editing-operations`)

- **Text content**: replace entire text elements (`replace_text`), find-and-replace substrings (`find_and_replace_text`)
- **Text formatting**: font size, font weight (bold), font style (italic), text color, text alignment, line height, text decoration (underline), strikethrough, links, list formatting
- **Media**: replace images/videos (`update_fill`), insert new images/videos (`insert_fill`), delete elements (`delete_element`)
- **Layout**: reposition elements (`position_element`), resize elements (`resize_element`)
- **Metadata**: update design title (`update_title`)

### What the API CANNOT do

- Change font family/typeface — only size, weight, and style are supported
- Add new text elements — you can only insert media (images/videos), not new text boxes
- Change background colors or gradients
- Add, remove, or reorder pages/slides
- Modify animations or transitions
- Change element opacity (except on newly inserted fills)
- Group/ungroup elements
- Modify shapes (color, border, etc.) — only text within shapes can be edited

### Triage rule

When a comment requests something in the "CANNOT do" list, classify it as **Requires manual action**. Don't dwell on the limitation — simply note it in the summary and move on. These are normal; most design reviews will have a mix of API-supported and manual changes. Save the details for the manual changes checklist at the end (Step 7).

## Workflow

### Step 1: Resolve the Design

- If the user provides a short link (`canva.link`), call `Canva:resolve-shortlink` to get the design URL
- If the user provides a full Canva URL, extract the design ID from the URL
- If the user provides a **design ID** directly (typically starts with `D`, e.g. `DABcd1234ef`), use it as `design_id`; **do not** use `Canva:search-designs` for a raw ID
- Otherwise ask for the design ID or link

### Step 2: Read All Feedback

- Call `Canva:list-comments` with the design ID to get every comment thread
- For each thread with replies, call `Canva:list-replies` to capture the full conversation
- Call `Canva:get-design-content` to read the current text on every page

### Step 3: Triage the Feedback

Classify each comment thread into one of these categories:

- **Actionable** — a change that the API supports and you can reasonably interpret. Use your best judgement — if a comment says "make the title punchier", rewrite it to be punchier rather than flagging it as ambiguous. If a comment says "fix the spacing", look at the design content and make a reasonable adjustment. Only escalate to the user when you genuinely cannot determine what the reviewer intends (e.g., two reviewers directly contradict each other, or a comment references something you can't find in the design).
- **Requires manual action** — the reviewer wants something the API cannot do (font family change, new text element, background change, page reorder, etc.). Note these briefly in the summary — full details go in the manual changes checklist (Step 7).
- **Resolved** — already addressed, explicitly marked done, or is a positive acknowledgement (e.g., "LGTM", "looks good")

Present a summary to the user organised by category: what you plan to change, what needs clarification, what must be done manually, and what you're skipping.

### Step 4: Get User Approval — ONE time only

- Present the plan and wait for the user to approve
- If the user wants adjustments, update the plan and confirm once more

**This is the only confirmation point in the entire workflow. Once the user says yes, go.**

### Step 5: Apply and Commit the Changes

**Do NOT ask the user again.** They already approved. Execute all of these in sequence immediately:

- Call `Canva:start-editing-transaction` to begin an editing session
- Call `Canva:perform-editing-operations` to make each approved change (batch all operations in a single call where possible)
- Call `Canva:commit-editing-transaction` to save — do NOT ask "shall I commit?" or "ready to save?"
- Show the thumbnail from the editing response to the user as confirmation

### Step 7: Present Remaining Manual Changes

After committing (or if no API-supported changes were possible), present a clear checklist of everything that still needs to be done manually in the Canva editor:

```
## Changes to make manually in Canva

1. **Slide 3 — Change heading font to Montserrat**
   Reviewer: @Sarah | Why: API cannot change font family
   → Open slide 3, select the heading, change font to Montserrat

2. **Slide 7 — Add a new text box for the disclaimer**
   Reviewer: @James | Why: API cannot add new text elements
   → Add a text box below the chart with: "Source: Q3 2025 internal data"

3. ...
```

Include the slide number, what to change, who requested it, and step-by-step instructions so the user can work through the list quickly.

### Step 8: Resolve Comment Threads

- After committing, call `Canva:reply-to-comment` on each actionable thread to note what was changed
- For "Requires manual action" threads, reply noting what was done as the closest alternative and what still needs manual attention
- This closes the feedback loop so reviewers can see their comments were addressed

## Rules

- Be helpful, not cautious — interpret feedback generously and make your best attempt at a change rather than labelling it "ambiguous" and giving up. The user can always reject your changes in the approval step.
- Only escalate to the user when you genuinely can't figure out the intent — two reviewers directly contradict each other, or a comment references something you can't find in the design
- When reviewers disagree, present both sides and let the user decide
- Show the summary of planned changes and wait for approval ONCE — after that, execute everything without further confirmation
- NEVER ask "shall I commit?", "ready to save?", or any variation — the user's initial approval covers the entire edit-and-commit flow
- Manual changes are normal and expected — don't over-explain or apologise for API limitations, just include them in the checklist
- Batch operations: use a single `perform-editing-operations` call with multiple operations rather than one call per change
