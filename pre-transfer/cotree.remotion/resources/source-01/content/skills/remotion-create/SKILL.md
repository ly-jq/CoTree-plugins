---
name: "import.codex.remotion.remotion-create"
description: "Create a new Remotion video"
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

These are instructions for making a new Remotion project and composition.
If this is not the next task, see [Remotion Best Practices](../remotion-best-practices/SKILL.md)

## Scaffold a project

If a project already exists, skip this.
Ensure Node.js and Git is installed, and the current folder is appropriate for starting a new project.

Scaffold one using:

```bash
npx create-video@latest --yes --blank --no-tailwind my-video
cd my-video
npm i
```

Replace `my-video` with a suitable project name.

## Designing a video

Keep the scaffold and add React Markup.
Follow [Remotion React Markup Best Practices](../remotion-markup/SKILL.md) and [Video Layout Rules](video-layout.md) for video-first layout and text sizing guidance.

## Is this a multi-scene video?

If this is a video with multiple subsequence videos, follow guidance at [Multi-scene videos](../remotion-markup/multi-scene-video.md).

## Interactivity Best Practices

By structuring the React Markup following [Remotion Interactivity Best Practices](../remotion-interactivity/SKILL.md), you allow the user to make edits in the Studio which write back to code.

## TailwindCSS

If Tailwind is requested, see [tailwind.md](tailwind.md) for using TailwindCSS in Remotion.

## Open the preview

After creating or updating the video, start the preview server by default:

```bash
npx remotion studio --no-open
```

This will start a long-running process and print the server URL for the preview.
If the server is already started, it will print the URL.
Open the exact URL in the Codex in-app browser. If no browser tool is available yet, use `tool_search` for the in-app browser control tool, then navigate to the local URL.
You can visit a specific composition by navigating to `/[composition-id]`, for example `http://localhost:3000/MapAnimation`.

## Render the video

Only render if the user explicitly asks for it.

```
npx remotion render
```

For more options, see [Rendering](../remotion-render/SKILL.md).

## Follow-up

The video creation process has finished.
For follow-up prompts, use [Remotion Best Practices](../remotion-best-practices/SKILL.md)
