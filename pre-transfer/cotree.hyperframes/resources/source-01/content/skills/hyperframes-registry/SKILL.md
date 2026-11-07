---
name: "import.codex.hyperframes.hyperframes-registry"
description: "Install and wire registry blocks and components into HyperFrames compositions. Use when running hyperframes add, installing a block or component, wiring an installed item into index.html, or working with hyperframes.json. Covers the add command, install locations, block sub-composition wiring, component snippet merging, and registry discovery."
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

# HyperFrames Registry

The registry provides reusable blocks and components installable via `hyperframes add <name>`.

- **Blocks** — standalone sub-compositions (own dimensions, duration, timeline). Included via `data-composition-src` in a host composition.
- **Components** — effect snippets (no own dimensions). Pasted directly into a host composition's HTML.

## When to use this skill

- User mentions `hyperframes add`, "block", "component", or `hyperframes.json`
- Output from `hyperframes add` appears in the session (file paths, clipboard snippet)
- You need to wire an installed item into an existing composition
- You want to discover what's available in the registry

## Quick reference

```bash
hyperframes add data-chart              # install a block
hyperframes add grain-overlay           # install a component
hyperframes add shimmer-sweep --dir .   # target a specific project
hyperframes add data-chart --json       # machine-readable output
hyperframes add data-chart --no-clipboard  # skip clipboard (CI/headless)
```

After install, the CLI prints which files were written and a snippet to paste into your host composition. The snippet is a starting point — you'll need to add `data-composition-id` (must match the block's internal composition ID), `data-start`, and `data-track-index` attributes when wiring blocks.

Note: `hyperframes add` only works for blocks and components. For examples, use `hyperframes init <dir> --example <name>` instead.

## Install locations

Blocks install to `compositions/<name>.html` by default.
Components install to `compositions/components/<name>.html` by default.

These paths are configurable in `hyperframes.json`:

```json
{
  "registry": "https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry",
  "paths": {
    "blocks": "compositions",
    "components": "compositions/components",
    "assets": "assets"
  }
}
```

See [install-locations.md](./references/install-locations.md) for full details.

## Wiring blocks

Blocks are standalone compositions — include them via `data-composition-src` in your host `index.html`:

```html
<div
  data-composition-id="data-chart"
  data-composition-src="compositions/data-chart.html"
  data-start="2"
  data-duration="15"
  data-track-index="1"
  data-width="1920"
  data-height="1080"
></div>
```

Key attributes:

- `data-composition-src` — path to the block HTML file
- `data-composition-id` — must match the block's internal ID
- `data-start` — when the block appears in the host timeline (seconds)
- `data-duration` — how long the block plays
- `data-width` / `data-height` — block canvas dimensions
- `data-track-index` — layer ordering (higher = in front)

See [wiring-blocks.md](./references/wiring-blocks.md) for full details.

## Wiring components

Components are snippets — paste their HTML into your composition's markup, their CSS into your style block, and their JS into your script (if any):

1. Read the installed file (e.g., `compositions/components/grain-overlay.html`)
2. Copy the HTML elements into your composition's `<div data-composition-id="...">`
3. Copy the `<style>` block into your composition's styles
4. Copy any `<script>` content into your composition's script (before your timeline code)
5. If the component exposes GSAP timeline integration (see the comment block in the snippet), add those calls to your timeline

See [wiring-components.md](./references/wiring-components.md) for full details.

## Discovery

Browse available items:

```bash
# Read the registry manifest
curl -s https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry/registry.json
```

Each item's `registry-item.json` contains: name, type, title, description, tags, dimensions (blocks only), duration (blocks only), and file list.

See [discovery.md](./references/discovery.md) for details on filtering by type and tags.
