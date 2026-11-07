---
name: "import.codex.data-analytics.publish-artifact-to-sites"
description: "Publish a validated Data Analytics report or dashboard artifact through Sites. Use automatically for durable artifacts in any positively identified Work Mode when the full Sites lifecycle is callable, or in ChatGPT Desktop outside Work Mode only after an explicit Sites request or acceptance of the optional post-handoff sharing offer."
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

# Publish Artifact To Sites

Use this skill after the report or dashboard workflow produces a complete canonical manifest and bounded snapshot and `validate_artifact` succeeds. It publishes the Data Analytics reader runtime as a Sites-hosted snapshot; it does not add live source connections to the Site.

## Routing Contract

- In any positively identified Work Mode, a durable report or dashboard request selects Sites automatically when the full Sites building and hosting lifecycle is callable. Do not ask for another delivery choice or publish confirmation.
- In ChatGPT Desktop outside Work Mode, use this skill only after the user explicitly requests Sites or explicitly accepts the optional coworker-sharing offer made after a successful final MCP artifact handoff. A report or dashboard request alone does not authorize publishing there.
- If the full Sites lifecycle is not callable in Work Mode, use the self-contained HTML fallback selected by the owning report or dashboard workflow.

## Workflow

1. Confirm that `$sites-building` and `$sites-hosting` are both callable for the full Sites create, checkpoint, and deployment lifecycle.
2. Invoke `$sites-building` to create or reopen one worker-starter checkout per logical report or dashboard. For a new Site, select the worker starter (`--starter worker`). Reuse that Site for later versions.
3. Read the Site's current access policy with the Sites connector. Treat a workspace Site as verifiably owner-only only when it is `custom`, has exactly one `allowed_account_user_id`, its sole `allowed_users` entry has the same account-user id and a non-empty email, and it has no allowed groups. If the user asked to widen reader access, defer that access change until after the package is exported so the verified creator seed is not lost. Do not infer a creator from an already-shared reader allowlist.
4. Call `export_artifact_package` with the validated payload, the Sites project id in the compatibility field `site_creator_project_id`, and the returned checkout path as `output_dir`. When the current workspace policy is verifiably owner-only, pass its sole resolved email as `site_editor_email`; the exporter hashes it before writing source. Otherwise omit the field so an existing editor seed or explicit disabled state is preserved. Pass `site_editor_email: null` only when the user explicitly asks to disable presentation editing. After export succeeds, apply any reader-access change the user explicitly requested, then checkpoint and deploy with the same approval boundary.
5. Verify that every returned source/schema/hosting path is inside the checkout, and separately verify that the hosting metadata contains the resolved project id. Presentation editing requires the logical D1 binding `DB`; do not replace another binding name. A read-only export may omit `database_schema_path`.
6. Checkpoint the checkout through `$sites-building`, then invoke `$sites-hosting` to poll the deployment to a terminal state.
7. Return the Sites URL and artifact snapshot timestamp, and state that the published data is a snapshot rather than a live connection. When presentation editing is enabled, state that only the seeded creator can edit title/text/layout, delete blocks, or launch refresh and export handoffs; saved presentation overrides remain in Sites rather than syncing back to ChatGPT Desktop.

## Fallbacks And Failures

- If the full Sites lifecycle is unavailable or publishing fails after one targeted retry in Work Mode, automatically switch to the owning workflow's self-contained HTML mode, state the failed stage briefly, and do not claim that a Site was published.
- If the user explicitly requested only Sites, report the blocker instead of switching surfaces without their consent.
