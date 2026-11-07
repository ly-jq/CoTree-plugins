---
name: "import.codex.test-android-apps.android-emulator-qa"
description: "Use when validating Android feature flows in an emulator with adb-driven launch, input, UI-tree inspection, screenshots, and logcat capture."
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

# Android Emulator QA

Validate Android app flows in an emulator using adb for launch, input, UI-tree inspection, screenshots, and logs.

## When to use
- QA a feature flow in an Android emulator.
- Reproduce UI bugs by driving navigation with adb input events.
- Capture screenshots and logcat output while testing.

## Quick start
1) List emulators and pick a serial:
   - `adb devices`
2) Build and install the target variant:
   - `./gradlew :<module>:install<BuildVariant> --console=plain --quiet`
   - If unsure about task names: `./gradlew tasks --all | rg install`
3) Launch the app:
   - Resolve activity: `adb -s <serial> shell cmd package resolve-activity --brief <package>`
   - Start app: `adb -s <serial> shell am start -n <package>/<activity>`
4) Capture a screenshot for visual verification:
   - `adb -s <serial> exec-out screencap -p > /tmp/emu.png`

## adb control commands
- Tap (use UI tree-derived coordinates):
  - `adb -s <serial> shell input tap <x> <y>`
- Swipe:
  - `adb -s <serial> shell input swipe <x1> <y1> <x2> <y2>`
  - Avoid edges (start ~150-200 px from left/right) to reduce accidental back gestures.
- Text:
  - `adb -s <serial> shell input text "hello"`
- Back:
  - `adb -s <serial> shell input keyevent 4`
- UI tree dump:
  - `adb -s <serial> exec-out uiautomator dump /dev/tty`

## Coordinate picking (UI tree only)
Always compute tap coordinates from the UI tree, not screenshots.

1) Dump the UI tree to a step-specific file:
   - `adb -s <serial> exec-out uiautomator dump /dev/tty > /tmp/ui-settings.xml`
2) Find the target node and derive center coordinates (`x y`) from bounds:
   - Bounds format: `bounds="[x1,y1][x2,y2]"`
   - Helper script:
   - `python3 <path-to-skill>/scripts/ui_pick.py /tmp/ui-settings.xml "Settings"`
3) If the node is missing and there are `scrollable` elements:
   - swipe, re-dump, and re-search at least once before concluding the target is missing.
4) Tap the center:
   - `adb -s <serial> shell input tap <x> <y>`

## UI tree skeleton (helper)
Use this helper to create a compact, readable overview before inspecting full XML.

1) Dump full UI tree:
   - `adb -s <serial> exec-out uiautomator dump /dev/tty > /tmp/ui-full.xml`
2) Generate summary:
   - `python3 <path-to-skill>/scripts/ui_tree_summarize.py /tmp/ui-full.xml /tmp/ui-summary.txt`
3) Review `/tmp/ui-summary.txt` to choose likely targets, then compute exact bounds from full XML.

## Logs (logcat)
1) Clear logs:
   - `adb -s <serial> logcat -c`
2) Stream app process logs:
   - Resolve pid: `adb -s <serial> shell pidof -s <package>`
   - Stream: `adb -s <serial> logcat --pid <pid>`
3) Crash buffer only:
   - `adb -s <serial> logcat -b crash`
4) Save logs:
   - `adb -s <serial> logcat -d > /tmp/logcat.txt`

## Package shortcuts
- List installed packages:
  - `adb -s <serial> shell pm list packages`
- Filter to your namespace:
  - `adb -s <serial> shell pm list packages | rg <company_or_app_id>`
- Confirm the activity resolves before launching:
  - `adb -s <serial> shell cmd package resolve-activity --brief <package>`
