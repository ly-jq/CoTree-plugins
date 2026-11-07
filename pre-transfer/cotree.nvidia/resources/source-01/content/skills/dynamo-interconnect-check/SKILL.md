---
name: "import.codex.nvidia.dynamo-interconnect-check"
description: "Validate that a Dynamo deployment's NIXL/UCX/NCCL interconnect is ready for disaggregated serving over RDMA/NVLink. Use after recipe-runner brings a deployment up (especially disagg/multi-node) to confirm the KV transport is correct; use troubleshoot for diagnosing already-failed pods."
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

# Dynamo Interconnect Check

<!--
SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
SPDX-License-Identifier: CC-BY-4.0
-->

## Purpose

Confirm that the transport disaggregated serving depends on actually works. A
deployment can pass an endpoint smoke test while disagg is silently wrong: if
NIXL/UCX cannot reach the peer worker over RDMA or NVLink, KV transfer falls
back to a slow or broken path. Catch that with read-only checks before trusting
a disagg deployment or its benchmark numbers.

This skill is read-only. It never mutates the cluster and never prints secrets.

## Prerequisites

- Python 3.10+ on the operator machine.
- `kubectl exec` access to a worker pod in the target Dynamo deployment.
- Read access to the recipe directory (`recipes/<model>/<framework>/<mode>`).
- For node-capability checks: tools like `ibstat`, `nvidia-smi`, `lsmod` available in the worker pod image (missing tools are reported as `skipped`, not failures).

## When To Use

- After `dynamo-recipe-runner` deploys a **disagg** or multi-node recipe.
- Before reporting disagg throughput/latency, so numbers reflect the real
  transport.
- When agg works but disagg is slow, hangs, or returns wrong output and you
  suspect the fabric rather than the model.

For diagnosing pods that are already crashing or unschedulable, use
`dynamo-troubleshoot` first.

## Instructions

### 1. Check Transport Env Vars On The Recipe

```bash
python3 scripts/check_interconnect.py env recipes/<model>/<framework>/<mode>
```

Reports which NIXL/UCX/NCCL transport variables are set and flags
disagg-critical ones (e.g. `UCX_TLS`, `UCX_NET_DEVICES`, `NCCL_IB_HCA`) that are
absent. Missing here is only a warning — they may be baked into the image — so
confirm with the node and NIXL checks. See
`references/interconnect-env-vars.md` for what each variable does.

### 2. Check Node Capabilities

Locally on a GPU node, or inside a running worker pod:

```bash
python3 scripts/check_interconnect.py node \
  --namespace "${NAMESPACE}" --pod <worker-pod>
```

Probes (read-only) for: InfiniBand devices and Active links, GPUDirect RDMA
(`nvidia_peermem`), GDRCopy, and NVLink in the GPU topology. Missing tools are
reported as `skipped`, not failures.

### 3. Validate NIXL Reachability

```bash
python3 scripts/check_interconnect.py nixl \
  --namespace "${NAMESPACE}" --pod <worker-pod>
```

Looks for NIXL test tooling in the pod and surfaces the exact next step to run a
pairwise prefill↔decode transfer test. A full cross-pod transfer test requires
two scheduled GPU pods on the fabric.

## Available Scripts

| Script | Purpose | Arguments |
|---|---|---|
| `scripts/check_interconnect.py env` | Inspect NIXL/UCX/NCCL env vars on a recipe | positional recipe path |
| `scripts/check_interconnect.py node` | Probe InfiniBand, GPUDirect RDMA, GDRCopy, NVLink on a node or pod | `--namespace`, `--pod` |
| `scripts/check_interconnect.py nixl` | Surface NIXL transfer-test readiness for a pod | `--namespace`, `--pod` |

Invoke via the agentskills.io `run_script()` protocol:

```python
run_script("scripts/check_interconnect.py", args=["env", "recipes/qwen3-coder-480b/sglang/disagg"])
run_script("scripts/check_interconnect.py", args=["node", "--namespace", "dynamo-demo", "--pod", "qwen-worker-0"])
```

## Examples

Verify a disagg recipe's transport env shape before deploy:

```bash
python3 scripts/check_interconnect.py env recipes/qwen3-coder-480b/sglang/disagg
```

After deploy, validate a worker pod's fabric:

```bash
python3 scripts/check_interconnect.py node \
  --namespace dynamo-demo --pod qwen-worker-0
python3 scripts/check_interconnect.py nixl \
  --namespace dynamo-demo --pod qwen-worker-0
```

Equivalent through the agent protocol:

```python
run_script("scripts/check_interconnect.py", args=["nixl", "--namespace", "dynamo-demo", "--pod", "qwen-worker-0"])
```

## Output Contract

Each check returns `ok` / `warn` / `fail` / `skipped` with a one-line detail,
plus a rolled-up verdict on disagg transport readiness. Report:

- transport env vars present vs. disagg-critical ones missing
- RDMA / GPUDirect / NVLink capability status
- whether NIXL reachability was validated, and the next command if not
- a clear statement of whether disagg can be trusted, or what to fix first

## Limitations

- Read-only fabric probe; does not run a full pairwise NIXL transfer (requires two scheduled GPU pods and the in-pod NIXL test tools).
- `skipped` results for missing tools (`ibstat`, `nvidia-smi`, `lsmod`) are inconclusive, not a pass.
- Env-var check inspects the recipe text; values injected at runtime via initContainers or operator-applied envs are not detected.
- Single-node agg deployments do not exercise the transport — this skill is for disagg / multi-node validation.

## Troubleshooting

| Symptom | Likely cause | Next step |
|---|---|---|
| `env` reports all critical vars missing | Vars baked into image or injected by operator | Run the `node` check inside the worker pod to verify actual env |
| `node` reports no Active IB link | Fabric down or HCA not provisioned to the node | Contact cluster admin; verify `kubectl describe node` shows `nvidia.com/gpu` and IB labels |
| `nvidia_peermem` missing | GPUDirect RDMA module not loaded | Ask cluster admin to load `nvidia-peermem`; without it, NIXL falls back to staged copies |
| `nixl` finds no test tools | Worker image lacks NIXL test harness | Use a NIXL-enabled image or run the standalone transfer test from a debug pod |

## Benchmark

See `BENCHMARK.md` for the NVCARPS-EVAL performance report (auto-generated by the NVSkills CI pipeline). To refresh, re-run `/nvskills-ci` on an upstream PR touching this skill.

## References

- `references/interconnect-env-vars.md` — NIXL/UCX/NCCL env var catalog and IB
  capability checklist.
- Use `scripts/check_interconnect.py` for all read-only checks.
