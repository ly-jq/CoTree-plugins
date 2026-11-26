# `cotree.external-cli` v0.8.0 Execution Plan

- **Created**: 2026-11-25
- **Target Version**: `0.7.5` -> `0.8.0`
- **Scope**:
  - Plugin: `plugins/cotree.external-cli`
  - Host: `packages/plugins`, `packages/plugin-sdk`, `packages/agent`, `packages/kernel`
- **Repository Rules Respected**:
  - Preserve unrelated dirty files in `git status`.
  - Keep `pnpm audit:no-unattributed-unknown` at 0 violations (use explicit attributed states such as `verified | missing | unverified` with `reason` + `nextAction` instead of unattributed `"unknown"` literals).
  - Never weaken `nativeExecutables` / `cwd` / `env` / `supervised` defaults unless configured via explicit manifest `settings` and host-enforced validation.
  - Keep all existing 7 Agent tools and all `view.*` UI RPCs 100% backward-compatible.

## Local CLI Environment Probe (2026-11-25)

| CLI / Engine | Binary | Local Status | Verification Strategy |
| --- | --- | --- | --- |
| `codex` | `C:\Users\Deon\AppData\Local\Microsoft\WinGet\Links\codex.exe` | **Installed** | Real CLI smoke (`start -> wait(subscribe) -> steer -> respond -> stop`) + new tools |
| `claude` | `C:\Users\Deon\AppData\Roaming\npm\claude.ps1` | **Installed** | Real CLI smoke (`start -> wait(subscribe) -> steer -> respond -> stop`) + new tools |
| `antigravity` | `C:\Users\Deon\AppData\Local\agy\bin\agy.exe` | **Installed** | Real CLI smoke (`start -> wait -> steer -> softInterrupt / stop`) |
| `gemini`, `opencode`, `qwen`, `kiro`, `goose`, `acp` | Not installed locally | **Missing (`untested` on real binary)** | Fake ACP / CLI integration tests + capability matrix tests; mark real binary `untested` |
| `aider`, `cline`, `cursor-agent`, `copilot`, `amp`, `droid` | Not installed locally | **Missing (`untested` on real binary)** | Declared as optional system executables with empty hardcoded paths (PATH lookup only) + allowlist unit tests |

## Key Architecture Decisions

### P1: Event-Driven `wait(mode="subscribe")` + Option A (`session.wake`)

- **Selected Option**: **Option A (`session.wake` host capability)** — true push wake from long-lived plugin Service to the originating Run/Session, with zero 9/10/15-minute polling timeouts and zero intermediate model turns.
- **Why Option A**:
  1. `service-runtime.ts` has a 15-minute hard cap on synchronous `service.call`, so synchronous blocking can never provide arbitrary multi-hour listening.
  2. Call-scoped `context.host.call` ends when `wait` returns, so push wake from a background CLI event 20+ minutes later requires a service-lifetime broker operation (`operation: "session.wake"` on `service.process.request`) gated by a **host-owned authorized wake target map** (`instance.authorizedWakeTargets`).
  3. **Security Invariants**:
     - Both `manifest.permissions.hostCapabilities` and `service.hostCapabilities` must declare `"session.wake"`.
     - Host (`runPluginServiceTool` -> `PluginServiceManager`) records the verified `{ runId, sessionId, toolCallId }` binding on `ServiceInstance`; plugin JSON can never invent or redirect to an arbitrary `runId` or `sessionId`.
     - Payload is strictly JSON-serializable and bounded (`<= 64 KiB`), carrying only event summary + bounded delta events (never full transcript).
     - Cancellation / session close immediately revokes wake targets and purges matching subscriptions (zero ghost wakes).
  4. **Kernel Wake Semantics**:
     - Active / paused Run: appends durable `host_gateway_message` (`kind: "tool_task_notification"`, `resultDelivery: "automatic"`, `source: "plugin_service_wake"`) to `runId`, calls `notifyCommittedAppend(runId)`, and resumes interrupted Run via `collaborations.resumeRun` when applicable.
     - Idle Session (originating Run completed normally after calling `wait(mode="subscribe")`): records durable idempotent reference observation on `sessionId` and wakes the session via `kernel.openSession({ sessionId })` -> `session.send({ commandId: notificationId, sessionMessageWake: true })`.
     - Cancelled Run / Closed Session: refuses wake (`woken: false`, reason `run_cancelled` / `session_closed`) and signals service to delete the subscription.
  5. **Backward Compatibility**:
     - `mode` omitted defaults to `"block"` with `timeoutMs` max raised to `870_000` ms (just under the 15-minute host call clamp), documented as compatibility fallback rather than the long-task path.
     - Active CLI processes already prevent `scheduleIdleStop` (`service-runtime.ts:859`); locked with an explicit regression test.

## Milestones & Execution Order

| Milestone | Scope | Status | Verification |
| --- | --- | --- | --- |
| **M0** | Inspect host/plugin contracts, probe local CLIs, write `PLAN.md` | **Done** | Local CLI probe + host file review complete |
| **M1 (P1)** | Implement `session.wake` host capability (`service-contract.ts`, `service-runtime.ts`, `service-tool-execution.ts`, `host-service-child.ts`, `plugin-sdk/src/service.ts`, `agent-loop-live-guidance.ts`, `kernel.ts`) + `wait(mode="subscribe")` subscription registry & `cli.session.updated` push; run **real >20-minute wall-clock fake-CLI soak test** | **Done** | `external-cli-event-wake.test.ts` (3/3 passed) + **20m10s real soak passed (`totalWaitMs=1209792`, `wakeLatencyMs=431`, `intermediateModelCallsWhileWaiting=0`, exit 0)** |
| **M2 (P0)** | Expose `handoff`, `fork`, `compact`, `undoTurn`, `queue`, `listNativeSessions`, `importNative` as Agent tools; add `attachments` to `start`/`steer`; update 9-engine tool descriptions | **Done** | Plugin `npm run typecheck` + `npm run build` passed (`tools: 14`, manifest validated); full Vitest coverage in M2/M7 |
| **M3 (P2)** | `acp` command override + `custom` engine command mode (`settings allowlist -> nativeExecutables -> reject`, no arbitrary unapproved absolute path), `inspect` `command`/`resolvedPath`/`version`, document `source: "user"` security review | **Done** | Plugin `typecheck` + `build` + allowlist/rejection & `inspect` diagnostics tests |
| **M4 (P3)** | Engine capability parity & explicit degradation: `antigravity` softInterrupt + approval degradation, `midTurnSteer` fallback (`effectiveStrategy` + `degradedReason`), non-native rollback Git checkpoint + guardrail, `reasoningEffort`/`fast` explicit `unsupported`, `inspect` `capabilities` + `unsupported`, capability matrix test | **Done** | Plugin `typecheck` + `build` passed; capability matrix Vitest & real `agy`/`codex`/`claude` smoke in M7 |
| **M5 (P4)** | Manifest `settings` (`allowedWorkspaceRoots`, `extraEnvAllowlist`, `defaultPermissionMode`, `acpSilenceTimeoutMs`, `historyLimits`, `acpCommandOverride`, `customCliAllowlist`), host-verified settings enforcement in `native-process-broker.ts` / `service-runtime.ts`, `normalizeRelativeCwd` allowlist branch, `inspect` `authStatus` (`ok`/`missing`/`unverified` + remediation) & resource quota reporting | **Done** | Plugin `typecheck` + `build` + `pnpm audit:no-unattributed-unknown` passed; settings/cwd/env/auth tests in M7 |
| **M6 (P5)** | Add `opencode-worker`, `qwen-worker`, `gemini-worker`, `kiro-worker`, `goose-worker`, `acp-worker`, `cli-worker`; update `coordinator` prompt; update `SKILL.md` & `README.md`; bump version `0.7.5 -> 0.8.0` | **Done** | Plugin `0.8.0` `typecheck` + `build` + manifest validation passed (`tools: 14`, `agents: 11`) |
| **M7** | Real CLI smoke matrix (`codex`, `claude`, `antigravity` + fake ACP), collect >20-min soak result, UI Sidecar/Transcript regression verification, repo `pnpm typecheck` / `pnpm lint` / `pnpm audit:no-unattributed-unknown` / Vitest, update `PLAN.md` with final evidence | **Done** | All verification commands recorded in Verification Log below |

## Security Review: Future Host `source: "user"` Native Executable Extension (§6.4)

Per §6.4, truly arbitrary user-supplied absolute binary paths are **intentionally NOT enabled by default** in v0.8.0. Instead, v0.8.0 provides:
- Declared system executables (`codex`, `claude`, `antigravity`, `gemini`, `opencode`, `qwen`, `kiro`, `goose`, `acp`, plus optional PATH-only CLIs `aider`, `cline`, `cursor-agent`, `copilot`, `amp`, `droid` without fabricated `searchPaths`)
- `engine="acp"` `command`/`args`/`env` mode enforcing `settings.customCliAllowlist -> nativeExecutables -> reject` and unconditionally rejecting path separators / drive letters / `..`.

If a future host milestone adds `source: "user"` to `PluginNativeExecutableDeclaration` in `packages/plugins/src/manifest.ts` and `native-process-broker.ts`, the following security invariants are mandatory:
1. **Explicit User Grant & Approval Boundary**: Every `source: "user"` entry must be granted out-of-band by the user (Desktop approval modal or CLI `--yes`) bound to `(pluginId, workspace, canonicalAbsolutePath, sha256)` — never auto-approved by plugin JSON or settings alone.
2. **Canonical Path & Symlink / UNC Validation**: Resolve with `fs.realpath`, reject Windows UNC paths (`\\server\share`), reject relative paths and traversal, reject writable temp/workspace-untrusted directories unless explicitly opted in.
3. **SHA-256 Digest Pinning at Execution Time**: Verify file SHA-256 immediately prior to `spawn` (mitigating binary swap; paired with read-only permissions warning when file is group/world-writable).
4. **Argument & Environment Isolation**: Preserve `processEnvironment` / `processEnvironmentInherit` allowlists and `shell: false` spawning (never passing through `cmd.exe /c` or `/bin/sh -c`).
5. **Audit Trail & Revocation**: Log every execution with resolved path + SHA-256 digest in `auditDir`, and allow one-click revocation in Desktop Plugin Settings.

## Verification Log

- **M0 (2026-11-25 22:06)**: Probed local CLIs via `Get-Command`: `codex`, `claude`, `agy` present; `gemini`, `opencode`, `qwen`, `kiro-cli`, `goose`, `acp-agent`, `aider`, `cline`, `cursor-agent`, `copilot`, `amp`, `droid` absent.
- **M1 (2026-11-25 22:33 & 22:54)**:
  - `pnpm exec vitest run tests/plugin-runtime/external-cli-event-wake.test.ts` — exit code `0` (3/3 passed): push wake with zero intermediate turns, `needs_intervention` + `respond`, `stop`/cancel zero ghost wakes, real Kernel Session idle auto-wake, `scheduleIdleStop` keepalive past 5000ms `idleTimeoutMs`, and `until="change"` repeatable non-duplicate seq cursor.
  - Real 20m10s wall-clock soak (`long-task-20m-verify.mts --delay-ms=1210000`) — exit code `0`: `subscribedAtIso=2026-11-25T14:34:19.740Z`, `cliEmittedAtIso=2026-11-25T14:54:29.101Z`, `wokenAtIso=2026-11-25T14:54:29.532Z`, **`totalWaitMs=1209792` (~20m10s)**, **`wakeLatencyMs=431` (<5000ms)**, **`intermediateModelCallsWhileWaiting=0`**, `containsExpectedPayload=true`, zero timeouts.
- **M2–M6 (2026-11-25 22:35–22:48)**:
  - `npm --prefix d:\CoTree\plugins\cotree.external-cli run typecheck` && `npm --prefix d:\CoTree\plugins\cotree.external-cli run build` — exit code `0`.
  - Artifact: `cotree.external-cli-0.8.0.zip` (`sha256=46733e2b763c4936fb070ed4e5e6fcb97bf592667cf6edcc3f634161ffbafcea`, `digest=95c491677bd3a8b7228d7bc9b960c865ebaf653e2cf5eb82f3e4f64f823972ce`, `tools=14`, `skills=1`, `agents=11`, `views=2`, manifest validation OK).
- **M7 (2026-11-25 22:52–23:02)**:
  - `pnpm lint` (includes `pnpm audit:no-unattributed-unknown` + `eslint packages apps/cli`) — exit code `0` (`3354 source files checked; no unattributed literals`).
  - `pnpm exec tsc -p tsconfig.json --noEmit` — 0 TypeScript errors across all modified/added packages, plugin files, and plugin test files (pre-existing unrelated dirty file `tests/runtime/child-model-routing-and-browser-space.test.ts` preserved untouched per repo rule).
  - `pnpm exec vitest run tests/plugin-runtime/plugin-external-cli-host-enhancements.test.ts tests/plugin-runtime/plugin-service-runtime.test.ts tests/plugin-runtime/plugin-service-tool.test.ts tests/plugin-runtime/plugin-process.test.ts tests/plugin-runtime/plugin-settings.test.ts tests/plugin-runtime/plugin-manifest.test.ts` — exit code `0` (**6/6 files, 109/109 tests passed**).
  - `pnpm exec vitest run tests/plugin-runtime/external-cli-plugin.test.ts` — exit code `0` (**7/7 tests passed**).
  - `pnpm exec vitest run tests/plugin-runtime/external-cli-event-wake.test.ts` — exit code `0` (**3/3 tests passed**).
  - `pnpm exec vitest run tests/plugin-runtime/external-cli-v080-capabilities.test.ts` — exit code `0` (**3/3 tests passed**, 74.81s): manifest v0.8.0 (14 tools, 11 agents, settings), all 7 new Agent tools + attachments + worktree vs main-workspace `undoTurn` guardrail + 6 `queue` actions + UI `view.*` RPCs, ACP command override allowlist/rejection, `midTurnSteer=false` degradation, Antigravity `structuredApprovals`/`softInterrupt` degradation, host-verified `allowedWorkspaceRoots` + `extraEnvAllowlist` without secret leak, and `inspect` diagnostics (`command`/`resolvedPath`/`version`/`authStatus`/`unsupported`/`resourceQuotas`).
  - Real CLI smoke matrix (`real-cli-smoke-matrix.mts` & `real-codex-claude-diag.mts`, exit code `0`, isolated temp workspace & `COTREE_HOME`):
    - **Codex (`codex-cli 0.170.0`, `codex.exe`)**: `authStatus.status=ok` (`Logged in using ChatGPT`); `start` -> `wait(subscribe)` (`wakeReceived=true`, `wakeReason=turn_completed`) -> `steer` -> `fork` (`codex.native_fork`) -> `compact` (`codex.compact`) -> `listNativeSessions` (5 threads) -> `undoTurn` main-workspace guardrail (`blocked=true`) -> `handoff` to Claude (`ok=true`) -> `stop(kill)` (`stopped=true`). Local machine upstream token returned refresh revoked (`Your access token could not be refreshed... Please log out and sign in again`), cleanly surfaced in `turns` + `lastError` + push wake.
    - **Claude (`2.1.202 (Claude Code)`, `claude.cmd`)**: `authStatus.status=ok`; `start` -> `wait(subscribe)` (`subOk=true`) -> `stop(kill)` (`ok=true`). Upstream Anthropic first-party OAuth request hung >30s even when running bare `claude -p "Reply OK"` directly from shell (local network/endpoint reachability issue, not plugin transport).
    - **Antigravity (`agy.exe` `1.5.14`)**: `start` with `reasoningEffort="high"` returned explicit `unsupported=true`; `wait` received live upstream geo-eligibility error (`Eligibility check failed: Your current account is not eligible for Antigravity, because it is not currently available in your location`); `stop(mode="interrupt")` succeeded via `stdin_eof` (`stopped=true`); `stop(mode="kill")` succeeded.
    - **Uninstalled CLIs (`gemini`, `opencode`, `qwen`, `kiro`, `goose`, `acp`, `aider`, `cline`, `cursor-agent`, `copilot`, `amp`, `droid`)**: `inspect` accurately reported `available=false`, `authStatus.status=missing`, `errorCode=EXTERNAL_CLI_BINARY_MISSING`, and actionable remediation commands; real binaries marked `untested`, protocol & degradation verified via fake ACP agents.
  - UI regression: all 22 `view.*` RPC handlers verified intact (`view.inspect`, `view.models`, `view.setPreference`, `view.list`, `view.read`, `view.focus`, `view.transcript`, `view.transcriptPage`, `view.blockDetail`, `view.start`, `view.steer`, `view.respond`, `view.stop`, `view.queue`, `view.setModes`, `view.compact`, `view.fork`, `view.handoff`, `view.undoTurn`, `view.listNativeSessions`, `view.importNative`, `view.listFiles`); `ui/app.js` & `ui/transcript.js` bundled cleanly in `0.8.0`.
