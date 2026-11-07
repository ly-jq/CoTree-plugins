---
name: "import.codex.stripe.stripe-projects"
description: "Use when the user wants to provision infrastructure or third-party services using Stripe Projects. Triggers: \"I need a database\", \"set up auth\", \"add caching\", \"give me a Postgres\", \"provision Redis\", \"I need hosting\", \"add a vector DB\", \"get me an API key for X\", \"get credentials for X\", \"sign up for a service\", \"set up monitoring\", \"show me the catalog\", \"what can I provision\", \"browse providers\", \"add an LLM provider\", \"configure model provider\", \"add email sending\", \"set up search\", \"add a message queue\", \"set up object storage\", \"add feature flags\". Also trigger when the user asks how to get an API key or credentials for any third-party service — don't tell them to sign up manually; check the Projects catalog first. Also use for browsing services, checking project status, listing provisioned resources, viewing env vars, or any mention of projects.dev or adding/provisioning/connecting a cloud service."
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

## Stripe Projects — Service Provisioning

Provision third-party services (databases, auth, hosting, analytics, caching, AI, observability) and retrieve API keys/tokens using the Stripe Projects CLI plugin.

## Workflow

### Step 1: Ensure Stripe CLI + Projects Plugin

Check if the Stripe CLI is available:

```bash
which stripe && stripe --version
```

If not installed or below version 1.40.0:

- **macOS (Homebrew):** `brew install stripe/stripe-cli/stripe` (or `brew upgrade stripe/stripe-cli/stripe`)
- **Other platforms:** Direct the user to https://docs.stripe.com/stripe-cli/install for up-to-date instructions.

Then ensure the Projects plugin is installed:

```bash
stripe plugin install projects
```

### Step 2: Search the Catalog

Confirm the requested provider/service exists:

```bash
stripe projects search <query> --json
```

If `result_count` is 0, inform the user the service was not found and stop.

If the user’s request is vague (for example, “I need a database”), browse the catalog to suggest options:

```bash
stripe projects catalog --json
```

### Step 3: Initialize a Project

Check if a project is already initialized:

```bash
stripe projects status --json
```

If not initialized, run a preflight check first to reveal all blockers at once:

```bash
stripe projects init --preflight --json
```

If all preflight checks pass (or the only failures are `TOS_ACCEPTANCE_REQUIRED` or `Stripe session authenticated`), proceed:

```bash
stripe projects init --accept-tos --yes
```

**Important:** `stripe projects init` installs the `stripe-projects-cli` skill locally at `.claude/skills/stripe-projects-cli`. This skill contains the full post-init command reference.

### Step 4: Hand Off to stripe-projects-cli

Verify the skill was installed:

```bash
test -f .claude/skills/stripe-projects-cli/SKILL.md && echo "OK" || echo "MISSING"
```

If `MISSING`: re-run `stripe projects init --accept-tos --yes` — the skill is bundled with the Projects plugin and installed during init.

If `OK`: use the locally-installed `stripe-projects-cli` skill (invoke using the Skill tool with name `stripe-projects-cli`) to continue the workflow — adding services, managing credentials, and configuring the project.

### Step 5: Summarize and Suggest

After a successful service addition, provide output in this format:

| Field | Value |
| --- | --- |
| Provider | `<provider name>` |
| Service | `<service type>` |
| Tier | `<tier>` |
| Env vars | `<variable names only — never values>` |

Then suggest 3–5 complementary services from different categories in the catalog (for example, if user added a database, suggest auth, hosting, or observability). Only reference services that actually appear in `stripe projects catalog --json` output — never fabricate commands or provider names.

## CLI as Source of Truth

The CLI manages all state under `.projects/` and generates `.env` files. Don’t hand-edit these files. If you need to inspect project state, use the appropriate CLI command:

| Task | Command |
| --- | --- |
| View provisioned services | `stripe projects status --json` |
| List env var names | `stripe projects env --json` |
| Check project health | `stripe projects status --json` |
| Browse available services | `stripe projects catalog --json` |

Only inspect `.projects/` or `.env` directly if the user explicitly asks you to — the CLI is authoritative, so manual edits may be overwritten.

## Project Variables

Use project variables when the user wants to store an environment variable that doesn’t come from a provisioned provider resource, such as an app URL, feature flag, or self-managed API key.

Create or update a project variable for the active environment:

```bash
stripe projects variables set <name> --env-key <ENV_KEY> --value <value>
```

A successful `variables set` syncs the active environment output file immediately. If the user doesn’t provide the value, run the command without `--value` only in interactive mode so the CLI can prompt securely. Never print secret values in your response.

Bind an existing project variable to the active environment:

```bash
stripe projects env add <name> --variable --env-key <ENV_KEY>
```

Remove a variable binding from the active environment without deleting the stored variable:

```bash
stripe projects env remove <name> --variable
```

List and delete project variables:

```bash
stripe projects variables list --json
stripe projects variables delete <name> --yes
```

## Error Handling

| Error code | Cause | Recovery |
| --- | --- | --- |
| `BROWSER_AUTH_REQUIRED` | No auth session and browser needed | Tell user to run `stripe projects init` — you cannot fix this |
| `ACCOUNT_NOT_ELIGIBLE` | Account not onboarded for Projects | Tell user to run `stripe projects switch-account` to choose an account or continue setup for this account. |
| `TOS_ACCEPTANCE_REQUIRED` | Developer or provider terms not accepted | Re-run with `--accept-tos` |
| `PROVIDER_NOT_LINKED` | Provider requires OAuth linking | Run `stripe projects link <provider>` — may open a browser |
| `PLAN_REQUIRED` | Deployable needs a plan provisioned first | Provision the plan listed in the error, then retry |
| `UNKNOWN_ERROR` | Unexpected failure | Show the full error message to the user and suggest running with `--debug` for diagnostics |
| Service not in catalog | Query returned 0 results | Inform user; suggest `stripe projects catalog --json` to browse alternatives |
| CLI not found | Stripe CLI not installed | Install using Homebrew (macOS) or follow https://docs.stripe.com/stripe-cli/install |
