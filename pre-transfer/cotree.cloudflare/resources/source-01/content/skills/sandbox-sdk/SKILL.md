---
name: "import.codex.cloudflare.sandbox-sdk"
description: "Build sandboxed applications for secure code execution. Load when building AI code execution, code interpreters, CI/CD systems, interactive dev environments, or executing untrusted code. Covers Sandbox SDK lifecycle, commands, files, code interpreter, and preview URLs. Biases towards retrieval from Cloudflare docs over pre-trained knowledge."
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

# Cloudflare Sandbox SDK

Build secure, isolated code execution environments on Cloudflare Workers.

## FIRST: Verify Installation

```bash
npm install @cloudflare/sandbox
docker info  # Must succeed - Docker required for local dev
```

## Retrieval Sources

Your knowledge of the Sandbox SDK may be outdated. **Prefer retrieval over pre-training** for any Sandbox SDK task.

| Resource | URL |
|----------|-----|
| Docs | https://developers.cloudflare.com/sandbox/ |
| API Reference | https://developers.cloudflare.com/sandbox/api/ |
| Examples | https://github.com/cloudflare/sandbox-sdk/tree/main/examples |
| Get Started | https://developers.cloudflare.com/sandbox/get-started/ |

When implementing features, fetch the relevant doc page or example first.

## Required Configuration

**wrangler.jsonc** (exact - do not modify structure):

```jsonc
{
  "containers": [{
    "class_name": "Sandbox",
    "image": "./Dockerfile",
    "instance_type": "lite",
    "max_instances": 1
  }],
  "durable_objects": {
    "bindings": [{ "class_name": "Sandbox", "name": "Sandbox" }]
  },
  "migrations": [{ "new_sqlite_classes": ["Sandbox"], "tag": "v1" }]
}
```

**Worker entry** - must re-export Sandbox class:

```typescript
import { getSandbox } from '@cloudflare/sandbox';
export { Sandbox } from '@cloudflare/sandbox';  // Required export
```

## Quick Reference

| Task | Method |
|------|--------|
| Get sandbox | `getSandbox(env.Sandbox, 'user-123')` |
| Run command | `await sandbox.exec('python script.py')` |
| Run code (interpreter) | `await sandbox.runCode(code, { language: 'python' })` |
| Write file | `await sandbox.writeFile('/workspace/app.py', content)` |
| Read file | `await sandbox.readFile('/workspace/app.py')` |
| Create directory | `await sandbox.mkdir('/workspace/src', { recursive: true })` |
| List files | `await sandbox.listFiles('/workspace')` |
| Expose port | `await sandbox.exposePort(8080)` |
| Destroy | `await sandbox.destroy()` |

## Core Patterns

### Execute Commands

```typescript
const sandbox = getSandbox(env.Sandbox, 'user-123');
const result = await sandbox.exec('python --version');
// result: { stdout, stderr, exitCode, success }
```

### Code Interpreter (Recommended for AI)

Use `runCode()` for executing LLM-generated code with rich outputs:

```typescript
const ctx = await sandbox.createCodeContext({ language: 'python' });

await sandbox.runCode('import pandas as pd; data = [1,2,3]', { context: ctx });
const result = await sandbox.runCode('sum(data)', { context: ctx });
// result.results[0].text = "6"
```

**Languages**: `python`, `javascript`, `typescript`

State persists within context. Create explicit contexts for production.

### File Operations

```typescript
await sandbox.mkdir('/workspace/project', { recursive: true });
await sandbox.writeFile('/workspace/project/main.py', code);
const file = await sandbox.readFile('/workspace/project/main.py');
const files = await sandbox.listFiles('/workspace/project');
```

## When to Use What

| Need | Use | Why |
|------|-----|-----|
| Shell commands, scripts | `exec()` | Direct control, streaming |
| LLM-generated code | `runCode()` | Rich outputs, state persistence |
| Build/test pipelines | `exec()` | Exit codes, stderr capture |
| Data analysis | `runCode()` | Charts, tables, pandas |

## Extending the Dockerfile

Base image (`docker.io/cloudflare/sandbox:0.7.0`) includes Python 3.11, Node.js 20, and common tools.

Add dependencies by extending the Dockerfile:

```dockerfile
FROM docker.io/cloudflare/sandbox:0.7.0

# Python packages
RUN pip install requests beautifulsoup4

# Node packages (global)
RUN npm install -g typescript

# System packages
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

EXPOSE 8080  # Required for local dev port exposure
```

Keep images lean - affects cold start time.

## Preview URLs (Port Exposure)

Expose HTTP services running in sandboxes:

```typescript
const { url } = await sandbox.exposePort(8080);
// Returns preview URL for the service
```

**Production requirement**: Preview URLs need a custom domain with wildcard DNS (`*.yourdomain.com`). The `.workers.dev` domain does not support preview URL subdomains.

See: https://developers.cloudflare.com/sandbox/guides/expose-services/

## OpenAI Agents SDK Integration

The SDK provides helpers for OpenAI Agents at `@cloudflare/sandbox/openai`:

```typescript
import { Shell, Editor } from '@cloudflare/sandbox/openai';
```

See `examples/openai-agents` for complete integration pattern.

## Sandbox Lifecycle

- `getSandbox()` returns immediately - container starts lazily on first operation
- Containers sleep after 10 minutes of inactivity (configurable via `sleepAfter`)
- Use `destroy()` to immediately free resources
- Same `sandboxId` always returns same sandbox instance

## Anti-Patterns

- **Don't use internal clients** (`CommandClient`, `FileClient`) - use `sandbox.*` methods
- **Don't skip the Sandbox export** - Worker won't deploy without `export { Sandbox }`
- **Don't hardcode sandbox IDs for multi-user** - use user/session identifiers
- **Don't forget cleanup** - call `destroy()` for temporary sandboxes

## Detailed References

- **[references/api-quick-ref.md](references/api-quick-ref.md)** - Full API with options and return types
- **[references/examples.md](references/examples.md)** - Example index with use cases
