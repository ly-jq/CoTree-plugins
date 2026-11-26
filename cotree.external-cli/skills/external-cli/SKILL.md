---
name: cotree.external-cli.external-cli
description: 直接托管并控制全部 9 个外部 Agent CLI（Codex、Claude Code、Antigravity / agy、Gemini、OpenCode、Qwen Code、Kiro、Goose、自定义 ACP）的完整生命周期：支持事件驱动持续监听（wait mode='subscribe' + session.wake，无 9 分钟轮询上限）、运行中插话、队列调度、审批干预、跨引擎无损交接、分支、压缩、检查点撤回、原生会话导入与 Group worktree 并行委派。
---

# 外部 Agent CLI 托管使用指南 (v0.8.0)

本插件把外部 Agent CLI 托管在 CoTree 的 `cli-runner` 控制面 Service 与 `ManagedProcessManager` 之下，所有受管会话都会通过增量协议实时同步到 Desktop 右侧「外部 CLI 侧栏」与主画布「外部 CLI 会话详情」双视图中。

## 调用原则（单会话直调 vs 并行派发）

- **普通单会话：主会话直接调用插件工具，不要多套一层 `*-worker` 子 Agent**：
  - 通过 `ToolSearch` 加载所需工具后即可直接启动并控制任意受管外部 CLI。
  - **不要**在调用 `PluginCoTreeExternalCliStart` 前先用 `Bash` 跑 `--version` / `--help` 试探参数；需要查看本机已装引擎、路径、版本、鉴权状态 (`authStatus`)、能力表 (`capabilities` / `unsupported`) 或模型目录时，直接调用 `PluginCoTreeExternalCliInspect`。
- **长任务持续监听（推荐）**：
  - 调用 `PluginCoTreeExternalCliWait({ cliSessionId, until: "turn_or_intervention", mode: "subscribe" })` 会立即返回 `{ pending: true, subscriptionId }`；不要用短超时循环轮询！
  - 当外部 CLI 完成轮次、请求审批干预或退出时，Service 主动推送 `cli.session.updated` 并经宿主 `session.wake` 自动唤醒当前 Run/Session，不受 9/10/15 分钟工具超时限制，中间无额外模型轮次。
  - 省略 `mode` 默认走 `mode: "block"`（兼容降级，上限 870 秒，仅适合短任务或兼容旧调用方）。
- **多任务并行 / 隔离 worktree / Group Session**：
  - 当需要将多个独立子任务并行分发到不同 worktree 时，可派发 `cotree.external-cli.coordinator` 或对应引擎 Worker：`codex-worker`、`claude-worker`、`antigravity-worker`、`opencode-worker`、`qwen-worker`、`gemini-worker`、`kiro-worker`、`goose-worker`、`acp-worker` 以及通用 `cli-worker`（通过任务 brief 指定 `engine`）。

## 全部 9 个支持引擎

| 引擎 | 默认命令 | 协议 | 特点与降级说明 |
| --- | --- | --- | --- |
| `codex` | `codex` | `codex.app-server.v2.jsonrpc` | 单进程多 `threadId` 复用、原生 `turn/steer`、`turn/interrupt`、Plan/Fast、`reasoningEffort`、结构化审批、原生 `fork`/`revert`/`compact`/`list`、`thread/inject_items` 交接 |
| `claude` | `claude` | `claude.agent-sdk.v1` | 在线切模型/思考深度/权限/Plan、`priority: "next"` 插话、结构化审批、`forkSession`/`resumeSessionAt`、`/compact` |
| `antigravity` | `agy` | `antigravity.stream-json.ndjson` | 双向长驻多轮、`--conversation` 续聊；不支持结构化 JSON-RPC 审批（`respond` 需使用 `text` 文本模式）与 `reasoningEffort`/`fast`（返回显式 `unsupported`）；`stop(mode='interrupt')` 尝试 `stdin_eof`，未确认时提示使用 `mode='kill'` |
| `gemini` | `gemini` | `acp.v1-v2.jsonrpc`（回退 `stream-json`） | ACP 结构化审批与软中断；不支持 `midTurnSteer`（运行中 `steer` 自动降级 `queue` 返回 `effectiveStrategy`+`degradedReason`）、不支持 `plan`/`reasoningEffort`/`fast` |
| `opencode` | `opencode` | `acp.v1-v2.jsonrpc`（回退 `run --format json`） | 动态 `opencode models`、ACP `reasoningEffort`、Plan 与原生 `fork`；不支持 `midTurnSteer`（自动降级 `queue`） |
| `qwen` | `qwen` | `acp.v1-v2.jsonrpc`（兼容 `--experimental-acp` 与 `stream-json`） | ACP Plan 与结构化审批；不支持 `midTurnSteer`（自动降级 `queue`） |
| `kiro` | `kiro-cli` | `acp.v1-v2.jsonrpc` | 支持 `midTurnSteer`、Plan、结构化审批与原生 `fork`；回滚走 CoTree 隐藏 Git 检查点 |
| `goose` | `goose` | `acp.v1-v2.jsonrpc` | 支持 ACP 软中断与结构化审批；不支持 `midTurnSteer`/`plan`/`attachments`/`reasoningEffort`/`fast` |
| `acp` | `acp-agent`（可覆盖） | `acp.v1-v2.jsonrpc` | 支持 `command`/`args`/`env` 覆盖（严格校验 `settings.customCliAllowlist -> nativeExecutables -> 拒绝`，禁止任意绝对路径；已内置 `aider`/`cline`/`cursor-agent`/`copilot`/`amp`/`droid` 可选声明） |

## 全部 14 个 Agent 工具清单

1. `PluginCoTreeExternalCliInspect`：查看全部 9 引擎及可选 CLI 可用性、`command`/`resolvedPath`/`version`、`authStatus`（`ok`/`missing`/`unverified` + 修复命令）、`capabilities`、`unsupported` 列表、模型目录、`resourceQuotas`、`effectiveSettings` 与托管会话。
2. `PluginCoTreeExternalCliStart`：启动受管 CLI 会话。支持 `engine`、`prompt`、`cwd`、`mode`、`model`、`reasoningEffort`、`permissionMode`、`interactionMode`、`serviceTier`、`approvalPolicy`、`sandbox`、`resumeSessionId`、`label`、`attachments`（最多 12 个）、`command`/`args`/`env`（`acp` 命令模式）、`extraArgs`、`waitMs`。
3. `PluginCoTreeExternalCliWait`：等待会话事件；长任务优先 `mode: "subscribe"`（事件驱动 push 唤醒），兼容默认 `mode: "block"`（上限 870s）。
4. `PluginCoTreeExternalCliSteer`：向会话发送插话或续聊指令，支持 `strategy`（`auto`/`in_turn`/`next_turn`/`interrupt_and_resume`/`queue`）、`attachments` 与在线参数切换；不支持 `midTurnSteer` 的引擎自动降级为 `queue` 并返回 `effectiveStrategy` + `degradedReason`。
5. `PluginCoTreeExternalCliRespond`：回应 `needs_intervention` 的审批请求、ACP 权限选项或结构化提问；不支持结构化审批的引擎（如 `antigravity`）会显式返回 `unsupported` 并提示使用 `text` 模式。
6. `PluginCoTreeExternalCliStop`：`mode: "interrupt"` 软中断当前轮次；`mode: "kill"` 终止进程并清理全部订阅。
7. `PluginCoTreeExternalCliRead`：读取会话快照、完整结构化 Transcript (`includeTranscript: true`)、分页时间线事件或原始日志尾段 (`includeRawTail: true`)；省略 `cliSessionId` 时列出全部会话。
8. `PluginCoTreeExternalCliHandoff`：将当前会话上下文无损交接至另一个引擎（Codex 优先原生 `thread/inject_items`，其余注入结构化前缀）。
9. `PluginCoTreeExternalCliFork`：从指定轮次 (`atTurnIndex`) 分支新会话（优先原生 fork，否则使用可移植快照）。
10. `PluginCoTreeExternalCliCompact`：触发原生上下文压缩（Codex `thread/compact/start` / Claude `/compact`）；不支持的引擎返回显式 `unsupported: true` 与 `alternatives: ["handoff", "fork"]`。
11. `PluginCoTreeExternalCliUndoTurn`：撤回指定轮次；`revertFiles: true` 还原隐藏 Git 检查点。在主工作区（非独立 worktree）回滚磁盘文件必须显式传 `forceRevertFiles: true`。
12. `PluginCoTreeExternalCliQueue`：管理等待队列，完整支持 `add` / `edit` / `remove` / `clear` / `resume` / `promote` 6 种动作及 `attachments`。
13. `PluginCoTreeExternalCliListNativeSessions`：列出本地引擎发现的原生会话（Codex threads / 活跃 ACP sessions）。
14. `PluginCoTreeExternalCliImportNative`：按 `engine` + `externalSessionId` 导入原生会话到 CoTree 控制面（默认自动恢复）。

## 严禁伪造能力

- 任何引擎返回 `unsupported: true`、`unsupportedOptions`、`degradedReason` 或 `authStatus.status !== "ok"` 时，必须如实反馈给用户或调度者，不得假装参数已生效或跳过真实验证。
