---
name: "import.codex.nvidia.dynamo-router-starter"
description: "Start or patch Dynamo router modes and run router endpoint smoke checks. Use for round-robin, KV-aware, least-loaded, or device-aware routing setup; use recipe-runner for recipe deployment and troubleshoot for failure diagnosis."
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

# Dynamo Router Starter

<!--
SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
SPDX-License-Identifier: CC-BY-4.0
-->

## Purpose

Make Dynamo routing feel easy by getting a baseline router mode running, enabling
KV-aware routing when appropriate, and proving the endpoint works. Keep the user
focused on exact commands and success signals, not router internals.

## Prerequisites

- Python 3.10+ with the `dynamo` package importable (`python3 -m dynamo.frontend --help` works).
- For Kubernetes runs: `kubectl` configured with access to the target namespace and a deployed Dynamo recipe.
- Network reachability to the frontend service (port-forward or direct).
- A model already loaded into at least one worker (`/v1/models` returns at least one entry).

## Required Inputs

Collect or infer:

- local Python/CLI or Kubernetes recipe path
- desired mode: `round-robin`, `kv`, `least-loaded`, `device-aware-weighted`, `direct`, or `random`
- frontend port or Kubernetes frontend service
- whether workers publish KV events; if not, use approximate KV mode
- model name for smoke requests, if `/v1/models` cannot discover it

## Instructions

### 1. Establish A Baseline

For local bring-up with already registered workers:

```bash
python3 -m dynamo.frontend --router-mode round-robin --http-port 8000
```

For Kubernetes, inspect the selected recipe `deploy.yaml` and locate the
frontend service. If the recipe is not already deployed, use
`dynamo-recipe-runner` first.

### 2. Enable KV Routing

For local frontend:

```bash
python3 -m dynamo.frontend --router-mode kv --http-port 8000
```

For Kubernetes, patch only the frontend service env:

```yaml
envs:
  - name: DYN_ROUTER_MODE
    value: kv
```

If backend workers are not publishing KV cache events, set approximate mode
instead of leaving the router waiting for events:

```yaml
envs:
  - name: DYN_ROUTER_USE_KV_EVENTS
    value: "false"
```

### 3. Smoke Test

After port-forwarding the frontend service or starting local frontend, run:

```bash
python3 scripts/check_router_health.py \
  --base-url http://127.0.0.1:8000
```

This must verify `/v1/models` and, when a model is discoverable, one
`/v1/chat/completions` request.

### 4. Compare Modes Carefully

When comparing round-robin vs KV routing:

- use the same model, workers, prompt set, concurrency, and sampling settings
- send repeated-prefix prompts if demonstrating KV reuse
- label the result as a smoke comparison unless enough benchmark samples were collected
- do not claim throughput improvement from a single chat request

If the endpoint is unhealthy or workers are missing, switch to
`dynamo-troubleshoot`.

## Available Scripts

| Script | Purpose | Arguments |
|---|---|---|
| `scripts/check_router_health.py` | Smoke-test `/v1/models` and one chat completion against a Dynamo frontend | `--base-url`, `--retries`, `--timeout` |

Invoke via the agentskills.io `run_script()` protocol:

```python
run_script("scripts/check_router_health.py", args=["--base-url", "http://127.0.0.1:8000"])
```

## Examples

Local KV-routed frontend on port 8000, then smoke-test it:

```bash
python3 -m dynamo.frontend --router-mode kv --http-port 8000 &
python3 scripts/check_router_health.py --base-url http://127.0.0.1:8000
```

Kubernetes-deployed frontend reachable via port-forward:

```bash
kubectl port-forward svc/qwen-vllm-disagg-frontend 8000:8000 -n dynamo-demo &
python3 scripts/check_router_health.py --base-url http://127.0.0.1:8000 --retries 3
```

Equivalent through the agent protocol:

```python
run_script("scripts/check_router_health.py", args=["--base-url", "http://127.0.0.1:8000", "--retries", "3"])
```

## Output Contract

Return:

- mode selected and why
- local command or Kubernetes env patch
- frontend service or URL
- smoke-test result
- any limitation, such as approximate KV mode or missing worker KV events
- next command to run for a fuller comparison

## Limitations

- Smoke test is one chat completion; it is not a benchmark. Use `dynamo-benchmark` for throughput/latency numbers.
- KV-aware mode without worker KV-event publication degrades to approximate mode; this skill flags but does not fix the underlying worker config.
- Mode comparisons require matched workloads; cross-mode latency claims need separate benchmark runs.

## Troubleshooting

| Symptom | Likely cause | Next step |
|---|---|---|
| `/v1/models` returns empty list | No worker registered with the frontend | Verify worker pods are Ready; confirm they connect to the same etcd/NATS |
| Smoke chat request times out | Frontend up, workers not serving | Switch to `dynamo-troubleshoot`; inspect worker logs |
| KV mode hangs | Workers do not publish KV cache events | Set `DYN_ROUTER_USE_KV_EVENTS=false` (approximate mode) |
| Connection refused on port-forward | Port-forward dropped or wrong service name | Re-run port-forward; verify the frontend service name matches the recipe |

## Benchmark

See `BENCHMARK.md` for the NVCARPS-EVAL performance report (auto-generated by the NVSkills CI pipeline). To refresh, re-run `/nvskills-ci` on an upstream PR touching this skill.

## References

- Read `references/router-modes.md` for the compact mode/env map.
- Use `scripts/check_router_health.py` for endpoint smoke tests.
