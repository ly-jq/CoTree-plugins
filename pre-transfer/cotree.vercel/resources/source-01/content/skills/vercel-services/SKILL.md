---
name: "import.codex.vercel.vercel-services"
description: "Vercel Services — deploy multiple services within a single Vercel project. Use for monorepo layouts or when combining a backend (Python, Go) with a frontend (Next.js, Vite) in one deployment."
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

# Deploy multi-service projects with Vercel

Services let you deploy multiple independently-built units within a single Vercel project. The typical use case is combining different runtimes (e.g. Python + JavaScript) in one deployment with shared routing and environment variables, but services work for any combination — multiple services of the same runtime, different frameworks, or a mix.

This skill covers **project structure and configuration**. For the actual deployment, defer to the **deployments-cicd** skill.

## How It Works

A service is an independently built unit within your project, deployed to the same domain under a unique subpath. At build time, Vercel builds each service separately. At request time, Vercel routes incoming requests to the correct service based on the URL path prefix (longest prefix wins).

- Services are enabled via the `experimentalServices` field in `vercel.json` (see reference project).
- `vercel dev -L` auto-detects frameworks and runs all services locally as one application, handling routing automatically. The `-L` flag (short for `--local`) runs without authenticating with Vercel Cloud.
- Only `vercel.json` lives at the root. Each service manages its own dependencies independently.

## Configuration

Define services in `vercel.json`:

```json
{
  "experimentalServices": {
    "web": {
      "entrypoint": "apps/web",
      "routePrefix": "/"
    },
    "api": {
      "entrypoint": "backend/main.py",
      "routePrefix": "/server"
    }
  }
}
```

The project's Framework Preset must be set to **Services** in the Vercel dashboard.

### Configuration fields

| Field          | Required | Description                                                |
|----------------|----------|------------------------------------------------------------|
| `entrypoint`   | Yes      | Path to the service entrypoint file or directory.          |
| `routePrefix`  | Yes      | URL path prefix for routing (e.g. `/`, `/api`, `/svc/go`). |
| `framework`    | No       | Framework slug. Pins detection; auto-detected if unset.    |
| `memory`       | No       | Max available RAM in MB (128–10,240).                      |
| `maxDuration`  | No       | Execution timeout in seconds (1–900).                      |
| `includeFiles` | No       | Glob patterns for files to include in the deployment.      |
| `excludeFiles` | No       | Glob patterns for files to exclude from the deployment.    |

Do not add unknown fields — they will cause the build to fail.

## Supported runtimes and frameworks

Services is in beta. **Python** and **Go** are tested and production-ready. Other runtimes may work but are not yet validated.

### Python

Works with FastAPI, Flask, Django, or any ASGI/WSGI application. Framework is auto-detected. Set `entrypoint` to the application file (e.g. `"backend/main.py"`). Dependencies go in `pyproject.toml` in the service directory.

### Go

Set `entrypoint` to the service **directory** (e.g. `"backend"`), not a file. **Must** set `"framework": "go"` explicitly in `vercel.json` — auto-detection does not work for Go services. Dependencies in `go.mod` in the service directory.

### Other runtimes (untested)

Vercel supports Node.js, Bun, Rust, Ruby, Wasm, and Edge runtimes for functions. These can theoretically be used as services but are not yet validated.

## Routing

Vercel evaluates route prefixes from longest to shortest (most specific first), with the primary service (`/`) as the catch-all. Vercel automatically mounts services at their `routePrefix`, so service handlers should **not** include the prefix in their routes.

For frontend frameworks mounted on a subpath (not `/`), configure the framework's own base path (e.g. `basePath` in `next.config.js`) to match `routePrefix`.

## Environment variables

Vercel auto-generates URL variables so services can find each other:

| Variable                        | Example value                            | Availability | Use case                              |
|---------------------------------|------------------------------------------|--------------|---------------------------------------|
| `{SERVICENAME}_URL`             | `https://your-deploy.vercel.app/svc/api` | Server-side  | Server-to-server requests             |
| `NEXT_PUBLIC_{SERVICENAME}_URL` | `/svc/api`                               | Client-side  | Browser requests (relative, no CORS)  |

`SERVICENAME` is the key name from `experimentalServices`, uppercased. If you define an env var with the same name in project settings, your value takes precedence.

## Usage

1. Read `references/fastapi-vite/` for the canonical project layout.
2. Adapt the structure to the user's chosen runtimes — services can use any supported runtime, not just the ones in the reference.
3. Define service routes **without** the route prefix — Vercel strips the prefix before forwarding.
4. Validate that each service in `vercel.json` has `entrypoint` and `routePrefix`. Only set `framework` when auto-detection fails (required for Go).

## Output

After scaffolding, present the created file structure to the user. After deployment, present the deployment URL (refer to the **deployments-cicd** skill for details).

## Troubleshooting

### 404 on routes after deployment

The project needs the Services framework preset:

1. Go to Project Settings → Build & Deployment → Framework Preset
2. Select **Services** from the dropdown
3. Redeploy

### Routes return unexpected results

1. Ensure all services are picked up by `vercel dev` — check logs. If a service is missing, verify `vercel.json`. Try setting `framework` explicitly.
2. Validate route prefix behavior: handlers declare routes without `routePrefix` (e.g. `/health`), but requests from other services use the full prefix (e.g. `/api/health`).
3. For frontend services on a subpath, confirm the framework's base path config matches `routePrefix`.
