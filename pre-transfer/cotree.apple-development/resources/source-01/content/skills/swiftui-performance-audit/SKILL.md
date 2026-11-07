---
name: "import.codex.build-ios-apps.swiftui-performance-audit"
description: "Audit SwiftUI runtime performance from code first. Use when diagnosing slow rendering, janky scrolling, expensive updates, or profiling needs."
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

# SwiftUI Performance Audit

## Quick start

Use this skill to diagnose SwiftUI performance issues from code first, then request profiling evidence when code review alone cannot explain the symptoms.

## Workflow

1. Classify the symptom: slow rendering, janky scrolling, high CPU, memory growth, hangs, or excessive view updates.
2. If code is available, start with a code-first review using `references/code-smells.md`.
3. If code is not available, ask for the smallest useful slice: target view, data flow, reproduction steps, and deployment target.
4. If code review is inconclusive or runtime evidence is required, guide the user through profiling with `references/profiling-intake.md`.
5. Summarize likely causes, evidence, remediation, and validation steps using `references/report-template.md`.

## 1. Intake

Collect:
- Target view or feature code.
- Symptoms and exact reproduction steps.
- Data flow: `@State`, `@Binding`, environment dependencies, and observable models.
- Whether the issue shows up on device or simulator, and whether it was observed in Debug or Release.

Ask the user to classify the issue if possible:
- CPU spike or battery drain
- Janky scrolling or dropped frames
- High memory or image pressure
- Hangs or unresponsive interactions
- Excessive or unexpectedly broad view updates

For the full profiling intake checklist, read `references/profiling-intake.md`.

## 2. Code-First Review

Focus on:
- Invalidation storms from broad observation or environment reads.
- Unstable identity in lists and `ForEach`.
- Heavy derived work in `body` or view builders.
- Layout thrash from complex hierarchies, `GeometryReader`, or preference chains.
- Large image decode or resize work on the main thread.
- Animation or transition work applied too broadly.

Use `references/code-smells.md` for the detailed smell catalog and fix guidance.

Provide:
- Likely root causes with code references.
- Suggested fixes and refactors.
- If needed, a minimal repro or instrumentation suggestion.

## 3. Guide the User to Profile

If code review does not explain the issue, ask for runtime evidence:
- A trace export or screenshots of the SwiftUI timeline and Time Profiler call tree.
- Device/OS/build configuration.
- The exact interaction being profiled.
- Before/after metrics if the user is comparing a change.

Use `references/profiling-intake.md` for the exact checklist and collection steps.

## 4. Analyze and Diagnose

- Map the evidence to the most likely category: invalidation, identity churn, layout thrash, main-thread work, image cost, or animation cost.
- Prioritize problems by impact, not by how easy they are to explain.
- Distinguish code-level suspicion from trace-backed evidence.
- Call out when profiling is still insufficient and what additional evidence would reduce uncertainty.

## 5. Remediate

Apply targeted fixes:
- Narrow state scope and reduce broad observation fan-out.
- Stabilize identities for `ForEach` and lists.
- Move heavy work out of `body` into derived state updated from inputs, model-layer precomputation, memoized helpers, or background preprocessing. Use `@State` only for view-owned state, not as an ad hoc cache for arbitrary computation.
- Use `equatable()` only when equality is cheaper than recomputing the subtree and the inputs are truly value-semantic.
- Downsample images before rendering.
- Reduce layout complexity or use fixed sizing where possible.

Use `references/code-smells.md` for examples, Observation-specific fan-out guidance, and remediation patterns.

## 6. Verify

Ask the user to re-run the same capture and compare with baseline metrics.
Summarize the delta (CPU, frame drops, memory peak) if provided.

## Outputs

Provide:
- A short metrics table (before/after if available).
- Top issues (ordered by impact).
- Proposed fixes with estimated effort.

Use `references/report-template.md` when formatting the final audit.

## References

- Profiling intake and collection checklist: `references/profiling-intake.md`
- Common code smells and remediation patterns: `references/code-smells.md`
- Audit output template: `references/report-template.md`
- Add Apple documentation and WWDC resources under `references/` as they are supplied by the user.
- Optimizing SwiftUI performance with Instruments: `references/optimizing-swiftui-performance-instruments.md`
- Understanding and improving SwiftUI performance: `references/understanding-improving-swiftui-performance.md`
- Understanding hangs in your app: `references/understanding-hangs-in-your-app.md`
- Demystify SwiftUI performance (WWDC23): `references/demystify-swiftui-performance-wwdc23.md`
- In addition to the references above, use web search to consult current Apple Developer documentation when Instruments workflows or SwiftUI performance guidance may have changed.
