---
name: "import.codex.zoom.build-zoom-meeting-sdk-app"
description: "Use when using Meeting SDK."
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

# Build Zoom Meeting SDK App

Use this skill when the user needs to join, start, or embed real Zoom meetings. If the user wants a fully custom non-meeting video experience, route to `build-zoom-video-sdk-app`.

## Workflow

1. Confirm product fit: Meeting SDK joins real Zoom meetings; Video SDK creates custom sessions; Zoom Apps SDK runs inside the Zoom client.
2. Choose the target platform: web, Android, iOS, macOS, Windows, Electron, React Native, Unreal, or Linux bot.
3. Validate the join or start path: meeting number, password, SDK signature, role, ZAK when hosting, waiting room behavior, and user identity.
4. Implement the smallest join flow first, then add meeting controls, custom UI, raw data, recording, or bot behavior.
5. Debug by isolating signature generation, SDK version, platform permissions, meeting settings, waiting room, raw data entitlement, and network constraints.

## References

- Full preserved guide: [references/full-guide.md](references/full-guide.md)
- Web: [web/SKILL.md](web/SKILL.md)
- Android: [android/SKILL.md](android/SKILL.md)
- iOS: [ios/SKILL.md](ios/SKILL.md)
- Windows: [windows/SKILL.md](windows/SKILL.md)
- Linux bots: [linux/SKILL.md](linux/SKILL.md)
- Signature playbook: [references/signature-playbook.md](references/signature-playbook.md)
- Troubleshooting: [references/troubleshooting.md](references/troubleshooting.md)
