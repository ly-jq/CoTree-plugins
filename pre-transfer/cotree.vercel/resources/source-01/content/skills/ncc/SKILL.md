---
name: "import.codex.vercel.ncc"
description: "Expert guidance for @vercel/ncc — a simple CLI for compiling Node.js modules into a single file with all dependencies included. Use when bundling serverless functions, CLI tools, or any Node.js project into a self-contained file."
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

# @vercel/ncc — Node.js Compiler Collection

You are an expert in `@vercel/ncc`, Vercel's simple CLI for compiling a Node.js module into a single file, together with all its dependencies.

## Overview

ncc bundles a Node.js application and all of its `node_modules` into a single output file. This is ideal for:
- **Serverless functions** — deploy a single file instead of `node_modules`
- **CLI tools** — distribute a self-contained executable
- **Docker images** — reduce image size by eliminating `node_modules`

## Installation

```bash
npm install -g @vercel/ncc

# Or as a dev dependency
npm install --save-dev @vercel/ncc
```

## Basic Usage

```bash
# Compile index.js into dist/index.js
ncc build input.js -o dist/

# Watch mode for development
ncc build input.js -o dist/ -w

# Run directly without writing to disk
ncc run input.js
```

## CLI Options

| Flag | Description |
|---|---|
| `-o, --out [dir]` | Output directory (default: `dist`) |
| `-m, --minify` | Minify the output |
| `-s, --source-map` | Generate source maps |
| `-a, --asset-builds` | Build nested JS assets recursively |
| `-e, --external [mod]` | Keep module as external (don't bundle) |
| `-w, --watch` | Watch mode — rebuild on changes |
| `-t, --transpile-only` | Skip TypeScript type checking |
| `--license [file]` | Output licenses to a file |
| `-q, --quiet` | Suppress non-error output |
| `--no-cache` | Skip the build cache |
| `--no-asset-builds` | Skip nested JS asset builds |

## package.json Integration

```json
{
  "scripts": {
    "build": "ncc build src/index.ts -o dist/ -m",
    "build:watch": "ncc build src/index.ts -o dist/ -w",
    "start": "node dist/index.js"
  },
  "devDependencies": {
    "@vercel/ncc": "^0.38.0"
  }
}
```

## TypeScript Support

ncc natively supports TypeScript — no separate `tsc` step needed:

```bash
# Compiles TypeScript directly
ncc build src/index.ts -o dist/

# Skip type checking for faster builds
ncc build src/index.ts -o dist/ -t
```

ncc uses the project's `tsconfig.json` automatically.

## Externals

Keep specific modules out of the bundle (useful for native modules or optional dependencies):

```bash
# Single external
ncc build input.js -e aws-sdk

# Multiple externals
ncc build input.js -e aws-sdk -e sharp
```

For serverless environments where the runtime provides certain modules (like AWS Lambda's `aws-sdk`), mark them as external.

## Static Assets

ncc handles non-JS assets (`.json`, `.node`, binary files) by copying them to the output directory alongside the compiled JS file. They are referenced correctly at runtime.

## Common Patterns

### Serverless Function Bundling

```bash
# Build a minimal serverless handler
ncc build api/handler.ts -o .output/ -m --no-cache
```

### CLI Tool Distribution

```json
{
  "bin": "dist/index.js",
  "scripts": {
    "prepublishOnly": "ncc build src/index.ts -o dist/ -m"
  }
}
```

### GitHub Actions

```bash
# Bundle a GitHub Action into a single file
ncc build src/index.ts -o dist/ -m --license licenses.txt
```

GitHub Actions require all dependencies bundled — ncc is the recommended bundler for custom JS/TS actions.

## Key Points

1. **Single-file output** — all dependencies inlined, no `node_modules` needed at runtime
2. **TypeScript native** — compiles `.ts` files directly using the project's `tsconfig.json`
3. **No config file** — entirely driven by CLI flags
4. **Asset handling** — non-JS files are automatically copied to the output directory
5. **Use externals for native modules** — binary `.node` modules often need to be external
6. **Source maps for debugging** — use `-s` flag to generate `.js.map` files
7. **Watch mode for dev** — use `-w` for fast iteration during development

## Official Resources

- [ncc GitHub](https://github.com/vercel/ncc)
- [Vercel Blog — ncc Introduction](https://github.com/vercel/ncc)
