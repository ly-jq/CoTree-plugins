---
name: "import.codex.build-ios-apps.ios-simulator-browser"
description: "Mirror an iOS Simulator into the Codex in-app browser and render SwiftUI previews from importable Swift packages in that simulator with hot reload. Use when a user wants to watch or interact with an iOS app in the browser, see a SwiftUI preview outside Xcode Canvas, iterate live on a preview, or capture browser-visible simulator proof."
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

# iOS Simulator Browser

## Browser Workflow

1. Obtain an explicit Simulator UDID from the existing iOS build/run workflow or from `xcrun simctl list devices available`.
2. Start `serve-sim` in a long-running terminal pinned to that simulator. Clean up any tracked stale helper for this simulator before starting, and install a trap so the helper is cleaned up when this terminal exits:

   ```bash
   SIM="<simulator-udid>"
   cleanup_serve_sim() {
     npx --yes serve-sim@latest --kill "$SIM" >/dev/null 2>&1 || true
   }
   trap cleanup_serve_sim EXIT INT TERM HUP
   cleanup_serve_sim
   npx --yes serve-sim@latest "$SIM"
   ```

3. Open the exact local preview URL printed by `serve-sim` in the Codex in-app browser.
4. Verify that a real frame is rendering before reporting success. A loaded page alone is not proof that the simulator stream is healthy.

- Keep the terminal alive while the browser mirror is in use. When finished, stop the terminal and wait for it to exit so the trap runs.
- If the terminal disappeared or did not exit cleanly, run `npx --yes serve-sim@latest --kill "$SIM"` before starting another mirror for that simulator.
- Never run an unscoped `serve-sim --kill`; another thread may own a different simulator mirror.

## SwiftUI Preview Workflow

Use the bundled launcher when the requested previews live in an importable Swift package. Point it at the package manifest and select the target whose previews should be displayed. It generates a disposable host project outside the user's source tree, installs and launches that host in Simulator, and watches the package for edits.

```bash
node <skill-root>/scripts/swiftui-preview-browser.mjs \
  /absolute/path/to/Package.swift \
  --package-target "<target>" \
  --device "<simulator-udid>"
```

- Watch mode is enabled by default. On a Swift package source edit, the launcher rebuilds a generated dylib and hot-swaps it into the running host without relaunching the app.
- The generated host shows every preview variant discovered in the selected Swift Package target with in-simulator page controls. To show a subset instead, pass `--preview-filter <regex[, ...]>`; it matches display names and code identifiers such as `StatusRowView_Previews`.
- Once the launcher prints the selected Simulator UDID, start `serve-sim` for that same UDID and open its printed URL in the in-app browser.

## Support Boundary

- Support Swift Package-backed `PreviewProvider` and `#Preview` declarations through the generated host.
- Do not edit the user's `.xcodeproj`, `.xcworkspace`, `Package.swift`, schemes, or build settings to force preview support.

## Proof

For browser or preview QA, capture a browser screenshot showing the simulator frame. For hot reload QA, also report the launcher's `hot reloaded package preview ... in pid ...` output and show the changed frame after editing.
