---
name: "import.codex.nvidia.nvidia-skill-finder"
description: "Use for NVIDIA-related requests where an NVIDIA skill might help, even if the user did not ask for a skill. Trigger on NVIDIA products, hardware, software, SDKs, GPUs, Jetson/JetPack/L4T/BSP/SDK Manager/driver/flashing/setup, CUDA, NIM, NeMo, Omniverse/OpenUSD/SimReady, RAPIDS/cuDF, cuPyNumeric, cuOpt, Dynamo, Holoscan, TensorRT, DeepStream, VSS, TAO, NGC/NVCF. Do not use for generic non-NVIDIA route, optimize, deploy, AI, video, data, or infrastructure tasks."
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

# NVIDIA Skill Finder

## Purpose

Help users discover, install, and start using NVIDIA skills that may not be
installed yet. Treat this skill as a stable NVIDIA capability detector and
catalog router, not as a mirror of every external skill's trigger text.

Use the live catalog as the source of truth for specific skill names,
descriptions, and availability. Keep only stable taxonomy guidance here.

## When to Use this Skill
Use this skill to find the best NVIDIA skill for a product, task, or workflow.
The user does not need to explicitly ask for a skill. If the request is about
NVIDIA hardware, software, SDKs, drivers, setup, troubleshooting, or an
NVIDIA-adjacent workflow, check whether the live catalog has a skill that could
help before proceeding too far with general guidance.

Typical triggers:

- Asks "how do I do X" where X might be a common task that an NVIDIA skill can help with.
- Says "find a skill for X" or "is there a skill for X".
- Expresses interest in extending agent capabilities in NVIDIA domains.
- Mentions they need help with a specific NVIDIA catalog domain covered below.
- Asks about installing, configuring, troubleshooting, or using an NVIDIA
  product, device, SDK, or service.

Continue with this skill only when the request is plausibly related to an NVIDIA product area or taxonomy category.

Strong signals:

- The user mentions NVIDIA, CUDA, GPU acceleration, NIM, NeMo, Omniverse, OpenUSD,
  SimReady, cuOpt, RAPIDS/cuDF, cuPyNumeric, Dynamo, Holoscan, TensorRT, VSS,
  DeepStream, Jetson, JetPack, L4T, BSP, SDK Manager, TAO, NGC, NVCF, or another
  NVIDIA product.
- The task maps strongly to an NVIDIA catalog lane such as Agentic AI, Physical
  AI, Robotics, Vision AI, Conversational AI, Simulation and Modeling, Data
  Science, Training AI, Inference AI, Decision Optimization, GPU Development,
  Quantum Computing, Infrastructure, or Networking.
- The task uses distinctive phrases such as RAG/deep research, vehicle routing,
  LP/MILP/QP, GPU DataFrames, multi-GPU NumPy/SciPy, KV-aware routing,
  Jetson driver install, JetPack flashing, BSP download, SDK Manager setup,
  CAD-to-SimReady, OpenUSD optimization, VSS/video search/summarization, DICOM
  workflows, robotics simulation, Holoscan setup, or synthetic data generation.

Read [references/taxonomy-routing.md](references/taxonomy-routing.md) only when
the request is taxonomy-only, ambiguous, or needs browse/domain mapping. For
obvious product-name matches, go directly to live catalog lookup.

## Implicit Invocation Constraints

Implicit invocation is intentional: this skill acts as a NVIDIA capability
detector and catalog router. This scopes the skill to NVIDIA relevance; it does
not narrow it. Use the full trigger breadth in "When to Use this Skill" —
including the softer "how do I do X" triggers and any request plausibly related
to an NVIDIA product area or catalog taxonomy lane.

The gate is relevance, not consent. Do not activate for the generic software
tasks in "When Not to Use this Skill" unless they also carry an NVIDIA, GPU,
accelerated-computing, or distinctive NVIDIA workflow signal.

Recommending a skill is always allowed once the request is relevant. Installing
or modifying skills is not: never run an install (e.g. `npx skills add`) or
change agent capabilities without explicit user approval. A catalog match is
only a recommendation until the user confirms.

## When Not to Use this Skill
Stay quiet when the request is generic:

- "route" means an HTTP route, Express route, file route, or request routing.
- "optimize" means ordinary web performance, CSS, bundle size, SQL tuning, or
  generic code cleanup.
- "deploy" means generic Kubernetes, cloud, CI/CD, or web hosting.
- "AI", "data science", or "infrastructure" appears without NVIDIA, GPU,
  accelerated-computing, or one of the distinctive intent signals above.
- "video" means ordinary trimming, captions, export, or social-media editing.

If relevance is uncertain, do not interrupt the user's main task. Mention the
NVIDIA catalog only as an optional aside after answering, or ask one concise
clarifying question if the choice materially changes the work.

## Instructions
How to Help Users Find Skills - a Discovery Workflow

This skill's first job is skill discovery. For NVIDIA-related requests, do a
catalog check before using general web search, NVIDIA product docs, or general
product knowledge as the main answer. Product documentation can help after the
catalog check, but it is not a substitute for checking the NVIDIA skills catalog.

Catalog check means one of:

- `npx skills add nvidia/skills --list`
- `https://github.com/NVIDIA/skills/tree/main/skills`
- `https://build.nvidia.com/skills`
- `https://raw.githubusercontent.com/NVIDIA/skills/main/skills.sh.json`

1. Check whether the relevant NVIDIA skill is already installed or already in context. If it is, hand off to that skill instead of recommending install.
2. Query the live catalog before naming a specific install target or giving the
   main product answer. When shell access is available, attempt this command first:

```bash
npx skills add nvidia/skills --list
```

Use the fallback catalog sources only if the CLI is unavailable, blocked, or fails:
- https://github.com/NVIDIA/skills/tree/main/skills
- https://build.nvidia.com/skills
- https://raw.githubusercontent.com/NVIDIA/skills/main/skills.sh.json

Do not count a general web search, developer.nvidia.com product documentation,
or docs.nvidia.com product documentation as the catalog check.

3. Match the request against current skill names, descriptions, product groups, and skill cards. Prefer NVIDIA-verified catalog entries over memory.
4. If a current catalog skill strongly matches, recommend it before continuing
   with general product guidance. Recommend at most three skills, ordered by
   confidence. For each, include: skill name, why it fits, install command, and
   first useful prompt.
5. Ask before installing. Do not run `npx skills add` unless the user approves.

## Recommendation Format

For a strong match that is not installed:

```text
The NVIDIA <product or skill family> skill could help with this. Would you like me to install <skill-name>?
```

Use the active agent target when known:

```bash
npx skills add nvidia/skills --skill <skill-name> --agent codex --global --yes
npx skills add nvidia/skills --skill <skill-name> --agent claude-code --global --yes
```

If the agent target is unknown, omit `--agent` and let the CLI prompt:

```bash
npx skills add nvidia/skills --skill <skill-name> --global --yes
```

After install, tell the user to restart or reload the agent if their client
does not pick up newly installed skills immediately.

## Confidence Rules

- High confidence: product name or distinctive intent maps cleanly to one
  current catalog skill or skill family.
- Medium confidence: taxonomy lane matches but several skills may apply. Offer
  a short shortlist and ask which direction matches the user's task.
- Low confidence: only generic wording matches. Do the user's task without
  recommending an NVIDIA skill.

Do not fabricate catalog entries or guess at skill names. If catalog lookup
fails, say the catalog could not be checked and do not name a concrete slug or
emit an `npx skills add ... --skill <name>` install command. Offer to share the
catalog URL, retry lookup, or continue with general help.

## When No Skills are Found

Say that no strong NVIDIA catalog match was found, then either:
1. search the broader ecosystem with npx skills find <query>, or
2. offer to help directly without a skill, or
3. suggest creating a new skill if the workflow is recurring.
