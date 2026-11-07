---
name: "import.codex.build-macos-apps.appkit-interop"
description: "Bridge macOS SwiftUI into AppKit narrowly. Use when implementing representables, reaching NSWindow or panels, handling menus, or using the responder chain."
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

# AppKit Interop

## Quick Start

Use this skill when SwiftUI is close but not quite enough for native macOS behavior.
Keep the bridge as small and explicit as possible. SwiftUI should usually remain
the source of truth, while AppKit handles the imperative edge.

## Choose The Smallest Bridge

- Use pure SwiftUI when the required behavior already exists in scenes, toolbars, commands, inspectors, or standard controls.
- Use `NSViewRepresentable` when you need a specific AppKit view with lightweight lifecycle needs.
- Use `NSViewControllerRepresentable` when you need controller lifecycle, delegation, or presentation coordination.
- Use direct AppKit window or app hooks when you need `NSWindow`, responder-chain, menu validation, panels, or app-level behavior.

## Workflow

1. Name the capability gap precisely.
   - Window behavior
   - Text system behavior
   - Menu validation
   - Drag and drop
   - File open/save panels
   - First responder control

2. Pick the smallest boundary that solves it.
   - Avoid porting a whole screen to AppKit when one wrapped control or coordinator would do.

3. Keep ownership explicit.
   - SwiftUI owns value state, selection, and observable models.
   - AppKit objects stay inside the representable, coordinator, or bridge object.

4. Expose a narrow interface back to SwiftUI.
   - Bindings for editable state
   - Small callbacks for events
   - Focused bridge services only when necessary

5. Validate lifecycle assumptions.
   - SwiftUI may recreate representables.
   - Coordinators exist to hold delegate and target-action glue, not as a second app architecture.

## References

- `references/representables.md`: choosing between view and view-controller wrappers, plus coordinator patterns.
- `references/window-panels.md`: window access, utility windows, and open/save panels.
- `references/responder-menus.md`: first responder, command routing, and menu validation.
- `references/drag-drop-pasteboard.md`: pasteboard, file URLs, and desktop drag/drop edges.

## Guardrails

- Do not duplicate the source of truth between SwiftUI and AppKit.
- Do not let `Coordinator` become an unstructured dumping ground.
- Do not store long-lived `NSView` or `NSWindow` instances globally without a strong ownership reason.
- Prefer a tiny tested bridge over rewriting the feature in raw AppKit.
- If a pattern can remain entirely in `swiftui-patterns`, keep it there.

## Output Expectations

Provide:
- the exact SwiftUI limitation being crossed
- the smallest recommended bridge type
- the data-flow boundary between SwiftUI and AppKit
- the lifecycle or validation risks to watch
