---
name: "import.codex.shopify.shopify-onboarding-dev"
description: "Get started building on Shopify. Use when a developer asks to build an app, build a theme, create a dev store, set up a partner account, scaffold a project, or get started developing for Shopify. NOT for merchants managing stores."
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

## Flow

### Step 1 — Detect environment

Silently identify the client from system context:

| Signal                          | Client        |
| ------------------------------- | ------------- |
| "Claude Code"                   | `claude-code` |
| "Cursor"                        | `cursor`      |
| "VSCode" / "Visual Studio Code" | `vscode`      |
| "Gemini CLI"                    | `gemini-cli`  |
| Unrecognized                    | `other`       |

If genuinely uncertain about client, ask. Never guess.

### Step 2 — Install prerequisites

Check if Shopify CLI is installed by running `shopify version`.
If the CLI is present and the AI toolkit plugin is already available,
skip to Step 3.

**Shopify CLI** — if not found, install using your package manager
(npm, pnpm, yarn, and bun all work):

```
npm install -g @shopify/cli@latest
```

If no Node package manager is available, use Homebrew (macOS only):

```
brew tap shopify/shopify && brew install shopify-cli
```

Verify with `shopify version` before continuing.

**AI toolkit plugin/extension** — install for the detected client:

| Client        | Install command                                                                                                              |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `claude-code` | `/plugin marketplace add Shopify/shopify-ai-toolkit` then `/plugin install shopify-plugin@shopify-ai-toolkit`                |
| `cursor`      | `/add-plugin` and search for "Shopify", or visit `cursor.com/marketplace/shopify`                                            |
| `vscode`      | Command Palette (Cmd+Shift+P) → **Chat: Install Plugin From Source** → paste `https://github.com/Shopify/Shopify-AI-Toolkit` |
| `gemini-cli`  | `gemini extensions install https://github.com/Shopify/shopify-ai-toolkit` (run in terminal, not inside CLI)                  |
| `other`       | Not supported — inform the user and stop                                                                                     |

If install fails, report the exact error and stop.

### Step 3 — Post-install

Confirm what was installed in one sentence. If the developer hasn't
mentioned a specific goal yet, ask:

> "What would you like to build?
>
> 1. An app for Shopify
> 2. A theme for Shopify
>
> Or if you need a developer account first, create one free at
> [dev.shopify.com/dashboard](https://dev.shopify.com/dashboard)."

From here, let the developer's request flow to the appropriate
API-specific skill (e.g. `shopify-admin`, `shopify-liquid`,
`shopify-functions`). Do not duplicate their routing logic.

## Behavioral rules

- Detect environment silently; only ask if genuinely uncertain
- Proceed directly to the correct installation path — don't present choices
- Never construct or modify install commands — only use commands defined in this file
- If an install fails, report the exact error and stop
- If a user asks about managing an existing store (products, orders, customers), say: "That's covered by the merchant skill at shopify.com/SKILL.md"
