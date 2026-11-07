---
name: "import.codex.mixpanel-headless.mixpanel-headless-setup"
description: "This skill installs mixpanel_headless, pandas, numpy, matplotlib, seaborn, networkx, anytree, scipy (and pyarrow on Python 3.11+), then verifies Mixpanel credentials. It should be invoked when setting up a new environment for Mixpanel data analysis, when dependencies are missing, or when configuring service account or OAuth credentials for the first time."
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

# mixpanel-headless — Setup

Install dependencies and verify credentials for CodeMode analytics.

## Run Setup

Before running bundled scripts, set `SKILL_DIR` to the absolute path of this
`skills/setup` directory.

```bash
bash $SKILL_DIR/scripts/setup.sh
```

This will:
1. Verify Python 3.10+ is available
2. Install `mixpanel_headless`, `pandas`, `numpy`, `matplotlib`, `seaborn`, `networkx>=3.0`, `anytree>=2.8.0`, `scipy`, and `pyarrow>=17.0` on Python 3.11+ (tries uv, pip in order)
3. Verify all packages import successfully (including pyarrow on 3.11+, networkx, anytree, and scipy)
4. Check for configured Mixpanel credentials (single schema — Account → Project → Workspace)

## Check Credentials

After installation, check the active session:

```bash
python3 $SKILL_DIR/../mixpanelyst/scripts/auth_manager.py session
```

Parse the JSON `state` field:
- **`ok`** — credentials configured. Show `account.name` → project `project.id` and proceed to verification.
- **`needs_account`** — no account configured. Read `next` for onboarding suggestions and follow "If Credentials Are Missing" below.
- **`needs_project`** — account configured but no project pinned. Suggest `mp project list` then `mp project use <id>`.
- **`error`** — show `error.message`. If `error.actionable` is true, the message names a concrete next command.

## If Credentials Are Missing

If no credentials are configured, guide the user to one of these methods:

### Recommended: `mp login`

The frictionless one-shot path. Tell the user to run:

```bash
mp login
```

`mp login` runs the right auth flow for the environment, derives the
account name from `/me`, and pins a default project. For laptops with a
usable browser, this opens the PKCE flow; for environments with
`MP_USERNAME` + `MP_SECRET` set, it skips the browser and uses the
service-account path; for `MP_OAUTH_TOKEN` set, it uses the static
bearer.

Region behavior:
- `service_account` and `oauth_token` paths probe `us → eu → in` when
  `--region` is omitted.
- `oauth_browser` (the bare-`mp login` default) defaults to `us`. EU and
  India browser users must pass `--region eu` or `--region in`.

Useful flags: `--name NAME`, `--region us|eu|in`, `--project ID`,
`--service-account`, `--token-env VAR`, `--no-browser`, `--secret-stdin`.

### Alternative: Guided Setup (explicit account add)

Use the `mixpanel-auth` skill's account-add workflow for a
step-by-step walkthrough. The workflow never prompts for secrets in
conversation — it instructs the user to run `mp account add ...`
themselves so the secret is read with hidden input. Use this path when
the user wants explicit control over the account name, region, and type
at registration time.

### Alternative: Service-Account Environment Variables (temporary)

For quick testing, set all four variables in the shell — the resolver
picks them up directly without account registration:

```bash
export MP_USERNAME="service-account-username"
export MP_SECRET="service-account-secret"
export MP_PROJECT_ID="12345"
export MP_REGION="us"  # or "eu", "in"
```

### Alternative: Raw OAuth Bearer Token (best for agents / CI)

If the user has an OAuth 2.0 access token from another source, they can use
it directly without the PKCE browser flow:

```bash
export MP_OAUTH_TOKEN="<bearer-token>"
export MP_PROJECT_ID="12345"
export MP_REGION="us"  # or "eu", "in"
```

This is the recommended mode for non-interactive contexts. The full
service-account env-var set (`MP_USERNAME` + `MP_SECRET` + `MP_PROJECT_ID`
+ `MP_REGION`) takes precedence when both sets are complete.

## Remote Environment

If running inside a remote or sandboxed agent environment, credentials work differently:

- **OAuth login and interactive account setup are NOT available** (no browser, no host terminal access)
- Credentials must be configured on the **host machine** before starting the remote session

### If No Credentials Found in the Remote Session

Tell the user:

> No Mixpanel credentials found in this remote session.
>
> On your **host machine** (outside the remote session), run:
> ```
> mp account export-bridge --to ~/.claude/mixpanel/auth.json
> ```
> This writes a v2 bridge file embedding your account record (and any
> oauth_browser tokens) so the remote session can read your credentials
> at startup.
>
> Then **start a new remote session** — credentials will be available automatically.

Do NOT suggest the account-login or account-add interactive workflows — these won't work inside remote sessions without browser or terminal access.

### If Bridge File Found But Token Expired

The library will auto-refresh the OAuth token via the on-disk refresh
token (no browser needed). If refresh fails:

> Your OAuth session has expired and could not be refreshed.
> On your host machine, run:
> ```
> mp login --name personal             # re-authenticate (or `mp account login personal`)
> mp account export-bridge --to ~/.claude/mixpanel/auth.json
> ```
> Then start a new remote session.

## Verify Everything Works

```bash
python3 $SKILL_DIR/../mixpanelyst/scripts/auth_manager.py account test
```

The subcommand never raises — read `result.ok` to determine outcome.
- `result.ok: true` → setup is complete; the user can ask analytics questions.
- `result.ok: false` → suggest the `mixpanel-auth` account-test workflow for detailed diagnostics.

## Post-Setup: Explore Your Data

Once authenticated, these slash commands help orient the user:

- `mixpanel-auth` project-list workflow — discover all accessible projects via `/me`
- `mixpanel-auth` session workflow — see active account / project / workspace
- `mixpanel-auth` project-use workflow — switch to a different project
- `mixpanel-auth` target-add workflow — save a named cursor position

The user can also construct a Workspace targeting a specific account / project /
workspace directly:

```python
import mixpanel_headless as mp

ws = mp.Workspace()                                  # default session
ws = mp.Workspace(account="team")                    # named account
ws = mp.Workspace(project="67890")                   # explicit project (active account)
ws = mp.Workspace(account="team", project="67890")   # both axes
ws.use(project="98765").events()                     # in-session switch (no re-auth)
```

_The mixpanelyst skill auto-triggers on analytics questions. For the analytical frameworks that guide investigations, see [analytical-frameworks.md](../mixpanelyst/references/analytical-frameworks.md). For the complete Python API, see [python-api.md](../mixpanelyst/references/python-api.md)._
