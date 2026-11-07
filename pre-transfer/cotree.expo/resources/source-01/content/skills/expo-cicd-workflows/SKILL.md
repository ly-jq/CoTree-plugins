---
name: "import.codex.expo.expo-cicd-workflows"
description: "Helps understand and write EAS workflow YAML files for Expo projects. Use this skill when the user asks about CI/CD or workflows in an Expo or EAS context, mentions .eas/workflows/, or wants help with EAS build pipelines or deployment automation."
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

# EAS Workflows Skill

Help developers write and edit EAS CI/CD workflow YAML files.

## Reference Documentation

Fetch these resources before generating or validating workflow files. First resolve this skill's directory, then use the fetch script in its `scripts/` directory. It is implemented using Node.js and caches responses using ETags for efficiency:

```bash
# Fetch resources
node <skill-dir>/scripts/fetch.js <url>
```

1. **JSON Schema** — https://api.expo.dev/v2/workflows/schema
   - It is NECESSARY to fetch this schema
   - Source of truth for validation
   - All job types and their required/optional parameters
   - Trigger types and configurations
   - Runner types, VM images, and all enums

2. **Syntax Documentation** — https://raw.githubusercontent.com/expo/expo/refs/heads/main/docs/pages/eas/workflows/syntax.mdx
   - Overview of workflow YAML syntax
   - Examples and English explanations
   - Expression syntax and contexts

3. **Pre-packaged Jobs** — https://raw.githubusercontent.com/expo/expo/refs/heads/main/docs/pages/eas/workflows/pre-packaged-jobs.mdx
   - Documentation for supported pre-packaged job types
   - Job-specific parameters and outputs

Do not rely on memorized values; these resources evolve as new features are added.

## Workflow File Location

Workflows live in `.eas/workflows/*.yml` (or `.yaml`).

## Top-Level Structure

A workflow file has these top-level keys:

- `name` — Display name for the workflow
- `on` — Triggers that start the workflow (at least one required)
- `jobs` — Job definitions (required)
- `defaults` — Shared defaults for all jobs
- `concurrency` — Control parallel workflow runs

Consult the schema for the full specification of each section.

## Expressions

Use `${{ }}` syntax for dynamic values. The schema defines available contexts:

- `github.*` — GitHub repository and event information
- `inputs.*` — Values from `workflow_dispatch` inputs
- `needs.*` — Outputs and status from dependent jobs
- `jobs.*` — Job outputs (alternative syntax)
- `steps.*` — Step outputs within custom jobs
- `workflow.*` — Workflow metadata

## Generating Workflows

When generating or editing workflows:

1. Fetch the schema to get current job types, parameters, and allowed values
2. Validate that required fields are present for each job type
3. Verify job references in `needs` and `after` exist in the workflow
4. Check that expressions reference valid contexts and outputs
5. Ensure `if` conditions respect the schema's length constraints

## Validation

After generating or editing a workflow file, validate it against the schema:

```sh
# Install dependencies if missing
[ -d "<skill-dir>/scripts/node_modules" ] || npm install --prefix <skill-dir>/scripts

node <skill-dir>/scripts/validate.js <workflow.yml> [workflow2.yml ...]
```

The validator fetches the latest schema and checks the YAML structure. Fix any reported errors before considering the workflow complete.

## Answering Questions

When users ask about available options (job types, triggers, runner types, etc.), fetch the schema and derive the answer from it rather than relying on potentially outdated information.
