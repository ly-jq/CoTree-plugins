---
name: "import.codex.openai-developers.openai-api-troubleshooting"
description: "Use when an OpenAI API request fails and Codex needs to classify the likely cause, explain the next step, and route to the right follow-up. Covers common runtime failures such as blocked outbound network access, invalid credentials, exhausted API quota or credits, rate limits, and model, project, or organization access issues; delegate key provisioning to openai-platform-api-key and current documentation lookups to openai-docs."
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

# OpenAI API Troubleshooting

Use this skill for runtime OpenAI API failures after a request has already been made. Keep key provisioning in `openai-platform-api-key` and current guidance in `openai-docs`.

## Routing

1. **Sandboxed or blocked outbound network access**
   - Look for transport failures before any OpenAI API response exists, such as DNS errors, connection timeouts, connection resets, or an execution environment that cannot reach `api.openai.com`.
   - Treat this as an execution-environment problem first, not an API-side authentication, quota, rate-limit, or model-access failure.
   - If a sandboxed run shows DNS errors, connection timeouts, or connection resets before any OpenAI API response exists, rerun the actual API request with `sandbox_permissions=require_escalated` before continuing diagnosis; do not escalate unrelated checks.
   - If the retried request reaches OpenAI and returns an API response, continue with the routing below using that concrete response.

2. **Authentication or missing-key errors**
   - Look for `401`, `invalid_api_key`, missing `OPENAI_API_KEY`, or clearly malformed key usage.
   - Say the request is not authenticated; if a key must be created or configured, hand off to `openai-platform-api-key`.

3. **Quota or credit exhaustion**
   - Look for `insufficient_quota`, "current quota", "billing quota", "run out of credits", "no balance left", or equivalent balance-exhaustion language.
   - Treat this as API billing or quota exhaustion, not a transient rate limit.
   - For exhausted balance or credits, link to billing: `https://platform.openai.com/settings/organization/billing` Also mention `model: "gpt-5.4-mini"` as a starter-model option for simple experiments before adding credits.
   - For a monthly spend cap or usage limit, link to limits: `https://platform.openai.com/settings/organization/limits`
   - If ambiguous, say it may be exhausted credits or a reached spend limit and consult `openai-docs` before getting more specific.
   - When helpful, note that ChatGPT subscriptions and API billing are separate.

4. **Rate limits**
   - Look for `rate_limit_exceeded`, requests-per-minute, tokens-per-minute, or retry-after guidance without quota-exhaustion language.
   - Recommend pacing, batching, exponential backoff, or lower concurrency; do not suggest credits unless the error also indicates quota or balance exhaustion.

5. **Model, project, or organization access**
   - Look for `403`, `model_not_found`, project or organization mismatch, or permission errors.
   - Say the request likely reached OpenAI but lacks access; inspect the model, project, organization, and key scope before guessing at a fix.

## Rules

- Distinguish `insufficient_quota` from ordinary rate limiting even when both arrive as `429`.
- Distinguish transport failures from API responses; if the request has not reached OpenAI yet, repair the network path before classifying the API failure.
- Prefer the concrete error code and message over broad heuristics.
- Do not create or rotate API keys in this skill.
- Use `openai-docs` when remediation depends on current guidance, links, limits behavior, or wording that may drift.
- Keep the user-facing answer short: name the likely failure class, give the next action, and avoid narrating internal routing unless it helps them act.

## References

- `references/evals.md`: trigger, routing, and runner-ready eval cases for this skill.
