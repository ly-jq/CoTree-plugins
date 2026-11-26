# 外部 Agent CLI 管理器 (`cotree.external-cli` v0.8.0)

以非入侵 CoTree 核心的方式，通过 CoTree Plugin SDK (`manifestVersion: 4`, Service Runtime + `workspaceScope: "control"` + `outputPolicy: "rolling"` + `processEnvironmentInherit` + `session.wake`) 统一托管全部 9 个外部 Agent CLI（**Codex CLI**、**Claude Code CLI**、**Antigravity CLI (`agy`)**、**Gemini CLI**、**OpenCode**、**Qwen Code**、**Kiro CLI**、**Goose**、**自定义 ACP**）及白名单内可选本地 CLI（`aider`/`cline`/`cursor-agent`/`copilot`/`amp`/`droid`）的完整生命周期，并提供**双视图可视化控制面**（右侧 Sidecar 态势栏 + 主画布全屏 Transcript 会话详情页）。

## v0.8.0 变更说明（自 v0.7.5 升级）

1. **事件驱动 `wait(mode="subscribe")` 持续监听（彻底消除 9/10/15 分钟超时上限）**：
   - 新增宿主能力 `session.wake`（仅授权给发起 `start`/`wait` 的 `runId` + `sessionId`，负载严格有界 <= 64 KiB，取消/结束即吊销、零幽灵唤醒）。
   - `wait` 新增 `mode: "subscribe"`：立即返回 `{ ok: true, pending: true, subscriptionId, nextAfterSeq, resume, summary }`；当 CLI 状态变化时，Service 主动发送 `cli.session.updated` 并经宿主唤醒发起等待的 Run/Session，长任务（>20 分钟乃至数小时）无超时、中间零额外模型轮次。
   - 保持 100% 向后兼容：省略 `mode` 默认仍走 `block` 阻塞等待（上限提升至 `870_000` ms，刚好低于宿主 15 分钟硬上限，仅作兼容降级）。
   - 锁定活跃 CLI 进程存在时 Service 不会被 `idleTimeoutMs` 回收。
2. **Agent 工具层与 UI 能力完全对齐（7 → 14 个工具）**：
   - 新增 `handoff`、`fork`、`compact`、`undoTurn`、`queue`（完整 6 动作：`add`/`edit`/`remove`/`clear`/`resume`/`promote`）、`listNativeSessions`、`importNative` 7 个 Agent 工具，全部复用现有 Service handler。
   - `start` / `steer` / `queue` 暴露 `attachments` schema（最多 12 个附件引用）。
   - `inspect` / `start` 描述全面更新为 9 个引擎；全部现有 `view.*` RPC 100% 保留。
3. **可扩展本机 CLI 与诊断增强**：
   - `engine="acp"` 支持 `command` / `args` / `env` 覆盖，解析顺序严格遵循 `settings.customCliAllowlist -> declared nativeExecutables -> 拒绝`，严禁任意绝对路径执行。
   - 新增可选系统 CLI 声明（`aider`、`cline`、`cursor-agent`、`copilot`、`amp`、`droid`，仅 PATH 查找，不硬编码不存在路径）。
   - `inspect` 输出每引擎 `command`、`resolvedPath`、`version`、`authStatus`（`ok`/`missing`/`unverified` + 可执行错误码与修复命令）、`capabilities`、`unsupported` 列表、`optionalExecutables`、`resourceQuotas` 与 `effectiveSettings`。
4. **引擎能力诚实降级（禁止静默 no-op）**：
   - `antigravity`：`stop(mode="interrupt")` 在运行中尝试 `stdin_eof` 软中断并在未确认时返回显式 `unsupported` + `nextAction`；`respond` 不支持结构化决策时返回显式 `unsupported` 并提示使用 `text` 模式。
   - 不支持 `midTurnSteer` 的引擎（`gemini`/`opencode`/`qwen`/`goose`/`acp`）：运行中调用 `steer` 自动降级为 `queue` 并返回 `effectiveStrategy` + `degradedReason`。
   - `reasoningEffort` / `serviceTier="fast"` / `interactionMode="plan"` / `attachments`：支持的引擎（如 `opencode`/`acp` 的 `reasoningEffort`）真实映射，不支持的引擎显式返回 `unsupported: true` + `unsupportedOptions`。
   - `undoTurn` 对非原生回滚引擎明确走 CoTree 隐藏 Git 检查点并标注 `rollbackStrategy`，在主工作区外强制保留 `forceRevertFiles` 护栏。
5. **Manifest `settings` 显式配置（安全默认值不放宽）**：
   - 声明 `user`/`workspace` 双作用域 `settings`：`allowedWorkspaceRoots`（默认空）、`extraEnvAllowlist`（默认空，仅宿主直接继承，值不进入插件 JS 与日志）、`defaultPermissionMode`（默认 `supervised`）、`acpSilenceTimeoutMs`（默认 900_000，范围 60_000..3_600_000）、`historyLimits`（默认 48/64，上限 500/500）、`acpCommandOverride`、`customCliAllowlist`。
6. **Worker 模板与编排补齐（4 → 11 个内置 Agent）**：
   - 新增 `opencode-worker`、`qwen-worker`、`gemini-worker`、`kiro-worker`、`goose-worker`、`acp-worker` 与通用 `cli-worker`，更新 `coordinator` 覆盖全部 9 个引擎并说明 `handoff` / `fork` 与 `wait(mode="subscribe")` 用法。

## 支持引擎能力矩阵

| 引擎 | 默认命令 | 协议 | 运行中插话 | 软中断 | 结构化审批 | 原生分支 / 回滚 | Reasoning / Fast |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `codex` | `codex` | `codex.app-server.v2.jsonrpc` | 支持 | 支持 | 支持 | 原生 Fork / 原生 Revert | 支持 / 支持 |
| `claude` | `claude` | `claude.agent-sdk.v1` | 支持 | 支持 | 支持 | 原生 Fork / 原生 ResumeAt | 支持 / 支持 |
| `antigravity` | `agy` | `antigravity.stream-json.ndjson` | 支持 | `stdin_eof` 探测 + `kill` 回退 | 降级 `text` 帧 | 便携交接 / Git 检查点 | `unsupported` / `unsupported` |
| `gemini` | `gemini` | `acp.v1-v2.jsonrpc` / `stream-json` | 自动降级 `queue` | 支持 | 支持 | 便携交接 / Git 检查点 | `unsupported` / `unsupported` |
| `opencode` | `opencode` | `acp.v1-v2.jsonrpc` / `run` | 自动降级 `queue` | 支持 | 支持 | 原生 Fork / Git 检查点 | 支持 / `unsupported` |
| `qwen` | `qwen` | `acp.v1-v2.jsonrpc` / `stream-json` | 自动降级 `queue` | 支持 | 支持 | 便携交接 / Git 检查点 | `unsupported` / `unsupported` |
| `kiro` | `kiro-cli` | `acp.v1-v2.jsonrpc` | 支持 | 支持 | 支持 | 原生 Fork / Git 检查点 | `unsupported` / `unsupported` |
| `goose` | `goose` | `acp.v1-v2.jsonrpc` | 自动降级 `queue` | 支持 | 支持 | 便携交接 / Git 检查点 | `unsupported` / `unsupported` |
| `acp` | `acp-agent`（可覆盖） | `acp.v1-v2.jsonrpc` | 自动降级 `queue` | 支持 | 支持 | 原生 Fork / Git 检查点 | 支持 / `unsupported` |

## Agent 工具列表（14 个）

`inspect`、`start`、`wait`、`steer`、`respond`、`stop`、`read`、`handoff`、`fork`、`compact`、`undoTurn`、`queue`、`listNativeSessions`、`importNative`

## 视图控制面

- **右侧 Sidecar 态势栏（`cotree.external-cli.panel`）**：实时展示会话列表、引擎状态、审批处理、快捷插话、单会话删除（卡片删除按钮与内联详情 `...` 菜单）与内联会话详情。
- **主画布会话内容展示页（`cotree.external-cli.transcript`）**：统一 Transcript IR、Markdown 渲染、命令/Diff 折叠卡片、斜杠命令、队列管理、Handoff / Fork / Undo、左侧栏行内及顶栏 `...` 菜单删除会话（失败/已结束会话一键删除，活跃会话二次确认防误删，持久删除不复活）与原始协议帧查看。
