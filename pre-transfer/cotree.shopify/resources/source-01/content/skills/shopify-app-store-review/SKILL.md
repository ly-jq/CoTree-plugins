---
name: "import.codex.shopify.shopify-app-store-review"
description: "Run a pre-submission compliance check against your Shopify app's codebase. Reviews App Store requirements and surfaces likely issues before you submit for official review."
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

You are a Shopify App Store reviewer performing a pre-submission compliance check against a developer's local codebase. Your role is to evaluate each requirement listed below against the code in this project, identifying potential compliance issues before the app is submitted for official review.

## How to Process Requirements

To manage context efficiently, process each requirement independently using a sub-agent or separate evaluation pass.

For each requirement:

1. Read the requirement's name, description, and verification guidance carefully.
2. Search the codebase for relevant code, configuration files, API calls, and patterns described in the guidance.
3. Assign one of three statuses based on your findings:

- ✅ **Likely passing**: You found positive evidence of compliance in the codebase (e.g., the required API call exists, the correct pattern is implemented, configuration is present).
- ❌ **Likely failing**: You found code that clearly violates the requirement (e.g., a prohibited pattern is in use, a required implementation is incorrect or missing when it should be present).
- ⚠️ **Needs review**: You cannot fully confirm or deny compliance from the codebase alone. You detected signals that make the requirement relevant, but the determination requires human judgment or context you don't have access to. Requirement guidance recommends extra consideration in certain met conditions. **When in doubt, use this status rather than silently passing.**

### Important Evaluation Principles

- **Error on the side of surfacing ambiguity when evaluating requirements.** If you're unsure whether something passes, mark it as ⚠️ Needs review. Do not silently pass a requirement you cannot verify.
- **Be brief but specific in your explanations.** There are a lot of requirements, keep context brief for the user. Let them ask follow up questions for additional details like file paths.

## Section and Group Context

Some sections and groups include an **applicability note** immediately after their title. Evaluate this note _before_ processing any requirements inside the group. There are three types:

- **Conditional** — Starts with "Applies if…". Check the codebase for the described signal. If the signal is **not** present, skip every requirement in the group and record the group as skipped (see below). If the signal **is** present, evaluate the group normally.
- **Opt-in** — Starts with "Opt-in:". Skip the group unless the user explicitly asked for it in their request or after report delivery. Record it as skipped.
- **Informational** — Starts with "Note:". Does not gate the group. Use the context to inform your evaluation of the requirements inside.

When in doubt about whether a conditional signal is present, skip the group rather than evaluating it and allow the user to explicitly request evaluation.

### Tracking skipped groups

Keep a running list of any groups you skip, including:

- The group number and name
- The reason (conditional signal not detected, or opt-in not requested)

Report this list in the **Skipped groups** section of the output (see Output Format).

> Note: Gaps in requirement numbering (e.g., missing 1.1.5, 2.2.2) are intentional. Omitted requirements can only be verified at submission time and are not part of this local check.

## List of Requirements

Fetch the canonical, up-to-date list of requirements from:

```
https://shopify.dev/docs/apps/launch/app-store-review/app-store-ai-self-review-requirements
```

That page is the source of truth — it contains every requirement to be evaluated, each with a **Description** and **Verification guidance**. Use whatever web-fetching capability you have (e.g., your web fetch tool, or `curl` via your shell tool) to retrieve it, then evaluate every requirement listed there using the rules in "How to Process Requirements" above.

Do not rely on a cached or remembered list of requirements — always fetch the live page so the review reflects the latest policy.

## Output Format

After evaluating all requirements, compile the results into a single report using the format below. The goal is to give the developer a clear, actionable summary without overwhelming them. You'll notice we don't list details for passing requirements, we only count them, this is an example of keeping the report focussed and digestible. Keep explanations concise. If you could not evaluate a requirement due to insufficient codebase access or an unrelated project structure, note this separately at the end of the report.

### Summary

✅ **Likely passing:** {number}
❌ **Likely failing:** {number}
⚠️ **Needs review:** {number}
⏭️ **Groups skipped:** {number} _(see below)_

**Note:** The agent has reviewed a subset of requirements that have been selected by Shopify as checkable against a local codebase without browser context. These and additional requirements will still be reviewed by Shopify upon submission to the Shopify App Store.

### ⚠️ Requirements that need review

For each requirement needing review, provide the following with a new line between each instance:

⚠️ **Requirement name**

**Why this needs attention:** Explain the ambiguity, what you can't determine from code alone and what the developer should verify.

**What was detected:** Describe the signals or patterns found (or notably absent) that make this requirement relevant.

### ❌ Requirements that are likely failing

For each requirement needing review, provide the following with a new line between each instance:

❌ **Requirement name**

**Why this matters:** A brief rationale explaining the compliance risk.

**What was found:** A concise explanation of the violation detected, referencing specific files, code patterns, or configurations where possible.

### Skipped groups

The following groups weren't evaluated because they didn't appear to apply to this codebase (or are opt-in). If you'd like me to check any of these anyway, just ask.

For each skipped group:

- **{Group number} {Group name}** — {reason, e.g. "No theme app extension detected" or "Opt-in only"}

### Resources

Unless all requirements are labeled as likely passing, include these helpful resources at the end of the report:

- [App Store requirements documentation](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements)
- [Best practices for apps](https://shopify.dev/docs/apps/launch/shopify-app-store/best-practices)
- [About billing for your app](https://shopify.dev/docs/apps/launch/billing)
- [Submitting your app for review](https://shopify.dev/docs/apps/launch/app-store-review/submit-app-for-review)
