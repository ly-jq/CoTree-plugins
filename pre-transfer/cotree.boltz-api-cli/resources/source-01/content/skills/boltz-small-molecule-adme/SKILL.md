---
name: "import.codex.boltz-api-cli.boltz-small-molecule-adme"
description: "Predict Tier-1 ADME/ADMET for small molecules with Boltz from bare SMILES — no target, no docking. Use when the user wants solubility, permeability, or lipophilicity/logD for a molecule or list of molecules. Not for ranking molecules against a protein target (use boltz-small-molecule-screen, which already returns ADME free)."
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

## Workflow

If `boltz-api` is missing from `PATH`, use `boltz-cli-setup` for install/update guidance before retrying.
If a command reports missing or expired authentication, use `boltz-cli-setup` to start `boltz-api auth login --device-code` before retrying; do not ask permission first.
If the agent host sandbox blocks `boltz-api` install/auth/API calls, use `boltz-cli-setup` to request the host sandbox bypass/escalation needed for user-wide CLI install, browser login, credential storage, temp files, or API access before retrying.

Use this skill for standalone ADME triage on SMILES the user already has. No protein target is involved. If the user is also screening or docking those molecules against a target, prefer `boltz-small-molecule-screen` — it returns the same ADME block free as part of the screen.

1. Normalize the molecules from raw SMILES, a CSV (auto-detect the SMILES column), `.smi`, or `.txt` into the `molecules` list. Each entry is `{smiles, id?}`; the optional `id` is echoed back as `external_id` on each result so you can map results to inputs.
2. **Hard cap: 128 molecules per request.** If the list exceeds 128, split into batches of ≤128 and submit one request per batch (suffix the run name, for example `-b1`, `-b2`), then merge results. Never send more than 128 in one call — the API rejects it with `VALIDATION_ERROR: input.molecules must contain at most 128 items`.
3. Author the payload YAML or JSON, run `estimate-cost`, show the USD cost, wait for explicit confirmation. ADME is priced at **$0.01 per molecule** (size-independent); `estimate-cost` returns the authoritative total — always quote it.
4. `run` to submit and wait — ADME finishes in seconds, so it is synchronous and needs no background polling. `run` persists results locally under `--root-dir/<run-name>/`.
5. Report from `<output-root>/<run-name>/run.json` → `output.molecules[]`. For each molecule show `external_id` (or `smiles`), `solubility`, `permeability`, and `lipophilicity`. The three values live under each molecule's `adme` object. Call out any molecule with `status: failed` and its `error` (an object `{code, message}`, e.g. code `adme_enumeration_failed`, message `Invalid SMILES`) — `adme` is `null` there; one bad SMILES fails only that molecule, not the batch. Read [references/results.md](references/results.md) for the output layout and [references/api.md](references/api.md) for the payload and batching details.

ADME values are approximate estimates for triage and ranking, not absolute measurements.

## Command Pattern

```bash
# Replace placeholders with concrete absolute paths before running.
# Use a short descriptive run name, for example: adme-<library>-v1

boltz-api predictions:adme estimate-cost \
  --model adme-v1 --input @yaml:///absolute/path/payload.yaml

# `run` is synchronous (submit + wait + persist) and finishes in seconds — no background mode needed.
# Claude Code: run as a normal Bash command. Codex: run as a foreground shell command; if Codex
# returns a session_id because it is still running, poll it. Do not append "&" or use nohup in Codex.
boltz-api predictions:adme run \
  --model adme-v1 \
  --idempotency-key "<run-name>" \
  --input @yaml:///absolute/path/payload.yaml \
  --name "<run-name>" \
  --root-dir "/absolute/path/boltz-experiments" \
  --poll-interval-seconds 5
# -> /absolute/path/boltz-experiments/<run-name>/run.json  (output.molecules[].adme)
```

Payload is just a `molecules` list — the API body field name, not the direct CLI flag. `--model adme-v1` is required.

## Always Do This

- Keep payload field names exactly as the API body names shown in `references/api.md` (`molecules`, each `{smiles, id?}`).
- Pass `--model adme-v1` on every `estimate-cost`, `run`, and `start`.
- Enforce the 128-molecule-per-request cap. Chunk larger libraries into ≤128 batches and submit each as its own run; merge the per-batch `run.json` outputs when reporting.
- Use absolute paths for the output root and payload files. Do not `cd` into the run directory; pass the same `--root-dir` and use absolute paths so later relative paths do not drift.
- Prefer one merged top-level payload via `--input @yaml:///absolute/path/payload.yaml` or `@json:///absolute/path/payload.json`. Keep `--model`, `--idempotency-key`, and `--workspace-id` top-level. Never use `@file://` or `@./`.
- Run `estimate-cost` and show the USD total before submitting. ADME is $0.01/molecule (size-independent); `estimate-cost` returns the authoritative total — always use it.
- Use the same slug as both `--idempotency-key` and `--name` so re-runs resume via `.boltz-run.json`.
- In permission-gated agents such as Claude Code, keep each Boltz call as a top-level command that starts with `boltz-api`. Prefer concrete arguments over `sh -c`, inline environment assignments, aliases, wrapper scripts, loops, or pipelines unless the user already allowed that exact command form.
- ADME `run` is synchronous and finishes in seconds, so unlike the screen/design endpoints it needs no background/non-blocking mode. In Claude Code, run it as a normal Bash call. In Codex, run it as a foreground shell command; if Codex returns a `session_id` because the command is still running, poll it. Do not append `&` or use `nohup` in Codex.
- Do not require or accept a protein target — ADME is structure-free. If the user wants ADME *and* binding against a target, redirect to `boltz-small-molecule-screen`.

## Escape Hatch

- Payload reference: <https://api.boltz.bio/docs/api/resources/predictions/subresources/adme/methods/start/>
- Guide: <https://api.boltz.bio/docs/guides/small-molecule-adme/>
- CLI flag names: `boltz-api predictions:adme run --help`

Read [references/api.md](references/api.md) for the `molecules` payload shape, the per-molecule output fields, the 128-molecule cap, and error handling.

## Outputs

Read `<output-root>/<run-name>/run.json` and report `output.molecules[]`. There are no structure files — ADME returns scalar/categorical values only. Read [references/results.md](references/results.md) for the local layout and per-molecule output fields; [references/api.md](references/api.md) has the full request/response schema.
