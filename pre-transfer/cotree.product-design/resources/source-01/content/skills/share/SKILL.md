---
name: "import.codex.product-design.share"
description: "Share a runnable prototype using the user's preferred deployment tool."
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

# Share

Deploy the user's runnable prototype so they can share it with others.

## Critical Overrides

- Refer to the Plugin router [$index](../index/SKILL.md) before proceeding.
- Follow [$critical-overrides](../../references/critical-overrides.md).

## User Context

Before starting, load [$user-context](../user-context/SKILL.md) and run its preflight script when local shell access is available.

Use saved product URLs, Figma files, screenshots, reference images, codebase paths, Storybook, tokens, design systems, brand assets, component refs, browser preferences, and share targets as grounding material when relevant.

Do not inspect every saved reference. Inspect only what the current task needs.

## Workflow

1. Confirm the prototype directory and the user's preferred deployment target.
2. If the user invokes Product Design with @Sites, @Vercel, or another deployment tool, treat that as the selected hosting target.
3. If the user did not choose a target, ask one question:

> Where should I deploy this: @Sites, @Vercel, or another target?

4. Before using Sites for a fresh Product Design prototype, keep the existing project intact. Run `npm run build` and `npm run test:sites`; for `mobile-app`, run `npm run check:runtime` first. Confirm `dist/client/index.html`, `dist/server/index.js`, `dist/.openai/hosting.json`, and source `.openai/hosting.json` exist. Hand that verified project to `sites-hosting`. Do not invoke `sites-building`, run `init-site.sh`, or replace the Product Design runtime with a Vinext starter.
5. Use the selected deployment tool when it is available.
6. If the selected tool is not available, say that clearly and ask whether to use another target.
7. Run the deployment when possible. Do not give setup instructions if you can complete the deployment directly.
8. Return the shareable URL.
9. State any misses or manual follow-up the user still needs to do.

## Rules

- Do not deploy before the user chooses or confirms the target.
- Do not claim the prototype is shared until you have a working URL.
- If the selected tool is not available, say that clearly and ask whether to use another target.
