---
name: "import.codex.remotion.remotion-best-practices"
description: "Router for all Remotion skills"
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

## Creating a video

If the user asks to make, create, or build a new video or composition, load [Create a new Remotion video](./remotion-create/REFERENCE.md), whether or not a Remotion project already exists.

## New project setup

If no Remotion project currently exists, load [Create a new Remotion project](./remotion-create/REFERENCE.md)

## React Markup Best Practices

If you are writing Remotion React Markup, load [Remotion Markup Best Practices](./remotion-markup/REFERENCE.md)

## Maps

For static maps, animated routes and markers, geographic explainers, Mapbox, MapLibre, MapTiler, GeoJSON, or 3D geographic flyovers, load [Remotion Maps](./remotion-maps/REFERENCE.md).

## Multimedia

For achieving multimedia tasks in the browser, such as trimming, cropping videos, or getting metadata from them, load [Remotion Multimedia](./remotion-multimedia/REFERENCE.md)

## Improving Interactivity

By structuring the Remotion markup well, we can allow users to interactively change things in the Studio and write back to code. If relevant: [Interactivity Best Practices](./remotion-interactivity/REFERENCE.md)

## Rendering

For advanced rendering beyond simple `npx remotion render`, see: [Rendering Best Practices](./remotion-render/REFERENCE.md)

## Opening Remotion Studio

To launch a project in Remotion Studio, open its exact local URL, or configure Studio CLI flags, load [Remotion Studio](./remotion-studio/REFERENCE.md).

## Captions

When working with Captions, load [Remotion Captions](./remotion-captions/REFERENCE.md).

## Creating a SaaS, automation or application

Use the [Remotion SaaS skill](./remotion-saas/REFERENCE.md) for knowledge about Remotion-powered SaaS apps, such as `<Player>`, rendering on Lambda, Vercel, Cloudflare, via Express.js, client-side rendering, or for finding the right SaaS template.

## Looking up Remotion APIs and documentation

To find and read current Remotion documentation, load [Remotion Docs](./remotion-docs/REFERENCE.md).

## Upgrading

To upgrade Remotion, related packages, compatible Mediabunny packages, and installed Remotion Agent Skills, load [Remotion Upgrade](./remotion-upgrade/REFERENCE.md).


## Codex troubleshooting

When running inside Codex, first try starting the Remotion Studio without opening the system browser:

```bash
npx remotion studio --no-open
```

Only if that fails with file watcher limits such as `EMFILE: too many open files, watch`, retry with polling and without opening a browser from Codex:

```bash
npx remotion studio --no-open --webpack-poll 1000
```

If Studio still fails to start from Codex, ask the user to start it manually from their macOS Terminal and then continue using the already-running Studio. Sandbox errors while launching Chromium from Codex are likely caused by the Codex/macOS sandbox rather than the Remotion project.
