import path from "node:path";
import { randomUUID } from "node:crypto";
import { defineService, type PluginServiceContext } from "@cotree/plugin-sdk/service";
import type { PluginJsonValue, PluginUiJsonObject } from "@cotree/plugin-sdk";
import {
  ALL_CLI_ENGINES,
  DEFAULT_EXTERNAL_CLI_SETTINGS,
  ENGINE_CAPABILITIES,
  OPTIONAL_CUSTOM_CLI_EXECUTABLES,
  PLUGIN_ID,
  PLUGIN_RESOURCE_QUOTAS,
  PLUGIN_SLASH_COMMANDS,
  PLUGIN_VERSION,
  TRANSIENT_READ_RETRY_BACKOFF_MS,
  estimateModelContextWindow,
  evaluateUnsupportedRequestOptions,
  isAcpEngine,
  isCliEngine,
  isCliInteractionMode,
  isCliPermissionMode,
  isCliReasoningEffort,
  isCliServiceTier,
  isDiagnosticTracingStderrLine,
  isFatalProcessReadError,
  isTerminalCliStatus,
  listUnsupportedCapabilities,
  mapApprovalPolicyToPermissionMode,
  normalizeRelativeCwd,
  parseExternalCliSettings,
  resolveAcpCommandExecutable,
  sanitizeExtraArgs,
  sanitizeProcessEnvOverrides,
  stripAnsi,
  truncateText,
  waitForRetryBackoff,
  type CliApprovalDecision,
  type CliAttachmentRef,
  type CliAuthPreflight,
  type CliContextUsage,
  type CliEngine,
  type CliEngineModelCatalog,
  type CliEnginePreference,
  type ExternalCliRuntimeSettings,
  type CliInteractionMode,
  type CliModelOption,
  type CliNativeSessionEntry,
  type CliPendingIntervention,
  type CliPermissionMode,
  type CliPersistedSessionRecord,
  type CliQueuedMessage,
  type CliRailSessionSummary,
  type CliRunMode,
  type CliServiceTier,
  type CliSessionStatus,
  type CliSessionSummary,
  type CliSessionTranscript,
  type CliSlashCommandInfo,
  type CliSteerStrategy,
  type CliStopMode,
  type CliTimelineEvent,
  type CliTimelineEventType,
  type CliTranscriptBlock,
  type CliTranscriptBlockKind,
  type CliTranscriptDelta,
  type CliTranscriptTurn
} from "./shared.js";
import {
  buildAntigravitySpawnArgs,
  buildAntigravityUserFrame,
  buildClaudeSpawnArgs,
  buildCodexInterventionResponse,
  buildCodexRpcNotification,
  buildCodexRpcRequest,
  buildCodexSpawnArgs,
  buildGeminiSpawnArgs,
  buildOpencodeRunSpawnArgs,
  buildQwenSpawnArgs,
  getCuratedClaudeModelOptions,
  getCuratedGeminiModelOptions,
  getCuratedQwenModelOptions,
  parseAntigravityModelsOutput,
  parseAntigravityStdoutLine,
  parseClaudeStdoutLine,
  parseCodexModelListResult,
  parseCodexStdoutLine,
  parseGeminiStdoutLine,
  parseOpencodeModelsOutput,
  parseOpencodeRunStdoutLine,
  parseQwenStdoutLine,
  type ParsedProtocolAction
} from "./protocols.js";
import { CodexSharedHost, CodexSharedHostPool } from "./adapters/codex-host.js";
import { ClaudeSdkSession } from "./adapters/claude-sdk.js";
import { UniversalAcpSession } from "./adapters/acp.js";
import { buildPortableHandoff } from "./handoff.js";
import {
  captureHiddenGitCheckpoint,
  diffHiddenGitCheckpoints,
  listWorkspaceGitFiles,
  restoreHiddenGitCheckpoint
} from "./git-checkpoints.js";

const CHECKPOINT_INDEX_KEY = "index";
const CHECKPOINT_PREFS_KEY = "prefs";
const CHECKPOINT_PROVIDER_CACHE_KEY = "provider-cache";
const CHECKPOINT_SESSION_PREFIX = "session:";
const MODEL_CATALOG_TTL_MS = 5 * 60_000;
const MAX_TIMELINE_EVENTS = 500;
const MAX_RECENT_DELTAS = 500;
const MAX_RAW_TAIL_CHARS = 24_576;
const MAX_ASSISTANT_CHARS = 64_000;
const MAX_BLOCK_TEXT_CHARS = 24_000;
const MAX_FULL_BLOCK_TEXT_CHARS = 262_144;
const WIRE_BLOCK_OMIT_THRESHOLD = 8_192;
const MAX_PERSISTED_SESSIONS = 48;
const MAX_PERSISTED_TURNS = 64;
const MAX_PERSISTED_BLOCKS_PER_TURN = 60;
const MAX_PERSISTED_BLOCK_CHARS = 12_000;
const DEFAULT_TRANSCRIPT_TURN_WINDOW = 24;
const ROLLING_LOG_WINDOW_BYTES = 16 * 1024 * 1024;
const READ_PAGE_MAX_BYTES = 1_048_576;
const NO_COLOR_ENV: Record<string, string> = { NO_COLOR: "1", CLICOLOR: "0", MISE_OFFLINE: "1" };
const SSE_COALESCE_MS = 45;
const PERSIST_DEBOUNCE_MS = 400;

type SessionRecord = {
  cliSessionId: string;
  engine: CliEngine;
  mode: CliRunMode;
  status: CliSessionStatus;
  label?: string;
  processId: string;
  executionWorkspace: string;
  cwdRelative: string;
  isWorktree: boolean;
  ownerSessionId?: string;
  ownerRunId?: string;
  ownerAgentId?: string;
  externalSessionId?: string;
  activeTurnId?: string;
  model?: string;
  reasoningEffort?: string;
  approvalPolicy?: string;
  permissionMode: CliPermissionMode;
  interactionMode: CliInteractionMode;
  serviceTier: CliServiceTier;
  sandbox?: string;
  customExecutableId?: string;
  customEnv?: Record<string, string>;
  extraArgs: string[];
  createdAt: string;
  updatedAt: string;
  endedAt?: string;
  exitCode?: number;
  signal?: string;
  executionSettled: boolean;
  truncatedLog: boolean;
  nextSeq: number;
  completedTurns: number;
  events: CliTimelineEvent[];
  turns: CliTranscriptTurn[];
  blockIndex: Map<string, CliTranscriptBlock>;
  blockFullText: Map<string, string>;
  pendingInterventions: CliPendingIntervention[];
  queue: CliQueuedMessage[];
  queuePaused: boolean;
  currentTurnAssistantText: string;
  lastAssistantText: string;
  lastActivitySummary: string;
  totalUsage?: Record<string, unknown>;
  contextUsage?: CliContextUsage;
  totalCostUsd?: number;
  lastError?: string;
  forkedFromSessionId?: string;
  handoffFromEngine?: CliEngine;
  pendingHandoffPrefix?: string;
  rawStdoutTail: string;
  rawStderrTail: string;
  stdoutLineBuffer: string;
  stderrLineBuffer: string;
  writeChain: Promise<void>;
  opChain: Promise<void>;
  waiters: Set<() => void>;
  readerActive: boolean;
  emitTimer?: ReturnType<typeof setTimeout>;
  pendingEmitEvent?: CliTimelineEvent;
  pendingDeltas: CliTranscriptDelta[];
  recentDeltas: Array<{ seq: number; delta: CliTranscriptDelta }>;
  lastRailFingerprint: string;
  gitEnabled?: boolean;
  codexHost?: CodexSharedHost;
  claudeSession?: ClaudeSdkSession;
  acpSession?: UniversalAcpSession;
  drainingQueue: boolean;
};

type CallerMetadata = {
  runId?: string;
  agentId?: string;
  workspace: string;
  sessionId?: string;
  toolCallId?: string;
};

type WaitUntilMode = "turn_or_intervention" | "change" | "settled";

type WaitSubscription = {
  subscriptionId: string;
  cliSessionId: string;
  until: WaitUntilMode;
  afterSeq: number;
  runId?: string;
  sessionId?: string;
  toolCallId?: string;
  eventLimit: number;
  createdAt: string;
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asBoundedInt(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function appendTail(current: string, chunk: string, limit = MAX_RAW_TAIL_CHARS): string {
  if (!chunk) return current;
  const combined = current + chunk;
  return combined.length <= limit ? combined : combined.slice(combined.length - limit);
}

function appendBounded(current: string, chunk: string, limit: number): string {
  if (!chunk) return current;
  const combined = current + chunk;
  return combined.length <= limit ? combined : combined.slice(combined.length - limit);
}

function sameWorkspace(left: string, right: string): boolean {
  const a = path.resolve(left);
  const b = path.resolve(right);
  return process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
}

function parseAttachments(raw: unknown): CliAttachmentRef[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: CliAttachmentRef[] = [];
  for (const item of raw.slice(0, 12)) {
    const rec = asObject(item);
    const attachmentId = asNonEmptyString(rec.attachmentId);
    const filePath = asNonEmptyString(rec.path);
    const fileName = asNonEmptyString(rec.fileName);
    const mimeType = asNonEmptyString(rec.mimeType) ?? "application/octet-stream";
    const bytes = asNumber(rec.bytes) ?? 0;
    if (attachmentId && filePath && fileName) {
      out.push({ attachmentId, path: filePath, fileName, mimeType, bytes });
    }
  }
  return out.length > 0 ? out : undefined;
}

function withSessionOperation<T>(session: SessionRecord, fn: () => Promise<T>): Promise<T> {
  const prev = session.opChain.catch(() => undefined);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  session.opChain = prev.then(() => gate);
  return prev.then(async () => {
    try {
      return await fn();
    } finally {
      release();
    }
  });
}

function formatCliOperationError(engine: CliEngine, rawMessage: string): string {
  const clean = stripAnsi(rawMessage).trim();
  if (/already has an active writer/i.test(clean)) {
    return `${ENGINE_CAPABILITIES[engine].displayName} 会话线程正被另一个进程占用（active writer 冲突），请先终止占用该线程的会话后重试。（${clean}）`;
  }
  const timeoutMatch = /^(?:Codex|ACP) RPC '([^']+)' timed out after (\d+)ms\.?$/i.exec(clean);
  if (timeoutMatch) {
    return `${ENGINE_CAPABILITIES[engine].displayName} RPC '${timeoutMatch[1]}' 响应超时（${timeoutMatch[2]}ms），请重试。`;
  }
  return clean || `${ENGINE_CAPABILITIES[engine].displayName} 操作失败。`;
}

function sanitizePersistedTurns(turns: CliTranscriptTurn[]): CliTranscriptTurn[] {
  return turns.map((turn) => ({
    ...turn,
    blocks: (Array.isArray(turn.blocks) ? turn.blocks : []).map((block) => {
      const cleanedText = stripAnsi(typeof block.text === "string" ? block.text : "");
      const cleanedTitle = stripAnsi(typeof block.title === "string" ? block.title : "");
      if (block.kind === "stderr") {
        const lines = cleanedText.split(/\r?\n/).filter((l) => l.trim().length > 0);
        const allDiag = lines.length > 0 && lines.every((l) => isDiagnosticTracingStderrLine(l));
        return {
          ...block,
          status: block.status === "streaming" ? "completed" : block.status,
          title: allDiag ? "运行诊断日志 (stderr)" : cleanedTitle || "标准错误输出 (stderr)",
          text: cleanedText,
          meta: {
            ...(block.meta ?? {}),
            diagnostic: block.meta?.diagnostic === false ? false : allDiag,
            lineCount: lines.length || (typeof block.meta?.lineCount === "number" ? block.meta.lineCount : 1)
          }
        };
      }
      return {
        ...block,
        title: cleanedTitle,
        text: cleanedText
      };
    })
  }));
}

function makeToolError(code: string, message: string, recoverable = true): PluginUiJsonObject {
  return {
    ok: false,
    error: {
      code,
      message,
      recoverable
    }
  };
}

function toStrictJsonValue(value: unknown): PluginJsonValue {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (Array.isArray(value)) {
    return value.map((item) => toStrictJsonValue(item));
  }
  if (value && typeof value === "object") {
    const out: Record<string, PluginJsonValue> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = toStrictJsonValue(v);
      }
    }
    return out;
  }
  return null;
}

// ============================================================================
// Service state
// ============================================================================

let lifecycleContext: PluginServiceContext | undefined;
const codexPool = new CodexSharedHostPool(() => lifecycleContext);
let focusedCliSessionId: string | undefined;
let lastExplicitFocusAt = 0;
const sessions = new Map<string, SessionRecord>();
const waitSubscriptions = new Map<string, WaitSubscription>();
const historyRecords = new Map<string, CliPersistedSessionRecord>();
const modelCatalogCache = new Map<CliEngine, { expiresAt: number; catalog: CliEngineModelCatalog }>();
const observedEngineModels = new Map<CliEngine, Set<string>>();
const providerSlashCommands = new Map<CliEngine, CliSlashCommandInfo[]>();
let enginePreferences: Partial<Record<CliEngine, CliEnginePreference>> = {};

let cachedEngineSnapshot: Record<string, Record<string, unknown>> = {};
let cachedEngineProbedAt = 0;
let cachedEngineHydratedFromDisk = false;
let inFlightEngineProbe: Promise<Record<string, unknown>> | undefined;

const checkpointRevisions = new Map<string, number>();
let persistChain: Promise<void> = Promise.resolve();
let persistTimer: ReturnType<typeof setTimeout> | undefined;
const dirtySessionIds = new Set<string>();
let dirtyIndex = false;
let dirtyPrefs = false;
let dirtyProviderCache = false;
const deletedSessionIds = new Set<string>();
let runtimeSettings: ExternalCliRuntimeSettings = {
  ...DEFAULT_EXTERNAL_CLI_SETTINGS,
  historyLimits: { ...DEFAULT_EXTERNAL_CLI_SETTINGS.historyLimits }
};

async function refreshRuntimeSettings(ctx?: PluginServiceContext): Promise<ExternalCliRuntimeSettings> {
  const reader = ctx?.settings ?? lifecycleContext?.settings;
  if (!reader) return runtimeSettings;
  try {
    const raw = await reader.read();
    runtimeSettings = parseExternalCliSettings(raw);
  } catch {
    // Keep current validated defaults/settings if settings read fails.
  }
  return runtimeSettings;
}

function recordObservedModel(engine: CliEngine, model?: string): void {
  if (!model) return;
  let set = observedEngineModels.get(engine);
  if (!set) {
    set = new Set();
    observedEngineModels.set(engine, set);
  }
  if (!set.has(model)) {
    set.add(model);
    // Update cached catalog IN-PLACE instead of deleting cache and triggering redundant probes.
    const cached = modelCatalogCache.get(engine);
    if (cached && !cached.catalog.models.some((m) => m.id === model)) {
      const extra: CliModelOption = {
        id: model,
        displayName: model,
        group: "本机已观测模型",
        ...(engine === "claude" ? { supportedReasoningEfforts: ["low", "medium", "high", "xhigh", "max"] } : {})
      };
      cached.catalog = {
        ...cached.catalog,
        models: [extra, ...cached.catalog.models]
      };
      const snap = cachedEngineSnapshot[engine];
      if (snap) {
        snap.modelCatalog = cached.catalog;
      }
    }
  }
}

function computeContextUsage(
  session: SessionRecord,
  usage: Record<string, unknown>,
  explicitWindow?: number,
  costUsd?: number
): CliContextUsage {
  const inputTokens =
    asNumber(usage.input_tokens) ??
    asNumber(usage.inputTokens) ??
    asNumber(usage.prompt_tokens) ??
    asNumber(asObject(usage.last).inputTokens);
  const outputTokens =
    asNumber(usage.output_tokens) ??
    asNumber(usage.outputTokens) ??
    asNumber(usage.completion_tokens) ??
    asNumber(asObject(usage.last).outputTokens);
  const cacheReadTokens =
    asNumber(usage.cache_read_input_tokens) ??
    asNumber(usage.cached_input_tokens) ??
    asNumber(usage.cacheReadTokens) ??
    asNumber(asObject(usage.last).cachedInputTokens);
  const reportedTotal =
    asNumber(usage.total_tokens) ??
    asNumber(usage.totalTokens) ??
    asNumber(asObject(usage.last).totalTokens);
  const totalTokens =
    reportedTotal ??
    ((inputTokens ?? 0) + (outputTokens ?? 0) + (cacheReadTokens ?? 0) || undefined);
  const estimated = estimateModelContextWindow(session.engine, session.model);
  const contextWindow = explicitWindow ?? session.contextUsage?.contextWindow ?? estimated.contextWindow;
  return {
    ...(inputTokens !== undefined ? { inputTokens } : {}),
    ...(outputTokens !== undefined ? { outputTokens } : {}),
    ...(cacheReadTokens !== undefined ? { cacheReadTokens } : {}),
    ...(totalTokens !== undefined ? { totalTokens } : {}),
    contextWindow,
    ...(estimated.autoCompactAt ? { autoCompactAt: estimated.autoCompactAt } : {}),
    ...(costUsd !== undefined
      ? { costUsd }
      : session.totalCostUsd !== undefined
        ? { costUsd: session.totalCostUsd }
        : {})
  };
}

function toSummary(session: SessionRecord): CliSessionSummary {
  return {
    cliSessionId: session.cliSessionId,
    engine: session.engine,
    mode: session.mode,
    origin: "live",
    status: session.status,
    ...(session.label ? { label: session.label } : {}),
    processId: session.processId,
    executionWorkspace: session.executionWorkspace,
    cwdRelative: session.cwdRelative,
    isWorktree: session.isWorktree,
    ...(session.ownerSessionId ? { ownerSessionId: session.ownerSessionId } : {}),
    ...(session.ownerRunId ? { ownerRunId: session.ownerRunId } : {}),
    ...(session.ownerAgentId ? { ownerAgentId: session.ownerAgentId } : {}),
    ...(session.externalSessionId ? { externalSessionId: session.externalSessionId } : {}),
    ...(session.activeTurnId ? { activeTurnId: session.activeTurnId } : {}),
    ...(session.model ? { model: session.model } : {}),
    ...(session.reasoningEffort ? { reasoningEffort: session.reasoningEffort } : {}),
    permissionMode: session.permissionMode,
    interactionMode: session.interactionMode,
    serviceTier: session.serviceTier,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    ...(session.endedAt ? { endedAt: session.endedAt } : {}),
    ...(session.exitCode !== undefined ? { exitCode: session.exitCode } : {}),
    ...(session.signal ? { signal: session.signal } : {}),
    executionSettled: session.executionSettled,
    truncatedLog: session.truncatedLog,
    latestSeq: session.nextSeq - 1,
    turnCount: session.turns.length,
    queuedCount: session.queue.length,
    queuePaused: session.queuePaused,
    pendingInterventions: session.pendingInterventions.map((item) => ({ ...item })),
    lastAssistantText: session.lastAssistantText || session.currentTurnAssistantText,
    lastActivitySummary: session.lastActivitySummary,
    ...(session.totalUsage ? { totalUsage: session.totalUsage } : {}),
    ...(session.contextUsage ? { contextUsage: session.contextUsage } : {}),
    ...(session.totalCostUsd !== undefined ? { totalCostUsd: session.totalCostUsd } : {}),
    ...(session.lastError ? { lastError: session.lastError } : {}),
    ...(session.forkedFromSessionId ? { forkedFromSessionId: session.forkedFromSessionId } : {}),
    ...(session.handoffFromEngine ? { handoffFromEngine: session.handoffFromEngine } : {})
  };
}

function toRailSummary(session: SessionRecord): CliRailSessionSummary {
  const full = toSummary(session);
  const { lastAssistantText, ...rest } = full;
  return {
    ...rest,
    lastAssistantPreview: truncateText(lastAssistantText.replace(/\s+/g, " ").trim(), 240)
  };
}

function computeRailFingerprint(rail: CliRailSessionSummary): string {
  return JSON.stringify([
    rail.status,
    rail.label,
    rail.turnCount,
    rail.queuedCount,
    rail.queuePaused,
    rail.pendingInterventions.length,
    rail.model,
    rail.reasoningEffort,
    rail.permissionMode,
    rail.interactionMode,
    rail.serviceTier,
    rail.externalSessionId,
    rail.lastAssistantPreview,
    rail.lastActivitySummary,
    rail.lastError,
    rail.contextUsage?.totalTokens
  ]);
}

function historyToSummary(record: CliPersistedSessionRecord): CliSessionSummary {
  const status: CliSessionStatus = isTerminalCliStatus(record.status) ? record.status : "exited";
  return {
    cliSessionId: record.cliSessionId,
    engine: record.engine,
    mode: record.mode,
    origin: "history",
    status,
    ...(record.label ? { label: record.label } : {}),
    processId: "settled-history",
    executionWorkspace: record.executionWorkspace,
    cwdRelative: record.cwdRelative,
    isWorktree: record.isWorktree,
    ...(record.ownerSessionId ? { ownerSessionId: record.ownerSessionId } : {}),
    ...(record.ownerRunId ? { ownerRunId: record.ownerRunId } : {}),
    ...(record.ownerAgentId ? { ownerAgentId: record.ownerAgentId } : {}),
    ...(record.externalSessionId ? { externalSessionId: record.externalSessionId } : {}),
    ...(record.model ? { model: record.model } : {}),
    ...(record.reasoningEffort ? { reasoningEffort: record.reasoningEffort } : {}),
    permissionMode: record.permissionMode ?? mapApprovalPolicyToPermissionMode(record.approvalPolicy),
    interactionMode: record.interactionMode ?? "default",
    serviceTier: record.serviceTier ?? "default",
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    ...(record.endedAt ? { endedAt: record.endedAt } : {}),
    ...(record.exitCode !== undefined ? { exitCode: record.exitCode } : {}),
    ...(record.signal ? { signal: record.signal } : {}),
    executionSettled: true,
    truncatedLog: false,
    latestSeq: 0,
    turnCount: record.turns.length,
    queuedCount: 0,
    queuePaused: false,
    pendingInterventions: [],
    lastAssistantText: record.lastAssistantText,
    lastActivitySummary: record.lastActivitySummary || "历史托管会话",
    ...(record.totalUsage ? { totalUsage: record.totalUsage } : {}),
    ...(record.contextUsage ? { contextUsage: record.contextUsage } : {}),
    ...(record.totalCostUsd !== undefined ? { totalCostUsd: record.totalCostUsd } : {}),
    ...(record.lastError ? { lastError: record.lastError } : {}),
    ...(record.forkedFromSessionId ? { forkedFromSessionId: record.forkedFromSessionId } : {}),
    ...(record.handoffFromEngine ? { handoffFromEngine: record.handoffFromEngine } : {})
  };
}

function projectBlockForWire(session: SessionRecord | undefined, block: CliTranscriptBlock): CliTranscriptBlock {
  const fullLen = session?.blockFullText.get(block.id)?.length ?? block.text.length;
  const heavyKind = block.kind === "command" || block.kind === "file_change" || block.kind === "tool";
  if (heavyKind && block.text.length > WIRE_BLOCK_OMIT_THRESHOLD) {
    return {
      ...block,
      text: `${block.text.slice(0, WIRE_BLOCK_OMIT_THRESHOLD)}\n...[已省略剩余输出，点击展开完整内容]`,
      outputOmitted: true,
      totalTextChars: fullLen
    };
  }
  if (fullLen > block.text.length) {
    return {
      ...block,
      outputOmitted: true,
      totalTextChars: fullLen
    };
  }
  return block;
}

function projectTurnForWire(session: SessionRecord | undefined, turn: CliTranscriptTurn): CliTranscriptTurn {
  return {
    ...turn,
    blocks: turn.blocks.map((block) => projectBlockForWire(session, block))
  };
}

function compactTurnsForCheckpoint(turns: CliTranscriptTurn[]): CliTranscriptTurn[] {
  const maxTurns = runtimeSettings.historyLimits.maxTurnsPerSession;
  return turns.slice(-maxTurns).map((turn) => ({
    ...turn,
    prompt: truncateText(turn.prompt, 4_000),
    blocks: turn.blocks.slice(-MAX_PERSISTED_BLOCKS_PER_TURN).map((block) => ({
      ...block,
      title: truncateText(block.title, 280),
      text: truncateText(block.text, MAX_PERSISTED_BLOCK_CHARS)
    }))
  }));
}

function toPersisted(session: SessionRecord): CliPersistedSessionRecord {
  return {
    cliSessionId: session.cliSessionId,
    engine: session.engine,
    mode: session.mode,
    status: session.status,
    ...(session.label ? { label: session.label } : {}),
    executionWorkspace: session.executionWorkspace,
    cwdRelative: session.cwdRelative,
    isWorktree: session.isWorktree,
    ...(session.ownerSessionId ? { ownerSessionId: session.ownerSessionId } : {}),
    ...(session.ownerRunId ? { ownerRunId: session.ownerRunId } : {}),
    ...(session.ownerAgentId ? { ownerAgentId: session.ownerAgentId } : {}),
    ...(session.externalSessionId ? { externalSessionId: session.externalSessionId } : {}),
    ...(session.model ? { model: session.model } : {}),
    ...(session.reasoningEffort ? { reasoningEffort: session.reasoningEffort } : {}),
    ...(session.approvalPolicy ? { approvalPolicy: session.approvalPolicy } : {}),
    permissionMode: session.permissionMode,
    interactionMode: session.interactionMode,
    serviceTier: session.serviceTier,
    ...(session.sandbox ? { sandbox: session.sandbox } : {}),
    ...(session.extraArgs.length ? { extraArgs: [...session.extraArgs] } : {}),
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    ...(session.endedAt ? { endedAt: session.endedAt } : {}),
    ...(session.exitCode !== undefined ? { exitCode: session.exitCode } : {}),
    ...(session.signal ? { signal: session.signal } : {}),
    lastAssistantText: truncateText(session.lastAssistantText || session.currentTurnAssistantText, 4000),
    lastActivitySummary: truncateText(session.lastActivitySummary, 300),
    ...(session.lastError ? { lastError: truncateText(session.lastError, 1000) } : {}),
    ...(session.totalUsage ? { totalUsage: session.totalUsage } : {}),
    ...(session.contextUsage ? { contextUsage: session.contextUsage } : {}),
    ...(session.totalCostUsd !== undefined ? { totalCostUsd: session.totalCostUsd } : {}),
    ...(session.forkedFromSessionId ? { forkedFromSessionId: session.forkedFromSessionId } : {}),
    ...(session.handoffFromEngine ? { handoffFromEngine: session.handoffFromEngine } : {}),
    turns: compactTurnsForCheckpoint(session.turns)
  };
}

// ============================================================================
// Multi-key Checkpoints Persistence (H2)
// ============================================================================

async function writeCheckpointKey(ctx: PluginServiceContext, key: string, value: unknown): Promise<void> {
  if (!ctx.checkpoints) return;
  const strict = toStrictJsonValue(value);
  const currentRev = checkpointRevisions.get(key) ?? 0;
  try {
    const nextRev = await ctx.checkpoints.set(strict, currentRev, key);
    checkpointRevisions.set(key, nextRev);
  } catch {
    try {
      const latest = await ctx.checkpoints.get(key);
      const rev = latest ? latest.revision : 0;
      const nextRev = await ctx.checkpoints.set(strict, rev, key);
      checkpointRevisions.set(key, nextRev);
    } catch {
      // Best-effort persistence on quota/shutdown edge cases.
    }
  }
}

function flushDirtyPersistence(ctx: PluginServiceContext, forceAllLive = false): Promise<void> {
  if (!ctx.checkpoints) return Promise.resolve();
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = undefined;
  }
  if (forceAllLive) {
    for (const session of sessions.values()) {
      dirtySessionIds.add(session.cliSessionId);
      dirtyIndex = true;
    }
  }
  const toSaveSessions = [...dirtySessionIds];
  dirtySessionIds.clear();
  const saveIndex = dirtyIndex || toSaveSessions.length > 0;
  const savePrefs = dirtyPrefs;
  const saveProviderCache = dirtyProviderCache;
  dirtyIndex = false;
  dirtyPrefs = false;
  dirtyProviderCache = false;

  for (const id of toSaveSessions) {
    const live = sessions.get(id);
    if (live) {
      historyRecords.set(id, toPersisted(live));
    }
  }

  const orderedIds = [...historyRecords.values()]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, runtimeSettings.historyLimits.maxSessions)
    .map((item) => item.cliSessionId);

  const allowedSet = new Set(orderedIds);
  const evictedIds: string[] = [];
  for (const existingId of [...historyRecords.keys()]) {
    if (!allowedSet.has(existingId) && !sessions.has(existingId)) {
      historyRecords.delete(existingId);
      evictedIds.push(existingId);
    }
  }

  persistChain = persistChain
    .catch(() => undefined)
    .then(async () => {
      for (const id of toSaveSessions) {
        const rec = historyRecords.get(id);
        if (rec && allowedSet.has(id)) {
          await writeCheckpointKey(ctx, `${CHECKPOINT_SESSION_PREFIX}${id}`, rec);
        }
      }
      for (const evictedId of evictedIds) {
        const key = `${CHECKPOINT_SESSION_PREFIX}${evictedId}`;
        await ctx.checkpoints?.delete?.(key).catch(() => undefined);
        checkpointRevisions.delete(key);
      }
      if (saveIndex) {
        await writeCheckpointKey(ctx, CHECKPOINT_INDEX_KEY, { version: 3, sessionIds: orderedIds });
      }
      if (savePrefs) {
        await writeCheckpointKey(ctx, CHECKPOINT_PREFS_KEY, { enginePreferences });
      }
      if (saveProviderCache && Object.keys(cachedEngineSnapshot).length > 0) {
        await writeCheckpointKey(ctx, CHECKPOINT_PROVIDER_CACHE_KEY, {
          updatedAt: new Date().toISOString(),
          engines: cachedEngineSnapshot
        });
      }
    });
  return persistChain;
}

function schedulePersist(options: { sessionId?: string; prefs?: boolean; providerCache?: boolean; index?: boolean } = {}): void {
  if (options.sessionId && !deletedSessionIds.has(options.sessionId)) {
    dirtySessionIds.add(options.sessionId);
    dirtyIndex = true;
  }
  if (options.index) dirtyIndex = true;
  if (options.prefs) dirtyPrefs = true;
  if (options.providerCache) dirtyProviderCache = true;

  if (!lifecycleContext?.checkpoints || persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = undefined;
    const ctx = lifecycleContext;
    if (!ctx?.checkpoints || ctx.signal.aborted) return;
    void flushDirtyPersistence(ctx, false);
  }, PERSIST_DEBOUNCE_MS);
  persistTimer.unref?.();
}

function listAllSessionSummaries(): CliSessionSummary[] {
  const combined: CliSessionSummary[] = [];
  for (const session of sessions.values()) {
    combined.push(toSummary(session));
  }
  for (const record of historyRecords.values()) {
    if (!sessions.has(record.cliSessionId)) {
      combined.push(historyToSummary(record));
    }
  }
  return combined.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

// ============================================================================
// Split Wire Protocol: rail.updated + 45ms coalesced transcript.delta
// ============================================================================

function pushDelta(session: SessionRecord, delta: CliTranscriptDelta, immediate = false): void {
  const prev = session.pendingDeltas[session.pendingDeltas.length - 1];
  if (
    delta.kind === "block.append" &&
    prev &&
    prev.kind === "block.append" &&
    prev.turnIndex === delta.turnIndex &&
    prev.blockId === delta.blockId &&
    prev.delta.length + delta.delta.length <= WIRE_BLOCK_OMIT_THRESHOLD
  ) {
    prev.delta += delta.delta;
    prev.updatedAt = delta.updatedAt;
  } else {
    session.pendingDeltas.push(delta);
  }
  session.recentDeltas.push({ seq: session.nextSeq, delta });
  if (session.recentDeltas.length > MAX_RECENT_DELTAS) {
    session.recentDeltas.splice(0, session.recentDeltas.length - MAX_RECENT_DELTAS);
  }
  scheduleSessionEmit(session, undefined, immediate);
}

function flushSessionEmit(session: SessionRecord): void {
  if (session.emitTimer) {
    clearTimeout(session.emitTimer);
    session.emitTimer = undefined;
  }
  const event = session.pendingEmitEvent;
  session.pendingEmitEvent = undefined;
  const deltas = session.pendingDeltas.splice(0, session.pendingDeltas.length);
  const ctx = lifecycleContext;
  if (!ctx || ctx.signal.aborted || deletedSessionIds.has(session.cliSessionId) || !sessions.has(session.cliSessionId)) return;

  const railSummary = toRailSummary(session);
  const fp = computeRailFingerprint(railSummary);
  if (fp !== session.lastRailFingerprint) {
    session.lastRailFingerprint = fp;
    void ctx.events
      .emit("rail.updated", toStrictJsonValue({ summary: railSummary }))
      .catch(() => undefined);
  }

  if (deltas.length > 0 || event) {
    void ctx.events
      .emit(
        "transcript.delta",
        toStrictJsonValue({
          cliSessionId: session.cliSessionId,
          latestSeq: session.nextSeq - 1,
          deltas,
          ...(event ? { event } : {})
        })
      )
      .catch(() => undefined);
  }
}

function scheduleSessionEmit(session: SessionRecord, event?: CliTimelineEvent, immediate = false): void {
  if (event) session.pendingEmitEvent = event;
  if (immediate) {
    flushSessionEmit(session);
    return;
  }
  if (session.emitTimer) return;
  session.emitTimer = setTimeout(() => {
    flushSessionEmit(session);
  }, SSE_COALESCE_MS);
  session.emitTimer.unref?.();
}

function emitNotificationHint(
  session: SessionRecord,
  kind: "intervention" | "completed" | "failed",
  title: string,
  body: string
): void {
  const ctx = lifecycleContext;
  if (!ctx || ctx.signal.aborted || deletedSessionIds.has(session.cliSessionId) || !sessions.has(session.cliSessionId)) return;
  void ctx.events
    .emit(
      "notification.hint",
      toStrictJsonValue({
        cliSessionId: session.cliSessionId,
        engine: session.engine,
        label: session.label ?? session.cliSessionId,
        kind,
        title,
        body: truncateText(body, 220)
      })
    )
    .catch(() => undefined);
}

function normalizeSubscriptionReason(
  rawReason: string,
  session: SessionRecord
): "turn_completed" | "needs_intervention" | "settled" | "progress" {
  if (rawReason === "needs_intervention" || session.status === "needs_intervention" || session.pendingInterventions.length > 0) {
    return "needs_intervention";
  }
  if (session.executionSettled || isTerminalCliStatus(session.status) || isTerminalCliStatus(rawReason as CliSessionStatus)) {
    return "settled";
  }
  if (rawReason === "turn_completed" || (rawReason === "progress" && session.status === "idle" && session.completedTurns > 0)) {
    return "turn_completed";
  }
  return "progress";
}

function buildCompactWakeSummary(session: SessionRecord): Record<string, unknown> {
  const rail = toRailSummary(session);
  return {
    ...rail,
    status: session.status,
    executionSettled: session.executionSettled,
    latestSeq: Math.max(0, session.nextSeq - 1),
    ...(session.lastAssistantText ? { lastAssistantText: truncateText(session.lastAssistantText, 2_000) } : {}),
    ...(session.lastError ? { lastError: truncateText(session.lastError, 1_000) } : {}),
    ...(session.pendingInterventions.length > 0
      ? {
          pendingInterventions: session.pendingInterventions.slice(0, 8).map((item) => ({
            id: item.id,
            kind: item.kind,
            method: item.method,
            title: truncateText(item.title, 240)
          }))
        }
      : {})
  };
}

function buildBoundedSubscriptionEvents(
  session: SessionRecord,
  afterSeq: number,
  eventLimit: number
): Array<Record<string, unknown>> {
  const limit = Math.max(1, Math.min(50, eventLimit));
  return session.events
    .filter((item) => item.seq > afterSeq)
    .slice(-limit)
    .map((item) => ({
      seq: item.seq,
      at: item.at,
      type: item.type,
      summary: truncateText(item.summary, 400)
    }));
}

function purgeSubscriptionsForSession(cliSessionId: string): number {
  let removed = 0;
  for (const [id, sub] of waitSubscriptions) {
    if (sub.cliSessionId === cliSessionId) {
      waitSubscriptions.delete(id);
      removed += 1;
    }
  }
  return removed;
}

function purgeSubscriptionsForRun(runId: string): number {
  let removed = 0;
  for (const [id, sub] of waitSubscriptions) {
    if (sub.runId === runId) {
      waitSubscriptions.delete(id);
      removed += 1;
    }
  }
  return removed;
}

function dispatchWaitSubscriptions(session: SessionRecord): void {
  if (waitSubscriptions.size === 0) return;
  const ctx = lifecycleContext;
  for (const sub of [...waitSubscriptions.values()]) {
    if (sub.cliSessionId !== session.cliSessionId) continue;
    const rawReason = evaluateWaitCondition(session, sub.until, sub.afterSeq);
    if (!rawReason) continue;

    const reason = normalizeSubscriptionReason(rawReason, session);
    const seq = Math.max(0, session.nextSeq - 1);
    const events = buildBoundedSubscriptionEvents(session, sub.afterSeq, sub.eventLimit);
    const isTerminalDelivery = reason === "settled" || session.executionSettled || isTerminalCliStatus(session.status);

    // One-shot trigger & delete for turn_or_intervention / settled / terminal; repeatable cursor advance for change.
    if (sub.until !== "change" || isTerminalDelivery) {
      waitSubscriptions.delete(sub.subscriptionId);
    } else {
      sub.afterSeq = seq;
    }

    const notificationPayload = toStrictJsonValue({
      subscriptionId: sub.subscriptionId,
      cliSessionId: session.cliSessionId,
      reason,
      seq,
      summary: buildCompactWakeSummary(session),
      events
    });

    if (ctx) {
      void ctx.events.emit("cli.session.updated", notificationPayload).catch(() => undefined);
      if (sub.runId && ctx.sessionWake) {
        const wakeRunId = sub.runId;
        void ctx.sessionWake
          .wake({
            subscriptionId: sub.subscriptionId,
            runId: wakeRunId,
            ...(sub.sessionId ? { sessionId: sub.sessionId } : {}),
            ...(sub.toolCallId ? { toolCallId: sub.toolCallId } : {}),
            topic: "cli.session.updated",
            payload: notificationPayload
          })
          .then((result) => {
            if (
              result &&
              result.woken === false &&
              (result.reason === "run_cancelled" ||
                result.reason === "run_failed" ||
                result.reason === "session_closed" ||
                result.reason === "run_not_found")
            ) {
              purgeSubscriptionsForRun(wakeRunId);
            }
          })
          .catch((error) => {
            const code = error && typeof error === "object" ? (error as { code?: unknown }).code : undefined;
            if (code === "PLUGIN_SESSION_WAKE_DENIED") {
              purgeSubscriptionsForRun(wakeRunId);
            }
          });
      }
    }
  }
}

function notifyWaiters(session: SessionRecord): void {
  for (const wake of [...session.waiters]) {
    try {
      wake();
    } catch {
      // Waiter callbacks never throw across unrelated listeners.
    }
  }
  dispatchWaitSubscriptions(session);
}

function recordEvent(
  session: SessionRecord,
  type: CliTimelineEventType,
  summary: string,
  data?: Record<string, unknown>,
  options: { emitImmediate?: boolean; updateActivity?: boolean } = {}
): CliTimelineEvent {
  const now = new Date().toISOString();
  const event: CliTimelineEvent = {
    seq: session.nextSeq++,
    at: now,
    type,
    summary,
    ...(data ? { data } : {})
  };
  session.updatedAt = now;
  if (options.updateActivity !== false) {
    session.lastActivitySummary = truncateText(summary, 200);
  }
  session.events.push(event);
  if (session.events.length > MAX_TIMELINE_EVENTS) {
    session.events.splice(0, session.events.length - MAX_TIMELINE_EVENTS);
  }
  notifyWaiters(session);
  scheduleSessionEmit(session, event, options.emitImmediate ?? true);
  return event;
}

// ============================================================================
// Transcript IR mutation helpers
// ============================================================================

function ensureCurrentTurn(
  session: SessionRecord,
  fallbackTrigger: CliTranscriptTurn["trigger"] = "initial",
  prompt = ""
): CliTranscriptTurn {
  const existing = session.turns[session.turns.length - 1];
  if (existing) return existing;
  return startTranscriptTurn(session, fallbackTrigger, prompt);
}

function startTranscriptTurn(
  session: SessionRecord,
  trigger: CliTranscriptTurn["trigger"],
  prompt: string,
  options: { turnId?: string; clientMsgId?: string; attachments?: CliAttachmentRef[] } = {}
): CliTranscriptTurn {
  const now = new Date().toISOString();
  const turnIndex = session.turns.length + 1;
  const turn: CliTranscriptTurn = {
    turnIndex,
    ...(options.turnId ? { turnId: options.turnId } : {}),
    ...(options.clientMsgId ? { clientMsgId: options.clientMsgId } : {}),
    trigger,
    prompt,
    status: "running",
    startedAt: now,
    ...(options.attachments?.length ? { attachments: options.attachments } : {}),
    blocks: []
  };
  if (prompt) {
    const block: CliTranscriptBlock = {
      id: `blk_${turnIndex}_prompt_${randomUUID().slice(0, 6)}`,
      turnIndex,
      kind: trigger === "steer" ? "steer" : "user",
      status: "completed",
      title:
        trigger === "initial"
          ? "初始指令"
          : trigger === "resume"
            ? "恢复续聊指令"
            : trigger === "queued"
              ? "队列自动发送"
              : trigger === "handoff"
                ? "跨引擎交接指令"
                : "追加指令",
      text: prompt,
      ...(options.attachments?.length ? { meta: { attachments: options.attachments } } : {}),
      startedAt: now,
      updatedAt: now
    };
    turn.blocks.push(block);
  }
  session.turns.push(turn);
  pushDelta(
    session,
    {
      kind: "turn.upsert",
      turn: projectTurnForWire(session, turn),
      ...(options.clientMsgId ? { clientMsgId: options.clientMsgId } : {})
    },
    true
  );
  return turn;
}

function appendMidTurnSteerBlock(
  session: SessionRecord,
  message: string,
  deliveryMode: string,
  attachments?: CliAttachmentRef[]
): void {
  const turn = ensureCurrentTurn(session, "steer", "");
  const now = new Date().toISOString();
  const block: CliTranscriptBlock = {
    id: `blk_${turn.turnIndex}_steer_${randomUUID().slice(0, 6)}`,
    turnIndex: turn.turnIndex,
    kind: "steer",
    status: "completed",
    title: "运行中插话 (Steer)",
    text: message,
    meta: { deliveryMode, ...(attachments?.length ? { attachments } : {}) },
    startedAt: now,
    updatedAt: now
  };
  turn.blocks.push(block);
  pushDelta(session, { kind: "block.upsert", turnIndex: turn.turnIndex, block }, true);
}

function getOrCreateBlock(
  session: SessionRecord,
  blockKey: string,
  kind: CliTranscriptBlockKind,
  title: string,
  meta?: Record<string, unknown>
): { block: CliTranscriptBlock; created: boolean } {
  const turn = ensureCurrentTurn(session);
  const scopedKey = `t${turn.turnIndex}:${blockKey}`;
  const existing = session.blockIndex.get(scopedKey);
  if (existing) {
    if (meta) existing.meta = { ...(existing.meta ?? {}), ...meta };
    return { block: existing, created: false };
  }
  const now = new Date().toISOString();
  const block: CliTranscriptBlock = {
    id: `blk_${turn.turnIndex}_${randomUUID().slice(0, 8)}`,
    turnIndex: turn.turnIndex,
    kind,
    status: "streaming",
    title,
    text: "",
    ...(meta ? { meta } : {}),
    startedAt: now,
    updatedAt: now
  };
  turn.blocks.push(block);
  session.blockIndex.set(scopedKey, block);
  pushDelta(session, { kind: "block.upsert", turnIndex: turn.turnIndex, block }, false);
  return { block, created: true };
}

function appendBlockText(session: SessionRecord, block: CliTranscriptBlock, chunk: string, now: string): void {
  if (!chunk) return;
  const prevFull = session.blockFullText.get(block.id) ?? block.text;
  const nextFull = appendBounded(prevFull, chunk, MAX_FULL_BLOCK_TEXT_CHARS);
  session.blockFullText.set(block.id, nextFull);

  const prevLen = block.text.length;
  block.text = appendBounded(block.text, chunk, MAX_BLOCK_TEXT_CHARS);
  block.updatedAt = now;
  session.updatedAt = now;

  const heavyKind = block.kind === "command" || block.kind === "file_change" || block.kind === "tool";
  if (heavyKind && prevLen >= WIRE_BLOCK_OMIT_THRESHOLD) {
    // Wire output already hit omission threshold; update status/totalTextChars without streaming huge bytes.
    pushDelta(
      session,
      {
        kind: "block.upsert",
        turnIndex: block.turnIndex,
        block: projectBlockForWire(session, block)
      },
      false
    );
    return;
  }
  pushDelta(
    session,
    {
      kind: "block.append",
      turnIndex: block.turnIndex,
      blockId: block.id,
      delta: chunk,
      updatedAt: now
    },
    false
  );
}

function replaceBlockText(session: SessionRecord, block: CliTranscriptBlock, fullText: string, now: string): void {
  session.blockFullText.set(block.id, truncateText(fullText, MAX_FULL_BLOCK_TEXT_CHARS));
  block.text = truncateText(fullText, MAX_BLOCK_TEXT_CHARS);
  block.updatedAt = now;
  session.updatedAt = now;
  pushDelta(
    session,
    {
      kind: "block.upsert",
      turnIndex: block.turnIndex,
      block: projectBlockForWire(session, block)
    },
    false
  );
}

function mergeUsage(
  previous: Record<string, unknown> | undefined,
  next: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!next) return previous;
  if (!previous) return { ...next };
  const merged: Record<string, unknown> = { ...previous };
  for (const [k, v] of Object.entries(next)) {
    if (typeof v === "number" && Number.isFinite(v)) {
      const prevNum = typeof merged[k] === "number" ? (merged[k] as number) : 0;
      merged[k] = Math.max(prevNum, v);
    } else if (v !== undefined) {
      merged[k] = v;
    }
  }
  return merged;
}

// ============================================================================
// Hidden Git Turn Checkpoints (v0.7)
// ============================================================================

async function captureTurnBeforeCheckpoint(
  session: SessionRecord,
  turn: CliTranscriptTurn,
  callContext: PluginServiceContext
): Promise<void> {
  if (session.gitEnabled === false) return;
  try {
    const resolvedCwd = path.resolve(session.executionWorkspace, session.cwdRelative);
    const beforeRef = await captureHiddenGitCheckpoint(
      callContext.process,
      resolvedCwd,
      `${session.cliSessionId}-t${turn.turnIndex}-before`
    );
    if (!beforeRef) {
      session.gitEnabled = false;
      return;
    }
    session.gitEnabled = true;
    turn.checkpoint = {
      turnIndex: turn.turnIndex,
      beforeRef,
      canUndoFiles: session.isWorktree
    };
  } catch {
    session.gitEnabled = false;
  }
}

function finalizeTurnCheckpointAsync(session: SessionRecord, turn: CliTranscriptTurn): void {
  const ctx = lifecycleContext;
  if (!ctx || ctx.signal.aborted || !session.gitEnabled || !turn.checkpoint?.beforeRef) return;
  const beforeRef = turn.checkpoint.beforeRef;
  const resolvedCwd = path.resolve(session.executionWorkspace, session.cwdRelative);
  void (async () => {
    try {
      const afterRef = await captureHiddenGitCheckpoint(
        ctx.process,
        resolvedCwd,
        `${session.cliSessionId}-t${turn.turnIndex}-after`
      );
      if (!afterRef) return;
      const diff = await diffHiddenGitCheckpoints(ctx.process, resolvedCwd, beforeRef, afterRef);
      turn.checkpoint = {
        turnIndex: turn.turnIndex,
        beforeRef,
        afterRef,
        changedFiles: diff.changedFiles,
        canUndoFiles: session.isWorktree
      };
      pushDelta(
        session,
        {
          kind: "checkpoint.updated",
          turnIndex: turn.turnIndex,
          checkpoint: turn.checkpoint
        },
        true
      );
      schedulePersist({ sessionId: session.cliSessionId });
    } catch {
      // Best-effort post-turn diff computation.
    }
  })();
}

// ============================================================================
// Direct stdin writer (for Antigravity / legacy oneshot streams)
// ============================================================================

function writeSessionStdin(
  session: SessionRecord,
  processClient: PluginServiceContext["process"],
  data: string
): Promise<void> {
  const run = session.writeChain
    .catch(() => undefined)
    .then(async () => {
      await processClient.write(session.processId, data);
    });
  session.writeChain = run;
  return run;
}

// ============================================================================
// Protocol Action Reducer & Queue Drain
// ============================================================================

function scheduleQueueDrain(session: SessionRecord): void {
  if (session.drainingQueue || session.queuePaused || session.queue.length === 0) return;
  if (session.pendingInterventions.length > 0 || isTerminalCliStatus(session.status)) return;
  const ctx = lifecycleContext;
  if (!ctx || ctx.signal.aborted || deletedSessionIds.has(session.cliSessionId) || !sessions.has(session.cliSessionId)) return;

  session.drainingQueue = true;
  const timer = setTimeout(() => {
    void (async () => {
      try {
        if (
          session.queuePaused ||
          session.queue.length === 0 ||
          session.status !== "idle" ||
          session.pendingInterventions.length > 0
        ) {
          return;
        }
        const nextItem = session.queue.shift();
        if (!nextItem) return;
        pushDelta(
          session,
          { kind: "queue.set", queue: [...session.queue], paused: session.queuePaused },
          true
        );
        await handleSteer(
          {
            cliSessionId: session.cliSessionId,
            message: nextItem.message,
            strategy: "next_turn",
            ...(nextItem.model ? { model: nextItem.model } : {}),
            ...(nextItem.reasoningEffort ? { reasoningEffort: nextItem.reasoningEffort } : {}),
            ...(nextItem.permissionMode ? { permissionMode: nextItem.permissionMode } : {}),
            ...(nextItem.interactionMode ? { interactionMode: nextItem.interactionMode } : {}),
            ...(nextItem.serviceTier ? { serviceTier: nextItem.serviceTier } : {}),
            ...(nextItem.attachments ? { attachments: nextItem.attachments } : {}),
            _fromQueue: true
          },
          ctx
        );
      } catch (err) {
        session.queuePaused = true;
        session.lastError = formatCliOperationError(
          session.engine,
          err instanceof Error ? err.message : String(err)
        );
        pushDelta(
          session,
          { kind: "queue.set", queue: [...session.queue], paused: true },
          true
        );
      } finally {
        session.drainingQueue = false;
      }
    })();
  }, 15);
  timer.unref?.();
}

function applyParsedAction(session: SessionRecord, action: ParsedProtocolAction): void {
  const now = new Date().toISOString();
  switch (action.kind) {
    case "rpc_response":
    case "thread_closed":
      return;

    case "session_id": {
      const changed = session.externalSessionId !== action.externalSessionId;
      session.externalSessionId = action.externalSessionId;
      if (action.model) {
        session.model = action.model;
        recordObservedModel(session.engine, action.model);
      }
      if (changed) {
        schedulePersist({ sessionId: session.cliSessionId });
        if (action.summary) {
          recordEvent(session, "protocol.notice", action.summary, {
            externalSessionId: action.externalSessionId,
            ...(action.model ? { model: action.model } : {})
          });
        }
      }
      return;
    }

    case "turn_started": {
      session.lastError = undefined;
      if (action.turnId) {
        session.activeTurnId = action.turnId;
        const turn = session.turns[session.turns.length - 1];
        if (turn && !turn.turnId) turn.turnId = action.turnId;
      }
      session.currentTurnAssistantText = "";
      if (!isTerminalCliStatus(session.status) && session.pendingInterventions.length === 0) {
        session.status = "running";
      }
      pushDelta(session, { kind: "session.status", summary: toRailSummary(session) }, false);
      recordEvent(session, "turn.started", action.summary, {
        ...(action.turnId ? { turnId: action.turnId } : {})
      });
      return;
    }

    case "reasoning_delta": {
      const { block } = getOrCreateBlock(session, action.blockKey ?? "reasoning", "reasoning", "思考过程");
      appendBlockText(session, block, action.text, now);
      session.updatedAt = now;
      session.lastActivitySummary = "思考推理中…";
      notifyWaiters(session);
      return;
    }

    case "assistant_delta": {
      session.currentTurnAssistantText = appendBounded(
        session.currentTurnAssistantText,
        action.text,
        MAX_ASSISTANT_CHARS
      );
      session.lastAssistantText = session.currentTurnAssistantText;
      if (session.status === "starting" || session.status === "idle") {
        session.status = "running";
      }
      const { block } = getOrCreateBlock(
        session,
        action.blockKey ?? "assistant",
        "assistant",
        ENGINE_CAPABILITIES[session.engine].displayName
      );
      appendBlockText(session, block, action.text, now);
      const previous = session.events[session.events.length - 1];
      if (previous && previous.type === "assistant.delta" && previous.summary.length < 1024) {
        previous.summary += action.text;
        previous.at = now;
        session.updatedAt = now;
        session.lastActivitySummary = truncateText(
          session.currentTurnAssistantText.trim().split(/\r?\n/).pop() || "正在回复…",
          160
        );
        notifyWaiters(session);
        scheduleSessionEmit(session, previous, false);
      } else {
        recordEvent(
          session,
          "assistant.delta",
          truncateText(action.text, 1024),
          { ...(action.turnId ? { turnId: action.turnId } : {}) },
          { emitImmediate: false }
        );
      }
      return;
    }

    case "assistant_message": {
      session.currentTurnAssistantText = truncateText(action.text, MAX_ASSISTANT_CHARS);
      session.lastAssistantText = session.currentTurnAssistantText;
      const turn = ensureCurrentTurn(session);
      if (action.providerMessageId) turn.providerMessageId = action.providerMessageId;
      const { block } = getOrCreateBlock(
        session,
        action.blockKey ?? "assistant",
        "assistant",
        ENGINE_CAPABILITIES[session.engine].displayName
      );
      block.status = "completed";
      replaceBlockText(session, block, action.text, now);
      recordEvent(session, "assistant.message", truncateText(action.text, 2000), {
        ...(action.turnId ? { turnId: action.turnId } : {})
      });
      return;
    }

    case "plan_delta": {
      const { block } = getOrCreateBlock(
        session,
        action.blockKey ?? "plan",
        "plan",
        action.title ?? "实施方案"
      );
      appendBlockText(session, block, action.text, now);
      session.updatedAt = now;
      session.lastActivitySummary = "正在生成实施方案…";
      notifyWaiters(session);
      return;
    }

    case "plan_completed": {
      const { block } = getOrCreateBlock(
        session,
        action.blockKey ?? "plan",
        "plan",
        action.title ?? "实施方案"
      );
      if (action.title) block.title = action.title;
      block.status = "completed";
      replaceBlockText(session, block, action.text, now);
      recordEvent(session, "plan.updated", `已生成方案: ${block.title}`, { blockId: block.id });
      return;
    }

    case "image_generated": {
      const { block } = getOrCreateBlock(
        session,
        action.blockKey,
        "image",
        action.revisedPrompt ? truncateText(action.revisedPrompt, 120) : "生成的图像",
        {
          ...(action.savedPath ? { savedPath: action.savedPath } : {}),
          ...(action.revisedPrompt ? { revisedPrompt: action.revisedPrompt } : {})
        }
      );
      block.status = action.status;
      block.meta = {
        ...(block.meta ?? {}),
        ...(action.savedPath ? { savedPath: action.savedPath } : {}),
        ...(action.revisedPrompt ? { revisedPrompt: action.revisedPrompt } : {})
      };
      if (action.savedPath) {
        block.text = action.savedPath;
      }
      block.updatedAt = now;
      pushDelta(
        session,
        { kind: "block.upsert", turnIndex: block.turnIndex, block: projectBlockForWire(session, block) },
        true
      );
      if (action.status === "completed") {
        recordEvent(session, "tool.activity", `已生成图像${action.savedPath ? `: ${path.basename(action.savedPath)}` : ""}`, {
          kind: "image",
          ...(action.savedPath ? { savedPath: action.savedPath } : {})
        });
      }
      return;
    }

    case "usage_updated": {
      session.totalUsage = mergeUsage(session.totalUsage, action.usage);
      if (action.costUsd !== undefined) {
        session.totalCostUsd = (session.totalCostUsd ?? 0) + action.costUsd;
      }
      session.contextUsage = computeContextUsage(session, action.usage, action.contextWindow, action.costUsd);
      pushDelta(session, { kind: "session.status", summary: toRailSummary(session) }, false);
      return;
    }

    case "command_started": {
      const { block } = getOrCreateBlock(session, action.blockKey, "command", action.command, {
        command: action.command,
        ...(action.cwd ? { cwd: action.cwd } : {})
      });
      block.status = "streaming";
      block.updatedAt = now;
      pushDelta(
        session,
        {
          kind: "block.status",
          turnIndex: block.turnIndex,
          blockId: block.id,
          status: "streaming",
          title: block.title,
          meta: block.meta,
          updatedAt: now
        },
        false
      );
      recordEvent(session, "tool.activity", `执行命令: ${truncateText(action.command, 160)}`, {
        kind: "command",
        command: action.command
      });
      return;
    }

    case "command_delta": {
      const { block } = getOrCreateBlock(session, action.blockKey, "command", "命令执行");
      appendBlockText(session, block, stripAnsi(action.text), now);
      session.updatedAt = now;
      notifyWaiters(session);
      return;
    }

    case "command_completed": {
      const { block } = getOrCreateBlock(session, action.blockKey, "command", action.command ?? "命令执行");
      if (action.command) block.title = stripAnsi(action.command);
      block.status = action.status;
      block.meta = {
        ...(block.meta ?? {}),
        ...(action.exitCode !== undefined ? { exitCode: action.exitCode } : {})
      };
      if (action.output) {
        replaceBlockText(session, block, stripAnsi(action.output), now);
      } else {
        block.updatedAt = now;
        pushDelta(
          session,
          {
            kind: "block.status",
            turnIndex: block.turnIndex,
            blockId: block.id,
            status: block.status,
            title: block.title,
            meta: block.meta,
            updatedAt: now
          },
          false
        );
      }
      recordEvent(
        session,
        "tool.activity",
        `命令${action.status === "failed" ? "失败" : "完成"}: ${truncateText(block.title, 140)}${action.exitCode !== undefined ? ` (exit=${action.exitCode})` : ""}`,
        { kind: "command", status: action.status, ...(action.exitCode !== undefined ? { exitCode: action.exitCode } : {}) }
      );
      return;
    }

    case "file_change_started": {
      const { block } = getOrCreateBlock(session, action.blockKey, "file_change", action.title, action.details);
      block.status = "streaming";
      block.updatedAt = now;
      recordEvent(session, "tool.activity", action.title, { kind: "file_change" });
      return;
    }

    case "file_change_delta": {
      const { block } = getOrCreateBlock(session, action.blockKey, "file_change", "文件变更");
      appendBlockText(session, block, action.text, now);
      session.updatedAt = now;
      notifyWaiters(session);
      return;
    }

    case "file_change_completed": {
      const { block } = getOrCreateBlock(
        session,
        action.blockKey,
        "file_change",
        action.title ?? "文件变更",
        action.details
      );
      if (action.title) block.title = action.title;
      block.status = action.status;
      if (action.diff) {
        replaceBlockText(session, block, action.diff, now);
      } else {
        block.updatedAt = now;
        pushDelta(
          session,
          {
            kind: "block.status",
            turnIndex: block.turnIndex,
            blockId: block.id,
            status: block.status,
            title: block.title,
            meta: block.meta,
            updatedAt: now
          },
          false
        );
      }
      recordEvent(session, "tool.activity", `${block.title} (${action.status})`, {
        kind: "file_change",
        status: action.status
      });
      return;
    }

    case "tool_started": {
      const { block } = getOrCreateBlock(session, action.blockKey, "tool", action.toolName, {
        toolName: action.toolName,
        ...(action.parameters ? { parameters: action.parameters } : {})
      });
      block.status = "streaming";
      block.updatedAt = now;
      recordEvent(session, "tool.activity", `调用工具: ${action.toolName}`, {
        kind: "tool",
        toolName: action.toolName,
        ...(action.parameters ? { parameters: action.parameters } : {})
      });
      return;
    }

    case "tool_completed": {
      const { block } = getOrCreateBlock(session, action.blockKey, "tool", action.toolName ?? "工具调用", {
        ...(action.toolName ? { toolName: action.toolName } : {}),
        ...(action.parameters ? { parameters: action.parameters } : {}),
        ...(action.durationMs !== undefined ? { durationMs: action.durationMs } : {})
      });
      if (action.toolName) block.title = action.toolName;
      block.status = action.status;
      if (action.output) {
        replaceBlockText(session, block, action.output, now);
      } else {
        block.updatedAt = now;
        pushDelta(
          session,
          {
            kind: "block.status",
            turnIndex: block.turnIndex,
            blockId: block.id,
            status: block.status,
            title: block.title,
            meta: block.meta,
            updatedAt: now
          },
          false
        );
      }
      recordEvent(
        session,
        "tool.activity",
        `工具${action.status === "failed" ? "失败" : "完成"}: ${block.title}${action.durationMs !== undefined ? ` (${action.durationMs}ms)` : ""}`,
        { kind: "tool", toolName: block.title, status: action.status }
      );
      return;
    }

    case "intervention": {
      session.pendingInterventions.push(action.intervention);
      session.status = "needs_intervention";
      const turn = ensureCurrentTurn(session);
      turn.status = "needs_intervention";
      const { block } = getOrCreateBlock(
        session,
        `int:${action.intervention.id}`,
        "intervention",
        action.intervention.title,
        {
          interventionId: action.intervention.id,
          kind: action.intervention.kind,
          method: action.intervention.method,
          details: action.intervention.details
        }
      );
      block.status = "pending";
      replaceBlockText(session, block, JSON.stringify(action.intervention.details, null, 2), now);
      pushDelta(
        session,
        { kind: "interventions.set", items: session.pendingInterventions.map((item) => ({ ...item })) },
        true
      );
      pushDelta(session, { kind: "session.status", summary: toRailSummary(session) }, true);
      recordEvent(session, "intervention.requested", action.intervention.title, {
        interventionId: action.intervention.id,
        kind: action.intervention.kind,
        method: action.intervention.method,
        details: action.intervention.details
      });
      emitNotificationHint(
        session,
        "intervention",
        `${ENGINE_CAPABILITIES[session.engine].displayName} 等待确认`,
        action.intervention.title
      );
      return;
    }

    case "turn_completed": {
      session.completedTurns += 1;
      const turn = ensureCurrentTurn(session);
      if (action.providerMessageId) turn.providerMessageId = action.providerMessageId;
      if (action.finalText) {
        session.lastAssistantText = truncateText(action.finalText, MAX_ASSISTANT_CHARS);
        const hasAssistantBlock = turn.blocks.some((b) => b.kind === "assistant" && b.text.trim().length > 0);
        if (!hasAssistantBlock) {
          const { block } = getOrCreateBlock(
            session,
            "assistant-final",
            "assistant",
            ENGINE_CAPABILITIES[session.engine].displayName
          );
          block.status = action.status === "failed" ? "failed" : "completed";
          replaceBlockText(session, block, action.finalText, now);
        }
      }
      for (const blk of turn.blocks) {
        if (blk.status === "streaming") {
          blk.status =
            action.status === "failed"
              ? "failed"
              : action.status === "interrupted"
                ? "interrupted"
                : "completed";
          blk.updatedAt = now;
        }
      }
      turn.endedAt = now;
      turn.durationMs = action.durationMs ?? Math.max(0, Date.parse(now) - Date.parse(turn.startedAt));
      if (action.usage) {
        turn.usage = action.usage;
        session.totalUsage = mergeUsage(session.totalUsage, action.usage);
        session.contextUsage = computeContextUsage(session, action.usage, undefined, action.costUsd);
      }
      if (action.costUsd !== undefined) {
        turn.costUsd = action.costUsd;
        session.totalCostUsd = (session.totalCostUsd ?? 0) + action.costUsd;
      }
      turn.status = action.status;

      if (action.turnId && session.activeTurnId === action.turnId) {
        session.activeTurnId = undefined;
      } else if (!action.turnId) {
        session.activeTurnId = undefined;
      }

      if (action.status === "failed") {
        session.lastError = stripAnsi(action.errorMessage ?? "External CLI turn failed.");
        if (!isTerminalCliStatus(session.status)) {
          session.status = session.mode === "interactive" ? "idle" : "failed";
        }
        if (session.queue.length > 0) {
          session.queuePaused = true;
          pushDelta(session, { kind: "queue.set", queue: [...session.queue], paused: true }, true);
        }
        pushDelta(session, { kind: "turn.upsert", turn: projectTurnForWire(session, turn) }, true);
        pushDelta(session, { kind: "session.status", summary: toRailSummary(session) }, true);
        recordEvent(session, "turn.failed", session.lastError, {
          ...(action.turnId ? { turnId: action.turnId } : {}),
          ...(action.data ?? {})
        });
        emitNotificationHint(
          session,
          "failed",
          `${ENGINE_CAPABILITIES[session.engine].displayName} 执行失败`,
          session.lastError
        );
      } else if (action.status === "interrupted") {
        if (!isTerminalCliStatus(session.status)) {
          session.status = "idle";
        }
        if (session.queue.length > 0) {
          session.queuePaused = true;
          pushDelta(session, { kind: "queue.set", queue: [...session.queue], paused: true }, true);
        }
        pushDelta(session, { kind: "turn.upsert", turn: projectTurnForWire(session, turn) }, true);
        pushDelta(session, { kind: "session.status", summary: toRailSummary(session) }, true);
        recordEvent(session, "turn.interrupted", "External CLI turn interrupted.", {
          ...(action.turnId ? { turnId: action.turnId } : {}),
          ...(action.data ?? {})
        });
      } else {
        session.lastError = undefined;
        if (!isTerminalCliStatus(session.status)) {
          session.status = session.pendingInterventions.length > 0 ? "needs_intervention" : "idle";
        }
        pushDelta(session, { kind: "turn.upsert", turn: projectTurnForWire(session, turn) }, true);
        pushDelta(session, { kind: "session.status", summary: toRailSummary(session) }, true);
        recordEvent(
          session,
          "turn.completed",
          truncateText(session.lastAssistantText || "Turn completed.", 400),
          {
            ...(action.turnId ? { turnId: action.turnId } : {}),
            ...(action.data ?? {})
          }
        );
        emitNotificationHint(
          session,
          "completed",
          `${ENGINE_CAPABILITIES[session.engine].displayName} 轮次完成`,
          session.lastAssistantText || "已完成本轮任务"
        );
      }
      finalizeTurnCheckpointAsync(session, turn);
      schedulePersist({ sessionId: session.cliSessionId });
      if (action.status === "completed") {
        scheduleQueueDrain(session);
      }
      return;
    }

    case "notice": {
      const turn = ensureCurrentTurn(session);
      const block: CliTranscriptBlock = {
        id: `blk_${turn.turnIndex}_notice_${randomUUID().slice(0, 6)}`,
        turnIndex: turn.turnIndex,
        kind: "notice",
        status: "completed",
        title: "协议提示",
        text: action.summary,
        ...(action.data ? { meta: action.data } : {}),
        startedAt: now,
        updatedAt: now
      };
      turn.blocks.push(block);
      pushDelta(session, { kind: "block.upsert", turnIndex: turn.turnIndex, block }, true);
      recordEvent(session, "protocol.notice", action.summary, action.data);
      return;
    }
  }
}

function handleExternalHostSettled(
  session: SessionRecord,
  reason: string,
  exitCode?: number,
  signal?: string
): void {
  if (session.executionSettled || deletedSessionIds.has(session.cliSessionId) || !sessions.has(session.cliSessionId)) return;
  session.executionSettled = true;
  session.exitCode = exitCode;
  session.signal = signal;
  session.endedAt = new Date().toISOString();
  session.activeTurnId = undefined;
  session.pendingInterventions = [];
  if (!isTerminalCliStatus(session.status)) {
    session.status = exitCode === 0 ? "exited" : reason.includes("stopped") ? "stopped" : "failed";
  }
  const lastTurn = session.turns[session.turns.length - 1];
  if (lastTurn && (lastTurn.status === "running" || lastTurn.status === "needs_intervention")) {
    lastTurn.status =
      session.status === "failed" ? "failed" : session.status === "stopped" ? "interrupted" : "completed";
    lastTurn.endedAt = session.endedAt;
    pushDelta(session, { kind: "turn.upsert", turn: projectTurnForWire(session, lastTurn) }, true);
  }
  if (session.status === "failed" && !session.lastError) {
    session.lastError =
      stripAnsi(session.rawStderrTail).trim().split(/\r?\n/).pop() || reason;
  }
  pushDelta(session, { kind: "interventions.set", items: [] }, true);
  pushDelta(session, { kind: "session.status", summary: toRailSummary(session) }, true);
  recordEvent(
    session,
    "process.exited",
    `External ${session.engine} process settled (${session.status}, exitCode=${exitCode ?? "none"}).`,
    {
      status: session.status,
      ...(exitCode !== undefined ? { exitCode } : {}),
      ...(signal ? { signal } : {})
    }
  );
  schedulePersist({ sessionId: session.cliSessionId });
}

function processStdoutLines(session: SessionRecord, chunk: string, flushPartial = false): void {
  if (chunk) {
    session.rawStdoutTail = appendTail(session.rawStdoutTail, chunk);
    session.stdoutLineBuffer += chunk;
  }
  const parts = session.stdoutLineBuffer.split(/\r?\n/);
  session.stdoutLineBuffer = flushPartial ? "" : (parts.pop() ?? "");
  const makeInterventionId = () => `int_${randomUUID().slice(0, 12)}`;
  for (const line of parts) {
    if (!line.trim()) continue;
    const nowIso = new Date().toISOString();
    const actions =
      session.engine === "codex"
        ? parseCodexStdoutLine(line, nowIso, makeInterventionId)
        : session.engine === "claude"
          ? parseClaudeStdoutLine(line, nowIso, makeInterventionId)
          : session.engine === "antigravity"
            ? parseAntigravityStdoutLine(line, nowIso, makeInterventionId)
            : session.engine === "opencode"
              ? parseOpencodeRunStdoutLine(line)
              : session.engine === "qwen"
                ? parseQwenStdoutLine(line)
                : parseGeminiStdoutLine(line);
    for (const action of actions) {
      applyParsedAction(session, action);
    }
  }
}

function processStderrLines(session: SessionRecord, chunk: string, flushPartial = false): void {
  const cleanedChunk = chunk ? stripAnsi(chunk) : "";
  if (cleanedChunk) {
    session.updatedAt = new Date().toISOString();
    session.rawStderrTail = appendTail(session.rawStderrTail, cleanedChunk);
    session.stderrLineBuffer += cleanedChunk;
  }
  const parts = session.stderrLineBuffer.split(/\r?\n/);
  session.stderrLineBuffer = flushPartial ? "" : (parts.pop() ?? "");
  for (const line of parts) {
    const trimmed = stripAnsi(line).trim();
    if (!trimmed) continue;
    recordEvent(session, "process.stderr", truncateText(trimmed, 600), undefined, {
      emitImmediate: false,
      updateActivity: false
    });
    if (session.turns.length === 0) {
      continue;
    }
    const { block } = getOrCreateBlock(session, "stderr", "stderr", "运行诊断日志 (stderr)");
    const prevLineCount = typeof block.meta?.lineCount === "number" ? block.meta.lineCount : 0;
    const prevAllDiagnostic = prevLineCount === 0 ? true : block.meta?.diagnostic !== false;
    const nextAllDiagnostic = prevAllDiagnostic && isDiagnosticTracingStderrLine(trimmed);
    const nextLineCount = prevLineCount + 1;
    block.status = "completed";
    block.title = nextAllDiagnostic ? "运行诊断日志 (stderr)" : "标准错误输出 (stderr)";
    block.meta = {
      ...(block.meta ?? {}),
      diagnostic: nextAllDiagnostic,
      lineCount: nextLineCount
    };
    const now = new Date().toISOString();
    appendBlockText(session, block, `${trimmed}\n`, now);
    pushDelta(
      session,
      {
        kind: "block.status",
        turnIndex: block.turnIndex,
        blockId: block.id,
        status: "completed",
        title: block.title,
        meta: block.meta,
        updatedAt: now
      },
      false
    );
  }
}

function startBackgroundReader(session: SessionRecord, boundProcessId: string): void {
  const ctx = lifecycleContext;
  if (!ctx) return;
  session.readerActive = true;
  void (async () => {
    let cursor = { stdoutOffset: 0, stderrOffset: 0 };
    let prevHadMore = false;
    let consecutiveReadErrors = 0;
    try {
      while (!ctx.signal.aborted && session.processId === boundProcessId) {
        const prevCursor = cursor;
        let page;
        try {
          page = await ctx.process.read(boundProcessId, {
            cursor,
            maxBytes: READ_PAGE_MAX_BYTES,
            timeoutMs: prevHadMore ? 0 : 250
          });
          consecutiveReadErrors = 0;
        } catch (readError) {
          if (
            ctx.signal.aborted ||
            session.processId !== boundProcessId ||
            isFatalProcessReadError(readError) ||
            consecutiveReadErrors >= TRANSIENT_READ_RETRY_BACKOFF_MS.length
          ) {
            throw readError;
          }
          const delayMs = TRANSIENT_READ_RETRY_BACKOFF_MS[consecutiveReadErrors] ?? 2_000;
          consecutiveReadErrors += 1;
          const waited = await waitForRetryBackoff(delayMs, ctx.signal);
          if (!waited || session.processId !== boundProcessId) return;
          continue;
        }
        cursor = page.cursor;
        prevHadMore = Boolean(page.more);

        const stdoutBytesRead = page.stdout ? Buffer.byteLength(page.stdout, "utf8") : 0;
        const stderrBytesRead = page.stderr ? Buffer.byteLength(page.stderr, "utf8") : 0;
        const stdoutDropped = cursor.stdoutOffset > prevCursor.stdoutOffset + stdoutBytesRead + 4;
        const stderrDropped = cursor.stderrOffset > prevCursor.stderrOffset + stderrBytesRead + 4;

        let stdoutChunk = page.stdout ?? "";
        let stderrChunk = page.stderr ?? "";

        if (stdoutDropped || stderrDropped) {
          if (!session.truncatedLog) {
            session.truncatedLog = true;
            recordEvent(
              session,
              "process.truncated",
              "Rolling log window compacted older bytes before reader caught up; live tail continues.",
              { cursor, stdoutDropped, stderrDropped }
            );
          }
          if (stdoutDropped) {
            session.stdoutLineBuffer = "";
            const nl = stdoutChunk.indexOf("\n");
            stdoutChunk = nl >= 0 ? stdoutChunk.slice(nl + 1) : "";
          }
          if (stderrDropped) {
            session.stderrLineBuffer = "";
            const nl = stderrChunk.indexOf("\n");
            stderrChunk = nl >= 0 ? stderrChunk.slice(nl + 1) : "";
          }
        }
        if (stdoutChunk) processStdoutLines(session, stdoutChunk, false);
        if (stderrChunk) processStderrLines(session, stderrChunk, false);

        if (page.exited || page.executionSettled) {
          if (page.more) continue;
          processStdoutLines(session, "", true);
          processStderrLines(session, "", true);
          if (session.processId === boundProcessId) {
            handleExternalHostSettled(
              session,
              page.state === "terminated"
                ? "process stopped"
                : `External CLI exited with code ${page.exitCode ?? "non-zero"}`,
              page.exitCode,
              page.signal
            );
          }
          break;
        }
      }
    } catch (error) {
      if (session.processId === boundProcessId && !ctx.signal.aborted) {
        const message = error instanceof Error ? error.message : String(error);
        session.lastError = message;
        recordEvent(session, "protocol.notice", `Background reader stopped: ${message}`);
      }
    } finally {
      if (session.processId === boundProcessId) {
        session.readerActive = false;
        notifyWaiters(session);
      }
    }
  })();
}

// ============================================================================
// Engine Launch Orchestration (Shared Codex, Claude Agent SDK, Universal ACP, Agy)
// ============================================================================

async function stopExistingAdapter(session: SessionRecord, processClient: PluginServiceContext["process"]): Promise<void> {
  const hadManagedAdapter = Boolean(session.codexHost || session.claudeSession || session.acpSession);
  if (session.codexHost) {
    const host = session.codexHost;
    session.codexHost = undefined;
    if (session.externalSessionId) {
      host.detachThread(session.externalSessionId);
    }
    await codexPool.stopHostIfIdle(host, processClient).catch(() => undefined);
  }
  if (session.claudeSession) {
    await session.claudeSession.stop().catch(() => undefined);
    session.claudeSession = undefined;
  }
  if (session.acpSession) {
    await session.acpSession.stop(processClient).catch(() => undefined);
    session.acpSession = undefined;
  }
  if (!hadManagedAdapter && session.processId && !session.executionSettled) {
    await processClient.stop(session.processId).catch(() => undefined);
  }
  session.executionSettled = true;
}

function buildEffectivePromptWithHandoff(session: SessionRecord, prompt: string): string {
  if (!session.pendingHandoffPrefix) return prompt;
  const prefix = session.pendingHandoffPrefix;
  session.pendingHandoffPrefix = undefined;
  return `${prefix}\n\n---\n\n[User Request]\n${prompt}`;
}

async function launchEngineProcess(
  session: SessionRecord,
  callContext: PluginServiceContext,
  options: {
    prompt?: string;
    resumeSessionId?: string;
    resumeSessionAt?: string;
    forkSession?: boolean;
    forkFromSessionId?: string;
    turnTrigger: CliTranscriptTurn["trigger"];
    clientMsgId?: string;
    attachments?: CliAttachmentRef[];
  }
): Promise<void> {
  const displayPrompt = options.prompt?.trim() ?? "";
  const effectivePrompt = displayPrompt ? buildEffectivePromptWithHandoff(session, displayPrompt) : "";
  const resolvedCwd = path.resolve(session.executionWorkspace, session.cwdRelative);

  await stopExistingAdapter(session, callContext.process);

  session.executionSettled = false;
  session.truncatedLog = false;
  session.lastError = undefined;
  session.endedAt = undefined;
  session.exitCode = undefined;
  session.signal = undefined;
  session.stdoutLineBuffer = "";
  session.stderrLineBuffer = "";
  session.status = "starting";

  const createdTurn = displayPrompt
    ? startTranscriptTurn(session, options.turnTrigger, displayPrompt, {
        ...(options.clientMsgId ? { clientMsgId: options.clientMsgId } : {}),
        ...(options.attachments ? { attachments: options.attachments } : {})
      })
    : undefined;

  if (createdTurn) {
    await Promise.race([
      captureTurnBeforeCheckpoint(session, createdTurn, callContext),
      new Promise<void>((resolve) => setTimeout(resolve, 2_000))
    ]);
  }

  try {
    // 1. Codex interactive via single shared multi-thread `CodexSharedHost`
    if (session.engine === "codex" && session.mode === "interactive") {
      const host = codexPool.getOrCreate(session.executionWorkspace, session.cwdRelative, session.extraArgs);
      await host.ensureReady(callContext);
      session.codexHost = host;
      session.processId = host.processId;

      const started = await host.startOrResumeThread(callContext, {
        resolvedCwd,
        permissionMode: session.permissionMode,
        ...(session.approvalPolicy ? { approvalPolicyOverride: session.approvalPolicy } : {}),
        ...(session.sandbox ? { sandboxOverride: session.sandbox } : {}),
        ...(session.model ? { model: session.model } : {}),
        ...(options.resumeSessionId ? { resumeSessionId: options.resumeSessionId } : {})
      });
      session.externalSessionId = started.threadId;
      if (started.model) {
        if (!session.model) session.model = started.model;
        recordObservedModel("codex", started.model);
      }
      if (started.reasoningEffort && !session.reasoningEffort) {
        session.reasoningEffort = started.reasoningEffort;
      }

      host.attachThread(started.threadId, {
        onActions: (actions, rawLine) => {
          if (rawLine) session.rawStdoutTail = appendTail(session.rawStdoutTail, `${rawLine}\n`);
          for (const action of actions) applyParsedAction(session, action);
        },
        onStderr: (chunk) => processStderrLines(session, chunk, false),
        onHostRetired: (reason, exitCode, signal) => {
          if (session.codexHost === host) {
            session.codexHost = undefined;
            handleExternalHostSettled(session, reason, exitCode, signal);
          }
        }
      });

      if (!effectivePrompt) {
        session.status = "idle";
        session.lastActivitySummary = "Codex 会话已就绪，请在下方输入第一条指令";
        pushDelta(session, { kind: "session.status", summary: toRailSummary(session) }, true);
        recordEvent(
          session,
          options.resumeSessionId ? "session.resumed" : "session.started",
          `Codex app-server ready (thread=${started.threadId}, shared pid=${host.processId}).`,
          { threadId: started.threadId, cwd: resolvedCwd, sharedHost: true }
        );
        schedulePersist({ sessionId: session.cliSessionId });
        return;
      }

      const turnsBefore = session.completedTurns;
      session.status = "running";
      session.currentTurnAssistantText = "";
      const turnRes = await host.startTurn(callContext, {
        threadId: started.threadId,
        text: effectivePrompt,
        resolvedCwd,
        permissionMode: session.permissionMode,
        interactionMode: session.interactionMode,
        ...(session.approvalPolicy ? { approvalPolicyOverride: session.approvalPolicy } : {}),
        ...(session.model ? { model: session.model } : {}),
        ...(session.reasoningEffort ? { reasoningEffort: session.reasoningEffort } : {}),
        serviceTier: session.serviceTier,
        ...(options.attachments ? { attachments: options.attachments } : {})
      });
      if (turnRes.turnId && session.completedTurns === turnsBefore && !isTerminalCliStatus(session.status)) {
        session.activeTurnId = turnRes.turnId;
        if (createdTurn && !createdTurn.turnId) createdTurn.turnId = turnRes.turnId;
      }
      recordEvent(
        session,
        options.resumeSessionId ? "session.resumed" : "session.started",
        `Codex app-server ${options.resumeSessionId ? "resumed" : "started"} (thread=${started.threadId}).`,
        { threadId: started.threadId, ...(turnRes.turnId ? { turnId: turnRes.turnId } : {}), cwd: resolvedCwd }
      );
      schedulePersist({ sessionId: session.cliSessionId });
      return;
    }

    // 2. Claude Code interactive via `@anthropic-ai/claude-agent-sdk` + `BrokeredClaudeProcess`
    if (session.engine === "claude" && session.mode === "interactive") {
      let resolvePid!: (pid: string) => void;
      const pidReady = new Promise<string>((resolve) => {
        resolvePid = resolve;
      });
      const claudeSession = new ClaudeSdkSession(
        () => lifecycleContext,
        {
          onProcessId: (pid) => {
            session.processId = pid;
            resolvePid(pid);
          },
          onActions: (actions) => {
            for (const action of actions) applyParsedAction(session, action);
          },
          onStderr: (chunk) => processStderrLines(session, chunk, false),
          onSlashCommands: (cmds) => {
            providerSlashCommands.set("claude", cmds);
            const cached = modelCatalogCache.get("claude");
            if (cached) {
              cached.catalog = { ...cached.catalog, slashCommands: cmds };
              const snap = cachedEngineSnapshot.claude;
              if (snap) snap.modelCatalog = cached.catalog;
            }
            void lifecycleContext?.events
              .emit("engines.updated", toStrictJsonValue({ engines: cachedEngineSnapshot }))
              .catch(() => undefined);
          },
          onExit: (exitCode, signal) => {
            if (session.claudeSession === claudeSession) {
              session.claudeSession = undefined;
              handleExternalHostSettled(
                session,
                `Claude SDK process exited (exitCode=${exitCode ?? "none"})`,
                exitCode,
                signal
              );
            }
          }
        },
        {
          cwdRelative: session.cwdRelative,
          resolvedCwd,
          ...(session.model ? { model: session.model } : {}),
          ...(session.reasoningEffort ? { reasoningEffort: session.reasoningEffort } : {}),
          permissionMode: session.permissionMode,
          interactionMode: session.interactionMode,
          ...(options.resumeSessionId ? { resumeSessionId: options.resumeSessionId } : {}),
          ...(options.resumeSessionAt ? { resumeSessionAt: options.resumeSessionAt } : {}),
          ...(options.forkSession ? { forkSession: true } : {}),
          extraArgs: session.extraArgs
        }
      );

      session.claudeSession = claudeSession;
      claudeSession.start(callContext);

      await Promise.race([
        pidReady,
        new Promise<string>((resolve) => setTimeout(() => resolve(session.processId), 4_000))
      ]);

      if (effectivePrompt) {
        session.status = "running";
        claudeSession.sendUserMessage(effectivePrompt, {
          ...(options.attachments ? { attachments: options.attachments } : {})
        });
      } else {
        session.status = "idle";
        session.lastActivitySummary = "Claude Code SDK 会话已就绪，请在下方输入第一条指令";
      }
      pushDelta(session, { kind: "session.status", summary: toRailSummary(session) }, true);
      recordEvent(
        session,
        options.resumeSessionId ? "session.resumed" : "session.started",
        `Claude Agent SDK ${options.resumeSessionId ? "resumed" : effectivePrompt ? "started" : "ready"}.`,
        {
          ...(options.resumeSessionId ? { resumeSessionId: options.resumeSessionId } : {}),
          cwdRelative: session.cwdRelative
        }
      );
      schedulePersist({ sessionId: session.cliSessionId });
      return;
    }

    // 3. Universal ACP v1/v2 engines (gemini, opencode, kiro, goose, acp)
    if (isAcpEngine(session.engine) && session.mode === "interactive") {
      const acpSession = new UniversalAcpSession(
        session.engine,
        () => lifecycleContext,
        {
          onActions: (actions, rawLine) => {
            if (rawLine) session.rawStdoutTail = appendTail(session.rawStdoutTail, `${rawLine}\n`);
            for (const action of actions) applyParsedAction(session, action);
          },
          onStderr: (chunk) => processStderrLines(session, chunk, false),
          onConfigUpdated: (info) => {
            if (info.slashCommands?.length) {
              providerSlashCommands.set(session.engine, info.slashCommands);
            }
            if (info.models?.length) {
              const existing = modelCatalogCache.get(session.engine);
              const catalog: CliEngineModelCatalog = {
                engine: session.engine,
                source: "live_acp",
                fetchedAt: new Date().toISOString(),
                ...(info.models.find((m) => m.isDefault)?.id ? { defaultModel: info.models.find((m) => m.isDefault)!.id } : {}),
                supportsMidSessionSwitch: ENGINE_CAPABILITIES[session.engine].midSessionModelSwitch,
                supportsReasoningEffort: ENGINE_CAPABILITIES[session.engine].supportsReasoningEffort,
                models: mergeObservedModels(session.engine, info.models),
                ...(info.slashCommands?.length ? { slashCommands: info.slashCommands } : {})
              };
              modelCatalogCache.set(session.engine, {
                expiresAt: Date.now() + MODEL_CATALOG_TTL_MS,
                catalog
              });
              const snap = cachedEngineSnapshot[session.engine];
              if (snap) snap.modelCatalog = catalog;
              else if (existing) existing.catalog = catalog;
              void lifecycleContext?.events
                .emit("engines.updated", toStrictJsonValue({ engines: cachedEngineSnapshot }))
                .catch(() => undefined);
            }
          },
          onExit: (exitCode, signal) => {
            if (session.acpSession === acpSession) {
              session.acpSession = undefined;
              handleExternalHostSettled(
                session,
                `${ENGINE_CAPABILITIES[session.engine].displayName} ACP exited (exitCode=${exitCode ?? "none"})`,
                exitCode,
                signal
              );
            }
          }
        },
        {
          cwdRelative: session.cwdRelative,
          resolvedCwd,
          ...(session.customExecutableId ? { executableId: session.customExecutableId } : {}),
          ...(session.customEnv ? { customEnv: session.customEnv } : {}),
          ...(session.model ? { model: session.model } : {}),
          ...(session.reasoningEffort ? { reasoningEffort: session.reasoningEffort } : {}),
          permissionMode: session.permissionMode,
          extraArgs: session.extraArgs,
          promptIdleTimeoutMs: runtimeSettings.acpSilenceTimeoutMs
        }
      );

      let acpStarted = false;
      const startAcp = async (acpFlagOverride?: string) => {
        const res = await acpSession.start(callContext, {
          ...(options.resumeSessionId ? { resumeSessionId: options.resumeSessionId } : {}),
          ...(options.forkFromSessionId ? { forkFromSessionId: options.forkFromSessionId } : {}),
          ...(acpFlagOverride ? { acpFlagOverride } : {})
        });
        acpStarted = true;
        session.acpSession = acpSession;
        session.processId = acpSession.processId;
        session.externalSessionId = res.externalSessionId;
        if (res.models?.length) {
          const catalog: CliEngineModelCatalog = {
            engine: session.engine,
            source: "live_acp",
            fetchedAt: new Date().toISOString(),
            supportsMidSessionSwitch: ENGINE_CAPABILITIES[session.engine].midSessionModelSwitch,
            supportsReasoningEffort: ENGINE_CAPABILITIES[session.engine].supportsReasoningEffort,
            models: mergeObservedModels(session.engine, res.models)
          };
          modelCatalogCache.set(session.engine, { expiresAt: Date.now() + MODEL_CATALOG_TTL_MS, catalog });
        }
        if (effectivePrompt) {
          session.status = "running";
          await acpSession.sendPrompt(callContext, effectivePrompt, options.attachments);
        } else {
          session.status = "idle";
          session.lastActivitySummary = `${ENGINE_CAPABILITIES[session.engine].displayName} ACP 会话已就绪`;
        }
        pushDelta(session, { kind: "session.status", summary: toRailSummary(session) }, true);
        recordEvent(
          session,
          options.resumeSessionId ? "session.resumed" : "session.started",
          `${ENGINE_CAPABILITIES[session.engine].displayName} ACP v${acpSession.protocolVersion} ready (${res.externalSessionId}).`,
          { externalSessionId: res.externalSessionId, protocolVersion: acpSession.protocolVersion }
        );
        schedulePersist({ sessionId: session.cliSessionId });
      };

      try {
        await startAcp();
        return;
      } catch (acpError) {
        await acpSession.stop(callContext.process).catch(() => undefined);
        // Older Qwen Code CLI builds exposed `--experimental-acp` before `--acp`.
        if (!acpStarted && session.engine === "qwen") {
          const retryAcp = new UniversalAcpSession(
            session.engine,
            () => lifecycleContext,
            {
              onActions: (actions, rawLine) => {
                if (rawLine) session.rawStdoutTail = appendTail(session.rawStdoutTail, `${rawLine}\n`);
                for (const action of actions) applyParsedAction(session, action);
              },
              onStderr: (chunk) => processStderrLines(session, chunk, false),
              onExit: (exitCode, signal) => {
                if (session.acpSession === retryAcp) {
                  session.acpSession = undefined;
                  handleExternalHostSettled(
                    session,
                    `${ENGINE_CAPABILITIES[session.engine].displayName} ACP exited (exitCode=${exitCode ?? "none"})`,
                    exitCode,
                    signal
                  );
                }
              }
            },
            {
              cwdRelative: session.cwdRelative,
              resolvedCwd,
              ...(session.model ? { model: session.model } : {}),
              permissionMode: session.permissionMode,
              extraArgs: session.extraArgs,
              promptIdleTimeoutMs: runtimeSettings.acpSilenceTimeoutMs
            }
          );
          try {
            const res = await retryAcp.start(callContext, {
              ...(options.resumeSessionId ? { resumeSessionId: options.resumeSessionId } : {}),
              acpFlagOverride: "--experimental-acp"
            });
            acpStarted = true;
            session.acpSession = retryAcp;
            session.processId = retryAcp.processId;
            session.externalSessionId = res.externalSessionId;
            if (effectivePrompt) {
              session.status = "running";
              await retryAcp.sendPrompt(callContext, effectivePrompt, options.attachments);
            } else {
              session.status = "idle";
              session.lastActivitySummary = `${ENGINE_CAPABILITIES[session.engine].displayName} ACP 会话已就绪`;
            }
            pushDelta(session, { kind: "session.status", summary: toRailSummary(session) }, true);
            schedulePersist({ sessionId: session.cliSessionId });
            return;
          } catch {
            await retryAcp.stop(callContext.process).catch(() => undefined);
          }
        }
        // Graceful fallback to headless stream-json / run --format json for Gemini, Qwen, and OpenCode.
        const supportsHeadlessFallback =
          session.engine === "gemini" || session.engine === "qwen" || session.engine === "opencode";
        if (!supportsHeadlessFallback || !effectivePrompt) {
          throw acpError;
        }
        if (acpStarted) throw acpError;
      }
    }

    // 4. Antigravity interactive + oneshot/fallback (Codex exec / Claude print / OpenCode run / Qwen / Gemini stream-json)
    const args =
      session.engine === "codex"
        ? buildCodexSpawnArgs("oneshot", {
            prompt: effectivePrompt,
            ...(session.model ? { model: session.model } : {}),
            ...(session.sandbox ? { sandbox: session.sandbox } : {}),
            extraArgs: session.extraArgs
          })
        : session.engine === "claude"
          ? buildClaudeSpawnArgs("oneshot", {
              ...(effectivePrompt ? { prompt: effectivePrompt } : {}),
              ...(session.model ? { model: session.model } : {}),
              ...(session.reasoningEffort ? { reasoningEffort: session.reasoningEffort } : {}),
              ...(session.approvalPolicy ? { approvalPolicy: session.approvalPolicy } : {}),
              ...(options.resumeSessionId ? { resumeSessionId: options.resumeSessionId } : {}),
              extraArgs: session.extraArgs
            })
          : session.engine === "antigravity"
            ? buildAntigravitySpawnArgs(session.mode, {
                ...(effectivePrompt ? { prompt: effectivePrompt } : {}),
                ...(session.model ? { model: session.model } : {}),
                ...(session.permissionMode === "full_access"
                  ? { approvalPolicy: "never" }
                  : session.approvalPolicy
                    ? { approvalPolicy: session.approvalPolicy }
                    : {}),
                ...(session.sandbox ? { sandbox: session.sandbox } : {}),
                ...(options.resumeSessionId ? { resumeSessionId: options.resumeSessionId } : {}),
                extraArgs: session.extraArgs
              })
            : session.engine === "opencode"
              ? buildOpencodeRunSpawnArgs({
                  prompt: effectivePrompt,
                  ...(session.model ? { model: session.model } : {}),
                  ...(options.resumeSessionId ? { resumeSessionId: options.resumeSessionId } : {}),
                  extraArgs: session.extraArgs
                })
              : session.engine === "qwen"
                ? buildQwenSpawnArgs({
                    prompt: effectivePrompt,
                    ...(session.model ? { model: session.model } : {}),
                    ...(options.resumeSessionId ? { resumeSessionId: options.resumeSessionId } : {}),
                    permissionMode: session.permissionMode,
                    extraArgs: session.extraArgs
                  })
                : buildGeminiSpawnArgs({
                    prompt: effectivePrompt,
                    ...(session.model ? { model: session.model } : {}),
                    extraArgs: session.extraArgs
                  });

    const spawned = await callContext.process.spawn(session.engine, args, {
      requestKey: `cli-${session.cliSessionId}-${randomUUID().slice(0, 8)}`,
      cwd: { kind: "workspace-directory", path: session.cwdRelative },
      env: { ...NO_COLOR_ENV },
      maxOutputBytes: ROLLING_LOG_WINDOW_BYTES,
      outputPolicy: "rolling"
    });

    session.processId = spawned.processId;
    startBackgroundReader(session, spawned.processId);

    if (session.engine === "antigravity" && session.mode === "interactive") {
      if (effectivePrompt) {
        const attachmentNotes = (options.attachments ?? [])
          .map((a) => `[Attached file: ${a.fileName} -> ${a.path}]`)
          .join("\n");
        const modePrefix = session.interactionMode === "plan" ? "[Plan Mode: Propose a detailed implementation plan before making edits.]\n\n" : "";
        const finalText = [attachmentNotes, modePrefix + effectivePrompt].filter(Boolean).join("\n\n");
        session.status = "running";
        await writeSessionStdin(session, callContext.process, buildAntigravityUserFrame(finalText));
      } else {
        session.status = "idle";
        session.lastActivitySummary = "Antigravity CLI 会话已就绪，请在下方输入第一条指令";
      }
      pushDelta(session, { kind: "session.status", summary: toRailSummary(session) }, true);
      recordEvent(
        session,
        options.resumeSessionId ? "session.resumed" : "session.started",
        `Antigravity CLI (agy) ${options.resumeSessionId ? "resumed" : effectivePrompt ? "started" : "ready"}.`,
        {
          ...(options.resumeSessionId ? { resumeSessionId: options.resumeSessionId } : {}),
          cwdRelative: session.cwdRelative
        }
      );
      schedulePersist({ sessionId: session.cliSessionId });
      return;
    }

    session.status = "running";
    pushDelta(session, { kind: "session.status", summary: toRailSummary(session) }, true);
    recordEvent(session, "session.started", `${session.engine} ${session.mode} process started.`, {
      processId: spawned.processId,
      cwdRelative: session.cwdRelative
    });
    schedulePersist({ sessionId: session.cliSessionId });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error);
    const friendly = formatCliOperationError(session.engine, rawMessage);
    const failedAt = new Date().toISOString();
    session.status = "failed";
    session.endedAt = failedAt;
    session.activeTurnId = undefined;
    session.pendingInterventions = [];
    session.lastError = friendly;
    session.lastActivitySummary = truncateText(`启动/恢复失败: ${friendly}`, 180);
    if (createdTurn && (createdTurn.status === "running" || createdTurn.status === "needs_intervention")) {
      createdTurn.status = "failed";
      createdTurn.endedAt = failedAt;
      createdTurn.durationMs = Math.max(0, Date.parse(failedAt) - Date.parse(createdTurn.startedAt));
      createdTurn.blocks.push({
        id: `blk_${createdTurn.turnIndex}_err_${randomUUID().slice(0, 6)}`,
        turnIndex: createdTurn.turnIndex,
        kind: "notice",
        status: "failed",
        title: options.resumeSessionId ? "恢复会话失败" : "启动会话失败",
        text: friendly,
        startedAt: failedAt,
        updatedAt: failedAt
      });
      pushDelta(session, { kind: "turn.upsert", turn: projectTurnForWire(session, createdTurn) }, true);
    }
    await stopExistingAdapter(session, callContext.process).catch(() => undefined);
    pushDelta(session, { kind: "session.status", summary: toRailSummary(session) }, true);
    schedulePersist({ sessionId: session.cliSessionId });
    throw new Error(friendly);
  }
}

function promoteHistorySession(record: CliPersistedSessionRecord): SessionRecord {
  const session: SessionRecord = {
    cliSessionId: record.cliSessionId,
    engine: record.engine,
    mode: record.mode,
    status: isTerminalCliStatus(record.status) ? record.status : "exited",
    ...(record.label ? { label: record.label } : {}),
    processId: "",
    executionWorkspace: record.executionWorkspace,
    cwdRelative: record.cwdRelative,
    isWorktree: record.isWorktree,
    ...(record.ownerSessionId ? { ownerSessionId: record.ownerSessionId } : {}),
    ...(record.ownerRunId ? { ownerRunId: record.ownerRunId } : {}),
    ...(record.ownerAgentId ? { ownerAgentId: record.ownerAgentId } : {}),
    ...(record.externalSessionId ? { externalSessionId: record.externalSessionId } : {}),
    ...(record.model ? { model: record.model } : {}),
    ...(record.reasoningEffort ? { reasoningEffort: record.reasoningEffort } : {}),
    ...(record.approvalPolicy ? { approvalPolicy: record.approvalPolicy } : {}),
    permissionMode: record.permissionMode ?? mapApprovalPolicyToPermissionMode(record.approvalPolicy),
    interactionMode: record.interactionMode ?? "default",
    serviceTier: record.serviceTier ?? "default",
    ...(record.sandbox ? { sandbox: record.sandbox } : {}),
    extraArgs: [...(record.extraArgs ?? [])],
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    ...(record.endedAt ? { endedAt: record.endedAt } : {}),
    ...(record.exitCode !== undefined ? { exitCode: record.exitCode } : {}),
    ...(record.signal ? { signal: record.signal } : {}),
    executionSettled: true,
    truncatedLog: false,
    nextSeq: 1,
    completedTurns: record.turns.length,
    events: [],
    turns: sanitizePersistedTurns(record.turns),
    blockIndex: new Map(),
    blockFullText: new Map(),
    pendingInterventions: [],
    queue: [],
    queuePaused: false,
    currentTurnAssistantText: "",
    lastAssistantText: record.lastAssistantText,
    lastActivitySummary: record.lastActivitySummary,
    ...(record.totalUsage ? { totalUsage: record.totalUsage } : {}),
    ...(record.contextUsage ? { contextUsage: record.contextUsage } : {}),
    ...(record.totalCostUsd !== undefined ? { totalCostUsd: record.totalCostUsd } : {}),
    ...(record.lastError ? { lastError: stripAnsi(record.lastError) } : {}),
    ...(record.forkedFromSessionId ? { forkedFromSessionId: record.forkedFromSessionId } : {}),
    ...(record.handoffFromEngine ? { handoffFromEngine: record.handoffFromEngine } : {}),
    rawStdoutTail: "",
    rawStderrTail: "",
    stdoutLineBuffer: "",
    stderrLineBuffer: "",
    writeChain: Promise.resolve(),
    opChain: Promise.resolve(),
    waiters: new Set(),
    readerActive: false,
    pendingDeltas: [],
    recentDeltas: [],
    lastRailFingerprint: "",
    drainingQueue: false
  };
  sessions.set(session.cliSessionId, session);
  return session;
}

// ============================================================================
// Wait / Polling helpers
// ============================================================================

function evaluateWaitCondition(
  session: SessionRecord,
  until: "turn_or_intervention" | "change" | "settled",
  afterSeq: number | undefined
): string | undefined {
  if (until === "settled") {
    if (session.executionSettled || isTerminalCliStatus(session.status)) {
      return session.status;
    }
    return undefined;
  }
  if (until === "change") {
    if (session.pendingInterventions.length > 0) return "needs_intervention";
    if (isTerminalCliStatus(session.status)) return session.status;
    if (session.nextSeq - 1 > (afterSeq ?? 0)) return "progress";
    return undefined;
  }
  if (session.pendingInterventions.length > 0) return "needs_intervention";
  if (isTerminalCliStatus(session.status)) return session.status;
  if (session.status === "idle" && session.completedTurns > 0) {
    if (afterSeq === undefined || session.nextSeq - 1 > afterSeq || !session.activeTurnId) {
      return "turn_completed";
    }
  }
  return undefined;
}

async function waitForSession(
  session: SessionRecord,
  options: {
    until: "turn_or_intervention" | "change" | "settled";
    afterSeq?: number;
    timeoutMs: number;
    eventLimit: number;
    signal?: AbortSignal;
  }
): Promise<Record<string, unknown>> {
  const initialReason = evaluateWaitCondition(session, options.until, options.afterSeq);
  let reason = initialReason;

  if (!reason) {
    reason = await new Promise<string>((resolve) => {
      let done = false;
      const finish = (value: string) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        session.waiters.delete(onUpdate);
        options.signal?.removeEventListener("abort", onAbort);
        resolve(value);
      };
      const onUpdate = () => {
        const matched = evaluateWaitCondition(session, options.until, options.afterSeq);
        if (matched) finish(matched);
      };
      const onAbort = () => finish("caller_aborted");
      const timer = setTimeout(() => finish("timeout"), options.timeoutMs);
      timer.unref?.();
      session.waiters.add(onUpdate);
      if (options.signal?.aborted) {
        onAbort();
        return;
      }
      options.signal?.addEventListener("abort", onAbort, { once: true });
      onUpdate();
    });
  }

  const afterSeq = options.afterSeq ?? 0;
  const events = session.events
    .filter((item) => item.seq > afterSeq)
    .slice(-options.eventLimit);

  return {
    reason,
    ...toSummary(session),
    events
  };
}

// ============================================================================
// Non-blocking Engine & Model Discovery (v0.4)
// ============================================================================

function mergeObservedModels(engine: CliEngine, base: CliModelOption[]): CliModelOption[] {
  const observed = observedEngineModels.get(engine);
  if (!observed || observed.size === 0) return base;
  const known = new Set(base.map((m) => m.id));
  const extras: CliModelOption[] = [];
  for (const id of observed) {
    if (!known.has(id)) {
      extras.push({
        id,
        displayName: id,
        group: "本机已观测模型",
        ...(engine === "claude" ? { supportedReasoningEfforts: ["low", "medium", "high", "xhigh", "max"] } : {})
      });
    }
  }
  return extras.length > 0 ? [...extras, ...base] : base;
}

async function probeCodexModels(callContext: PluginServiceContext): Promise<CliModelOption[]> {
  const warmHost = codexPool.findWarmHost(callContext.workspace) ?? codexPool.findWarmHost();
  if (warmHost) {
    try {
      const models = await warmHost.listModels(callContext);
      if (models.length > 0) return models;
    } catch {
      // Fall through to ephemeral probe.
    }
  }

  const probe = await callContext.process.spawn("codex", ["app-server", "--listen", "stdio://"], {
    requestKey: `probe-codex-models-${randomUUID().slice(0, 8)}`,
    cwd: { kind: "workspace-directory", path: "." },
    env: { ...NO_COLOR_ENV },
    maxOutputBytes: 512_000,
    outputPolicy: "rolling"
  });
  try {
    await callContext.process.write(
      probe.processId,
      buildCodexRpcRequest(1, "initialize", {
        clientInfo: { name: PLUGIN_ID, version: PLUGIN_VERSION, title: "CoTree Model Probe" },
        capabilities: { experimentalApi: true }
      })
    );
    let cursor: { stdoutOffset: number; stderrOffset: number } | undefined;
    let buf = "";
    let sentList = false;
    const deadline = Date.now() + 6_000;
    while (Date.now() < deadline && !callContext.signal.aborted) {
      const remaining = Math.max(150, Math.min(800, deadline - Date.now()));
      const chunk = await callContext.process.read(probe.processId, {
        ...(cursor ? { cursor } : {}),
        timeoutMs: remaining,
        maxBytes: 131_072
      });
      cursor = chunk.cursor;
      if (chunk.stdout) {
        buf += chunk.stdout;
        const lines = buf.split(/\r?\n/);
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          let obj: Record<string, unknown> | undefined;
          try {
            obj = asObject(JSON.parse(trimmed));
          } catch {
            continue;
          }
          if (obj.id === 1 && !sentList) {
            sentList = true;
            await callContext.process.write(probe.processId, buildCodexRpcNotification("initialized", {}));
            await callContext.process.write(probe.processId, buildCodexRpcRequest(2, "model/list", {}));
          } else if (obj.id === 2) {
            if (obj.error) return [];
            return parseCodexModelListResult(obj.result);
          }
        }
      }
      if (chunk.exited) break;
    }
    return [];
  } finally {
    await callContext.process.stop(probe.processId).catch(() => undefined);
  }
}

function buildFallbackCatalog(engine: CliEngine, available: boolean, fetchedAt: string): CliEngineModelCatalog {
  const cap = ENGINE_CAPABILITIES[engine];
  const cmds = providerSlashCommands.get(engine);
  if (!available) {
    return {
      engine,
      source: "unavailable",
      fetchedAt,
      supportsMidSessionSwitch: cap.midSessionModelSwitch,
      supportsReasoningEffort: cap.supportsReasoningEffort,
      models: [],
      note: `${cap.displayName} 未在当前环境检测到可执行文件。`
    };
  }
  if (engine === "claude") {
    return {
      engine,
      source: "aliases_and_custom",
      fetchedAt,
      supportsMidSessionSwitch: true,
      supportsReasoningEffort: true,
      supportedReasoningEfforts: ["low", "medium", "high", "xhigh", "max"],
      models: mergeObservedModels("claude", getCuratedClaudeModelOptions()),
      ...(cmds?.length ? { slashCommands: cmds } : {}),
      note: "支持 Claude SDK 在线切换模型/思考深度及自定义完整模型 ID。"
    };
  }
  if (engine === "gemini") {
    return {
      engine,
      source: "aliases_and_custom",
      fetchedAt,
      supportsMidSessionSwitch: true,
      supportsReasoningEffort: false,
      models: mergeObservedModels("gemini", getCuratedGeminiModelOptions()),
      ...(cmds?.length ? { slashCommands: cmds } : {}),
      note: "支持 ACP 交互会话与预设/自定义模型 ID。"
    };
  }
  if (engine === "qwen") {
    return {
      engine,
      source: "aliases_and_custom",
      fetchedAt,
      defaultModel: "coder-model",
      supportsMidSessionSwitch: true,
      supportsReasoningEffort: false,
      models: mergeObservedModels("qwen", getCuratedQwenModelOptions()),
      ...(cmds?.length ? { slashCommands: cmds } : {}),
      note: "支持 Qwen Code ACP 交互会话、DashScope / OAuth 鉴权及自定义模型 ID。"
    };
  }
  return {
    engine,
    source: "aliases_and_custom",
    fetchedAt,
    supportsMidSessionSwitch: cap.midSessionModelSwitch,
    supportsReasoningEffort: cap.supportsReasoningEffort,
    ...(cap.supportsReasoningEffort ? { supportedReasoningEfforts: ["low", "medium", "high", "xhigh", "max", "ultra"] } : {}),
    models: mergeObservedModels(engine, []),
    ...(cmds?.length ? { slashCommands: cmds } : {}),
    note: "留空使用引擎默认模型或手填模型 ID。"
  };
}

async function discoverEngineModelCatalog(
  engine: CliEngine,
  available: boolean,
  callContext: PluginServiceContext,
  options: { refresh?: boolean } = {}
): Promise<CliEngineModelCatalog> {
  const nowMs = Date.now();
  const cached = modelCatalogCache.get(engine);
  if (!options.refresh && cached && cached.expiresAt > nowMs) {
    return cached.catalog;
  }

  const fetchedAt = new Date(nowMs).toISOString();
  if (!available) {
    return buildFallbackCatalog(engine, false, fetchedAt);
  }

  let catalog: CliEngineModelCatalog;
  if (engine === "codex") {
    try {
      const liveModels = await probeCodexModels(callContext);
      const merged = mergeObservedModels("codex", liveModels);
      const defaultEntry = merged.find((m) => m.isDefault) ?? merged[0];
      const allEfforts = [...new Set(merged.flatMap((m) => m.supportedReasoningEfforts ?? []))];
      catalog = {
        engine,
        source: liveModels.length > 0 ? "live_rpc" : "aliases_and_custom",
        fetchedAt,
        ...(defaultEntry ? { defaultModel: defaultEntry.id } : {}),
        supportsMidSessionSwitch: true,
        supportsReasoningEffort: true,
        supportedReasoningEfforts: allEfforts.length > 0 ? allEfforts : ["low", "medium", "high", "xhigh", "max", "ultra"],
        models: merged,
        ...(liveModels.length === 0 ? { note: "未能通过 model/list 拉取模型，仍可留空使用默认模型或手填模型 ID。" } : {})
      };
    } catch (error) {
      catalog = {
        ...buildFallbackCatalog("codex", true, fetchedAt),
        note: `实时探测失败 (${truncateText(error instanceof Error ? error.message : String(error), 120)})，可使用默认或自定义模型 ID。`
      };
    }
  } else if (engine === "antigravity") {
    try {
      const result = await callContext.process.execute("antigravity", ["models"], {
        timeoutMs: 10_000,
        maxOutputBytes: 262_144
      });
      const liveModels = result.exitCode === 0 ? parseAntigravityModelsOutput(result.stdout) : [];
      const merged = mergeObservedModels("antigravity", liveModels);
      catalog = {
        engine,
        source: liveModels.length > 0 ? "live_cli" : "aliases_and_custom",
        fetchedAt,
        ...(merged[0] ? { defaultModel: merged[0].id } : {}),
        supportsMidSessionSwitch: true,
        supportsReasoningEffort: false,
        models: merged,
        ...(liveModels.length === 0
          ? { note: "agy models 未返回模型列表（可能尚未登录），可运行 agy login 或手填模型 ID。" }
          : {})
      };
    } catch (error) {
      catalog = {
        ...buildFallbackCatalog("antigravity", true, fetchedAt),
        note: `探测 agy models 失败 (${truncateText(error instanceof Error ? error.message : String(error), 120)})。`
      };
    }
  } else if (engine === "opencode") {
    try {
      const result = await callContext.process.execute("opencode", ["models"], {
        timeoutMs: 12_000,
        maxOutputBytes: 524_288
      });
      const liveModels = result.exitCode === 0 ? parseOpencodeModelsOutput(result.stdout) : [];
      const merged = mergeObservedModels("opencode", liveModels);
      catalog = {
        engine,
        source: liveModels.length > 0 ? "live_cli" : "aliases_and_custom",
        fetchedAt,
        ...(merged[0] ? { defaultModel: merged[0].id } : {}),
        supportsMidSessionSwitch: true,
        supportsReasoningEffort: true,
        supportedReasoningEfforts: ["low", "medium", "high", "xhigh", "max"],
        models: merged,
        ...(liveModels.length === 0
          ? { note: "opencode models 未返回已配置模型，可填写 provider/model（如 anthropic/claude-sonnet-4-5）。" }
          : {})
      };
    } catch (error) {
      catalog = {
        ...buildFallbackCatalog("opencode", true, fetchedAt),
        note: `探测 opencode models 失败 (${truncateText(error instanceof Error ? error.message : String(error), 120)})。`
      };
    }
  } else {
    catalog = buildFallbackCatalog(engine, true, fetchedAt);
  }

  modelCatalogCache.set(engine, { expiresAt: nowMs + MODEL_CATALOG_TTL_MS, catalog });
  return catalog;
}

const engineVersionCache = new Map<string, { expiresAt: number; version?: string }>();
const engineAuthCache = new Map<string, { expiresAt: number; authStatus: CliAuthPreflight }>();

function defaultAuthRemediation(engine: CliEngine): string {
  switch (engine) {
    case "codex":
      return "codex login (or configure OPENAI_API_KEY)";
    case "claude":
      return "claude auth login (or configure ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN)";
    case "antigravity":
      return "agy auth login (or configure AGY_ADC_AUTH)";
    case "gemini":
      return "gemini (interactive login) or set GEMINI_API_KEY";
    case "opencode":
      return "opencode auth login (or set OPENCODE_API_KEY / provider API key)";
    case "qwen":
      return "qwen (interactive login) or set DASHSCOPE_API_KEY / QWEN_API_KEY";
    case "kiro":
      return "kiro-cli login";
    case "goose":
      return "goose configure";
    case "acp":
      return "Configure credentials required by the selected ACP agent command";
  }
}

async function probeEngineAuthStatus(
  engine: CliEngine,
  executableId: string,
  available: boolean,
  callContext: PluginServiceContext,
  refresh = false
): Promise<CliAuthPreflight> {
  const cap = ENGINE_CAPABILITIES[engine];
  if (!available) {
    return {
      status: "missing",
      errorCode: "EXTERNAL_CLI_BINARY_MISSING",
      reason: `${cap.displayName} executable '${cap.command}' was not found on PATH or declared search paths.`,
      remediationCommand: `Install '${cap.command}' on PATH, then run: ${defaultAuthRemediation(engine)}`
    };
  }
  const cacheKey = `${engine}:${executableId}`;
  const cached = engineAuthCache.get(cacheKey);
  if (!refresh && cached && cached.expiresAt > Date.now()) {
    return cached.authStatus;
  }

  let authStatus: CliAuthPreflight;
  const runProbe = async (args: string[]): Promise<{ exitCode?: number; text: string } | undefined> => {
    try {
      const res = await callContext.process.execute(executableId, args, {
        cwd: { kind: "workspace-directory", path: "." },
        env: { ...NO_COLOR_ENV },
        timeoutMs: 4_000,
        maxOutputBytes: 16_384
      });
      return {
        ...(typeof res.exitCode === "number" ? { exitCode: res.exitCode } : {}),
        text: stripAnsi(`${res.stdout ?? ""}\n${res.stderr ?? ""}`).trim()
      };
    } catch {
      return undefined;
    }
  };

  if (engine === "codex") {
    const probed = await runProbe(["login", "status"]);
    if (!probed) {
      authStatus = {
        status: "unverified",
        errorCode: "EXTERNAL_CLI_AUTH_PROBE_FAILED",
        reason: "Could not complete 'codex login status' preflight check within 4s.",
        remediationCommand: "codex login status"
      };
    } else if (/not logged in|no credentials|unauthenticated/i.test(probed.text)) {
      authStatus = {
        status: "missing",
        errorCode: "EXTERNAL_CLI_AUTH_MISSING",
        reason: truncateText(probed.text || "Codex CLI reports no active login.", 180),
        remediationCommand: "codex login"
      };
    } else if (probed.exitCode === 0 && /logged in|authenticated|chatgpt|api key/i.test(probed.text)) {
      authStatus = {
        status: "ok",
        reason: truncateText(probed.text.split(/\r?\n/)[0] || "Codex CLI login verified.", 160)
      };
    } else if (probed.exitCode === 0) {
      authStatus = {
        status: "ok",
        reason: "Codex login status exited 0."
      };
    } else {
      authStatus = {
        status: "unverified",
        errorCode: "EXTERNAL_CLI_AUTH_UNVERIFIED",
        reason: truncateText(probed.text || `codex login status exited with code ${probed.exitCode ?? "none"}.`, 180),
        remediationCommand: "codex login"
      };
    }
  } else if (engine === "claude") {
    const probed = await runProbe(["auth", "status"]);
    if (!probed) {
      authStatus = {
        status: "unverified",
        errorCode: "EXTERNAL_CLI_AUTH_PROBE_FAILED",
        reason: "Could not complete 'claude auth status' preflight check within 4s.",
        remediationCommand: "claude auth status"
      };
    } else {
      let parsedLoggedIn: boolean | undefined;
      try {
        const jsonMatch = /\{[\s\S]*\}/.exec(probed.text);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as { loggedIn?: unknown };
          if (typeof parsed.loggedIn === "boolean") parsedLoggedIn = parsed.loggedIn;
        }
      } catch {
        // Ignore JSON parse fallback.
      }
      if (parsedLoggedIn === true || (probed.exitCode === 0 && /"loggedIn"\s*:\s*true|logged in/i.test(probed.text))) {
        authStatus = {
          status: "ok",
          reason: "Claude Code CLI authentication verified via 'claude auth status'."
        };
      } else if (parsedLoggedIn === false || /not logged in|unauthenticated|missing.*key/i.test(probed.text)) {
        authStatus = {
          status: "missing",
          errorCode: "EXTERNAL_CLI_AUTH_MISSING",
          reason: "Claude Code CLI reports not logged in.",
          remediationCommand: "claude auth login"
        };
      } else {
        authStatus = {
          status: "unverified",
          errorCode: "EXTERNAL_CLI_AUTH_UNVERIFIED",
          reason: truncateText(probed.text || "Claude auth status returned non-standard output.", 180),
          remediationCommand: "claude auth status"
        };
      }
    }
  } else if (engine === "antigravity") {
    const probed = await runProbe(["auth", "status"]);
    if (probed && probed.exitCode === 0 && !/not logged in|unauthenticated/i.test(probed.text)) {
      authStatus = {
        status: "ok",
        reason: truncateText(probed.text.split(/\r?\n/)[0] || "Antigravity CLI authentication verified.", 160)
      };
    } else if (probed && /not logged in|unauthenticated|missing credentials/i.test(probed.text)) {
      authStatus = {
        status: "missing",
        errorCode: "EXTERNAL_CLI_AUTH_MISSING",
        reason: truncateText(probed.text, 180),
        remediationCommand: "agy auth login"
      };
    } else {
      authStatus = {
        status: "unverified",
        errorCode: "EXTERNAL_CLI_AUTH_UNVERIFIED",
        reason: "Antigravity CLI did not expose a parseable auth status subcommand; binary is present on PATH.",
        remediationCommand: defaultAuthRemediation("antigravity")
      };
    }
  } else if (engine === "kiro") {
    const probed = await runProbe(["whoami"]);
    if (probed && probed.exitCode === 0 && probed.text.length > 0 && !/not logged in/i.test(probed.text)) {
      authStatus = { status: "ok", reason: truncateText(probed.text.split(/\r?\n/)[0]!, 160) };
    } else if (probed && /not logged in|unauthenticated/i.test(probed.text)) {
      authStatus = {
        status: "missing",
        errorCode: "EXTERNAL_CLI_AUTH_MISSING",
        reason: truncateText(probed.text, 180),
        remediationCommand: "kiro-cli login"
      };
    } else {
      authStatus = {
        status: "unverified",
        errorCode: "EXTERNAL_CLI_AUTH_UNVERIFIED",
        reason: "Kiro CLI login state could not be confirmed automatically.",
        remediationCommand: "kiro-cli login"
      };
    }
  } else {
    authStatus = {
      status: "unverified",
      reason: `${cap.displayName} binary is installed; provider-specific credentials are checked when a session starts.`,
      remediationCommand: defaultAuthRemediation(engine)
    };
  }

  engineAuthCache.set(cacheKey, { expiresAt: Date.now() + MODEL_CATALOG_TTL_MS, authStatus });
  return authStatus;
}

async function probeEngineVersion(
  executableId: string,
  available: boolean,
  callContext: PluginServiceContext,
  refresh = false
): Promise<string | undefined> {
  if (!available) return undefined;
  const cached = engineVersionCache.get(executableId);
  if (!refresh && cached && cached.expiresAt > Date.now()) {
    return cached.version;
  }
  try {
    const res = await callContext.process.execute(executableId, ["--version"], {
      cwd: { kind: "workspace-directory", path: "." },
      env: { ...NO_COLOR_ENV },
      timeoutMs: 4_000,
      maxOutputBytes: 16_384
    });
    const combined = `${res.stdout ?? ""}\n${res.stderr ?? ""}`;
    const line = combined
      .split(/\r?\n/)
      .map((item) => stripAnsi(item).trim())
      .find((item) => item.length > 0 && !isDiagnosticTracingStderrLine(item));
    const version = line ? truncateText(line, 120) : undefined;
    engineVersionCache.set(executableId, { expiresAt: Date.now() + MODEL_CATALOG_TTL_MS, version });
    return version;
  } catch {
    engineVersionCache.set(executableId, { expiresAt: Date.now() + 60_000 });
    return undefined;
  }
}

async function inspectOptionalExecutables(
  callContext: PluginServiceContext
): Promise<Record<string, Record<string, unknown>>> {
  const entries = await Promise.all(
    OPTIONAL_CUSTOM_CLI_EXECUTABLES.map(async (item) => {
      try {
        const inspected = await callContext.process.inspect(item.id);
        return [
          item.id,
          {
            id: item.id,
            displayName: item.displayName,
            available: inspected.available,
            command: inspected.command ?? item.command,
            ...(inspected.resolvedPath ? { resolvedPath: inspected.resolvedPath } : {}),
            ...(inspected.source ? { source: inspected.source } : {})
          }
        ] as const;
      } catch (error) {
        return [
          item.id,
          {
            id: item.id,
            displayName: item.displayName,
            available: false,
            command: item.command,
            error: error instanceof Error ? error.message : String(error)
          }
        ] as const;
      }
    })
  );
  return Object.fromEntries(entries);
}

async function runFullEngineProbe(
  callContext: PluginServiceContext,
  options: { includeModels?: boolean; refreshModels?: boolean; targetEngine?: CliEngine }
): Promise<Record<string, unknown>> {
  const enginesToCheck: readonly CliEngine[] = options.targetEngine ? [options.targetEngine] : ALL_CLI_ENGINES;
  const includeModels = options.includeModels !== false;
  const entries = await Promise.all(
    enginesToCheck.map(async (engine) => {
      try {
        const inspectId =
          engine === "acp" && (enginePreferences.acp?.command || runtimeSettings.acpCommandOverride)
            ? (() => {
                try {
                  return resolveAcpCommandExecutable(undefined, {
                    customCliAllowlist: runtimeSettings.customCliAllowlist,
                    acpCommandOverride: runtimeSettings.acpCommandOverride,
                    preferenceCommand: enginePreferences.acp?.command
                  }).executableId;
                } catch {
                  return engine;
                }
              })()
            : engine;
        const inspected = await callContext.process.inspect(inspectId);
        const [modelCatalog, version, authStatus] = await Promise.all([
          includeModels
            ? discoverEngineModelCatalog(engine, inspected.available, callContext, {
                refresh: options.refreshModels === true
              })
            : Promise.resolve(undefined),
          probeEngineVersion(inspectId, inspected.available, callContext, options.refreshModels === true),
          probeEngineAuthStatus(engine, inspectId, inspected.available, callContext, options.refreshModels === true)
        ]);
        return [
          engine,
          {
            available: inspected.available,
            command: inspected.command ?? ENGINE_CAPABILITIES[engine].command,
            ...(inspected.resolvedPath ? { resolvedPath: inspected.resolvedPath } : {}),
            ...(version ? { version } : {}),
            authStatus,
            ...(inspected.source ? { source: inspected.source } : {}),
            capabilities: ENGINE_CAPABILITIES[engine],
            unsupported: listUnsupportedCapabilities(engine),
            ...(modelCatalog ? { modelCatalog } : {}),
            ...(enginePreferences[engine] ? { preference: enginePreferences[engine] } : {})
          }
        ] as const;
      } catch (error) {
        return [
          engine,
          {
            available: false,
            command: ENGINE_CAPABILITIES[engine].command,
            error: error instanceof Error ? error.message : String(error),
            authStatus: {
              status: "missing",
              errorCode: "EXTERNAL_CLI_INSPECT_FAILED",
              reason: error instanceof Error ? error.message : String(error),
              remediationCommand: defaultAuthRemediation(engine)
            },
            capabilities: ENGINE_CAPABILITIES[engine],
            unsupported: listUnsupportedCapabilities(engine)
          }
        ] as const;
      }
    })
  );
  const result = Object.fromEntries(entries);
  if (!options.targetEngine && includeModels) {
    cachedEngineSnapshot = result as Record<string, Record<string, unknown>>;
    cachedEngineProbedAt = Date.now();
    cachedEngineHydratedFromDisk = false;
    schedulePersist({ providerCache: true });
  } else if (options.targetEngine && includeModels) {
    cachedEngineSnapshot[options.targetEngine] = result[options.targetEngine] as Record<string, unknown>;
    schedulePersist({ providerCache: true });
  }
  return result;
}

function scheduleBackgroundEngineProbe(callContext: PluginServiceContext, refreshModels = false): void {
  if (inFlightEngineProbe) return;
  const ctx = lifecycleContext ?? callContext;
  if (ctx.signal.aborted) return;
  inFlightEngineProbe = runFullEngineProbe(ctx, { includeModels: true, refreshModels })
    .then((engines) => {
      void ctx.events.emit("engines.updated", toStrictJsonValue({ engines })).catch(() => undefined);
      return engines;
    })
    .catch(() => cachedEngineSnapshot)
    .finally(() => {
      inFlightEngineProbe = undefined;
    });
}

async function inspectEngines(
  callContext: PluginServiceContext,
  options: { includeModels?: boolean; refreshModels?: boolean; targetEngine?: CliEngine; allowStale?: boolean } = {}
): Promise<Record<string, unknown>> {
  const now = Date.now();
  const hasFullCache = ALL_CLI_ENGINES.every((e) => Boolean(cachedEngineSnapshot[e]));
  const isStale = cachedEngineHydratedFromDisk || now - cachedEngineProbedAt > MODEL_CATALOG_TTL_MS;

  if (options.allowStale && !options.refreshModels && !options.targetEngine && hasFullCache) {
    // Patch live preferences before returning cached snapshot in 0ms.
    for (const engine of ALL_CLI_ENGINES) {
      const entry = cachedEngineSnapshot[engine];
      if (entry) {
        if (enginePreferences[engine]) entry.preference = enginePreferences[engine];
        else delete entry.preference;
      }
    }
    if (isStale) {
      scheduleBackgroundEngineProbe(callContext, false);
    }
    return cachedEngineSnapshot;
  }

  // On cold view open (allowStale && no cache yet), inspect binary availability fast (~15ms)
  // and kick off slow model/list RPCs in the background!
  if (options.allowStale && !options.refreshModels && !options.targetEngine && !hasFullCache) {
    const fetchedAt = new Date(now).toISOString();
    const fastEntries = await Promise.all(
      ALL_CLI_ENGINES.map(async (engine) => {
        try {
          const inspected = await callContext.process.inspect(engine);
          const catalog = modelCatalogCache.get(engine)?.catalog ?? buildFallbackCatalog(engine, inspected.available, fetchedAt);
          return [
            engine,
            {
              available: inspected.available,
              command: inspected.command ?? ENGINE_CAPABILITIES[engine].command,
              ...(inspected.resolvedPath ? { resolvedPath: inspected.resolvedPath } : {}),
              ...(inspected.source ? { source: inspected.source } : {}),
              capabilities: ENGINE_CAPABILITIES[engine],
              unsupported: listUnsupportedCapabilities(engine),
              modelCatalog: catalog,
              ...(enginePreferences[engine] ? { preference: enginePreferences[engine] } : {})
            }
          ] as const;
        } catch {
          return [
            engine,
            {
              available: false,
              command: ENGINE_CAPABILITIES[engine].command,
              capabilities: ENGINE_CAPABILITIES[engine],
              unsupported: listUnsupportedCapabilities(engine),
              modelCatalog: buildFallbackCatalog(engine, false, fetchedAt)
            }
          ] as const;
        }
      })
    );
    cachedEngineSnapshot = Object.fromEntries(fastEntries) as Record<string, Record<string, unknown>>;
    cachedEngineHydratedFromDisk = true; // Trigger live model catalog refresh in background.
    scheduleBackgroundEngineProbe(callContext, false);
    return cachedEngineSnapshot;
  }

  return runFullEngineProbe(callContext, options);
}

// ============================================================================
// Core Tool & View Operation Handlers
// ============================================================================

async function handleInspect(
  input: Record<string, unknown>,
  callContext: PluginServiceContext,
  options: { allowStale?: boolean } = {}
): Promise<Record<string, unknown>> {
  await refreshRuntimeSettings(callContext);
  const targetEngine = isCliEngine(input.engine) ? input.engine : undefined;
  const includeModels = input.includeModels !== false;
  const refreshModels = input.refreshModels === true;
  const [engines, optionalExecutables] = await Promise.all([
    inspectEngines(callContext, {
      includeModels,
      refreshModels,
      allowStale: options.allowStale === true,
      ...(targetEngine ? { targetEngine } : {})
    }),
    targetEngine ? Promise.resolve(undefined) : inspectOptionalExecutables(callContext)
  ]);
  const all = listAllSessionSummaries();
  const includeHistory = input.includeHistory !== false;
  const liveSessions = all.filter((s) => s.origin === "live");
  const historySummaries = all.filter((s) => s.origin === "history");

  return {
    controlWorkspace: lifecycleContext?.workspace ?? callContext.workspace,
    callerWorkspace: callContext.workspace,
    focusedCliSessionId: focusedCliSessionId ?? all[0]?.cliSessionId ?? null,
    focusedByRequest: Boolean(focusedCliSessionId && Date.now() - lastExplicitFocusAt < 15_000),
    engines,
    ...(optionalExecutables ? { optionalExecutables } : {}),
    enginePreferences,
    resourceQuotas: {
      ...PLUGIN_RESOURCE_QUOTAS,
      acpSilenceTimeoutMs: runtimeSettings.acpSilenceTimeoutMs,
      historyLimits: runtimeSettings.historyLimits
    },
    effectiveSettings: {
      allowedWorkspaceRoots: runtimeSettings.allowedWorkspaceRoots,
      extraEnvAllowlist: runtimeSettings.extraEnvAllowlist,
      defaultPermissionMode: runtimeSettings.defaultPermissionMode,
      acpSilenceTimeoutMs: runtimeSettings.acpSilenceTimeoutMs,
      historyLimits: runtimeSettings.historyLimits,
      acpCommandOverride: runtimeSettings.acpCommandOverride,
      customCliAllowlist: runtimeSettings.customCliAllowlist
    },
    pluginSlashCommands: PLUGIN_SLASH_COMMANDS,
    sessions: includeHistory ? all : liveSessions,
    ...(includeHistory ? { historyCount: historySummaries.length } : {})
  };
}

async function handleStart(
  input: Record<string, unknown>,
  caller: CallerMetadata,
  callContext: PluginServiceContext,
  options: { allowEmptyPrompt?: boolean; autoFocus?: boolean } = {}
): Promise<Record<string, unknown>> {
  if (!isCliEngine(input.engine)) {
    throw new Error(`engine must be one of: ${ALL_CLI_ENGINES.join(", ")}.`);
  }
  const mode: CliRunMode = input.mode === "oneshot" ? "oneshot" : "interactive";
  const prompt = asNonEmptyString(input.prompt);
  const canStartBlank = options.allowEmptyPrompt === true && mode === "interactive";
  if (!prompt && !canStartBlank) {
    throw new Error(
      mode === "oneshot" ? "oneshot 模式需要填写初始任务指令。" : "prompt must be a non-empty string."
    );
  }
  await refreshRuntimeSettings(callContext);
  const cwdRelative = normalizeRelativeCwd(input.cwd, runtimeSettings.allowedWorkspaceRoots);
  const customArgs = sanitizeExtraArgs(input.args);
  const extraArgs = [...customArgs, ...sanitizeExtraArgs(input.extraArgs)].slice(0, 32);
  const customEnv = sanitizeProcessEnvOverrides(input.env);
  const requestedCommand = asNonEmptyString(input.command);
  let customExecutableId: string | undefined;
  if (input.engine === "acp") {
    const resolved = resolveAcpCommandExecutable(requestedCommand, {
      customCliAllowlist: runtimeSettings.customCliAllowlist,
      acpCommandOverride: runtimeSettings.acpCommandOverride,
      preferenceCommand: enginePreferences.acp?.command
    });
    if (resolved.viaOverride) {
      customExecutableId = resolved.executableId;
    }
  } else if (requestedCommand) {
    throw new Error(
      `command override is only supported for engine='acp' (got engine='${input.engine}'). Use engine='acp' with a whitelisted command or remove 'command'.`
    );
  }
  const model = asNonEmptyString(input.model);
  const requestedReasoningEffort = isCliReasoningEffort(input.reasoningEffort) ? input.reasoningEffort : undefined;
  const approvalPolicy = asNonEmptyString(input.approvalPolicy);
  const permissionMode: CliPermissionMode = isCliPermissionMode(input.permissionMode)
    ? input.permissionMode
    : approvalPolicy
      ? mapApprovalPolicyToPermissionMode(approvalPolicy)
      : enginePreferences[input.engine]?.permissionMode ?? runtimeSettings.defaultPermissionMode;
  const requestedInteractionMode: CliInteractionMode = isCliInteractionMode(input.interactionMode)
    ? input.interactionMode
    : "default";
  const requestedServiceTier: CliServiceTier = isCliServiceTier(input.serviceTier)
    ? input.serviceTier
    : enginePreferences[input.engine]?.serviceTier ?? "default";
  const sandbox = asNonEmptyString(input.sandbox);
  const resumeSessionId = asNonEmptyString(input.resumeSessionId);
  const label = asNonEmptyString(input.label);
  const requestedAttachments = parseAttachments(input.attachments);
  const clientMsgId = asNonEmptyString(input.clientMsgId);
  const waitMs = asBoundedInt(input.waitMs, 0, 0, 30_000);

  const engineCap = ENGINE_CAPABILITIES[input.engine];
  const unsupportedOptions = evaluateUnsupportedRequestOptions(input.engine, {
    ...(requestedReasoningEffort ? { reasoningEffort: requestedReasoningEffort } : {}),
    ...(input.serviceTier === "fast" ? { serviceTier: "fast" } : {}),
    ...(input.interactionMode === "plan" ? { interactionMode: "plan" } : {}),
    ...(requestedAttachments ? { attachments: requestedAttachments } : {})
  });
  const reasoningEffort = engineCap.supportsReasoningEffort ? requestedReasoningEffort : undefined;
  const serviceTier: CliServiceTier = engineCap.supportsFastMode ? requestedServiceTier : "default";
  const interactionMode: CliInteractionMode = engineCap.planMode ? requestedInteractionMode : "default";
  const attachments = engineCap.supportsImageAttachments ? requestedAttachments : undefined;

  if (input.rememberPreference === true) {
    enginePreferences = {
      ...enginePreferences,
      [input.engine]: {
        ...(model ? { model } : {}),
        ...(reasoningEffort ? { reasoningEffort } : {}),
        permissionMode,
        serviceTier
      }
    };
    schedulePersist({ prefs: true });
  }

  const now = new Date().toISOString();
  const controlWs = lifecycleContext?.workspace ?? callContext.workspace;
  const isWorktree = !sameWorkspace(caller.workspace, controlWs);
  const cliSessionId = `cli_${input.engine}_${randomUUID().slice(0, 10)}`;
  const session: SessionRecord = {
    cliSessionId,
    engine: input.engine,
    mode,
    status: "starting",
    ...(label ? { label } : {}),
    processId: "",
    executionWorkspace: caller.workspace,
    cwdRelative,
    isWorktree,
    ...(caller.sessionId ? { ownerSessionId: caller.sessionId } : {}),
    ...(caller.runId ? { ownerRunId: caller.runId } : {}),
    ...(caller.agentId ? { ownerAgentId: caller.agentId } : {}),
    ...(resumeSessionId ? { externalSessionId: resumeSessionId } : {}),
    ...(model ? { model } : {}),
    ...(reasoningEffort ? { reasoningEffort } : {}),
    ...(approvalPolicy ? { approvalPolicy } : {}),
    permissionMode,
    interactionMode,
    serviceTier,
    ...(sandbox ? { sandbox } : {}),
    ...(customExecutableId ? { customExecutableId } : {}),
    ...(customEnv ? { customEnv } : {}),
    extraArgs,
    createdAt: now,
    updatedAt: now,
    executionSettled: false,
    truncatedLog: false,
    nextSeq: 1,
    completedTurns: 0,
    events: [],
    turns: [],
    blockIndex: new Map(),
    blockFullText: new Map(),
    pendingInterventions: [],
    queue: [],
    queuePaused: false,
    currentTurnAssistantText: "",
    lastAssistantText: "",
    lastActivitySummary: `启动 ${ENGINE_CAPABILITIES[input.engine].displayName}…`,
    rawStdoutTail: "",
    rawStderrTail: "",
    stdoutLineBuffer: "",
    stderrLineBuffer: "",
    writeChain: Promise.resolve(),
    opChain: Promise.resolve(),
    waiters: new Set(),
    readerActive: false,
    pendingDeltas: [],
    recentDeltas: [],
    lastRailFingerprint: "",
    drainingQueue: false
  };
  sessions.set(cliSessionId, session);
  const prevFocused = focusedCliSessionId ? sessions.get(focusedCliSessionId) : undefined;
  const prevFocusedBusy =
    Boolean(prevFocused) &&
    !prevFocused!.executionSettled &&
    (prevFocused!.status === "running" || prevFocused!.status === "starting" || prevFocused!.status === "needs_intervention");
  const shouldFocusNew = !focusedCliSessionId || options.autoFocus || !prevFocusedBusy;
  if (shouldFocusNew) {
    focusedCliSessionId = cliSessionId;
  }
  // Immediately announce the newly created session (including Agent-dispatched CLIs) so open
  // Sidecar/Transcript views render "启动中" within milliseconds without waiting for engine handshake.
  pushDelta(session, { kind: "session.status", summary: toRailSummary(session) }, true);
  if (shouldFocusNew) {
    void lifecycleContext?.events
      .emit("focus.changed", { focusedCliSessionId: cliSessionId })
      .catch(() => undefined);
  }

  await launchEngineProcess(session, callContext, {
    ...(prompt ? { prompt } : {}),
    ...(resumeSessionId ? { resumeSessionId } : {}),
    turnTrigger: resumeSessionId ? "resume" : "initial",
    ...(clientMsgId ? { clientMsgId } : {}),
    ...(attachments ? { attachments } : {})
  });

  if (unsupportedOptions.length > 0) {
    recordEvent(
      session,
      "protocol.notice",
      `Unsupported options for ${engineCap.displayName}: ${unsupportedOptions.map((u) => u.option).join(", ")}`,
      { unsupportedOptions }
    );
  }

  const unsupportedFields =
    unsupportedOptions.length > 0
      ? {
          unsupported: true,
          unsupportedOptions,
          degradedReason: unsupportedOptions.map((u) => u.reason).join(" ")
        }
      : {};

  if (waitMs > 0) {
    const waited = await waitForSession(session, {
      until: "turn_or_intervention",
      afterSeq: 0,
      timeoutMs: waitMs,
      eventLimit: 50,
      signal: callContext.signal
    });
    return {
      ...waited,
      ...unsupportedFields
    };
  }

  return {
    ...toSummary(session),
    ...unsupportedFields,
    recentEvents: session.events.slice(-10)
  };
}

function requireActiveOrPromotedSession(cliSessionId: string, allowPromoteHistory = false): SessionRecord {
  const existing = sessions.get(cliSessionId);
  if (existing) return existing;
  if (allowPromoteHistory) {
    const historical = historyRecords.get(cliSessionId);
    if (historical) return promoteHistorySession(historical);
  }
  throw new Error(`Managed CLI session not found: ${cliSessionId}`);
}

async function handleWait(
  input: Record<string, unknown>,
  caller: CallerMetadata,
  callContext: PluginServiceContext
): Promise<Record<string, unknown>> {
  const cliSessionId = asNonEmptyString(input.cliSessionId);
  if (!cliSessionId) throw new Error("cliSessionId is required.");
  const session = requireActiveOrPromotedSession(cliSessionId, false);
  const until: WaitUntilMode =
    input.until === "change" || input.until === "settled" ? input.until : "turn_or_intervention";
  const mode: "block" | "subscribe" = input.mode === "subscribe" ? "subscribe" : "block";
  const afterSeq =
    typeof input.afterSeq === "number" && Number.isFinite(input.afterSeq) && input.afterSeq >= 0
      ? Math.floor(input.afterSeq)
      : undefined;
  const eventLimit = asBoundedInt(input.eventLimit, 50, 1, 200);

  if (mode === "subscribe") {
    const effectiveAfterSeq = afterSeq ?? Math.max(0, session.nextSeq - 1);
    const immediateRaw = evaluateWaitCondition(session, until, effectiveAfterSeq);
    if (immediateRaw) {
      const reason = normalizeSubscriptionReason(immediateRaw, session);
      const events = buildBoundedSubscriptionEvents(session, effectiveAfterSeq, eventLimit);
      return {
        ok: true,
        pending: false,
        cliSessionId: session.cliSessionId,
        reason,
        nextAfterSeq: Math.max(0, session.nextSeq - 1),
        summary: toSummary(session),
        events
      };
    }

    // Idempotent subscription reuse for identical (cliSessionId, until, afterSeq, runId)
    const callerRunKey = caller.runId ?? "";
    for (const existing of waitSubscriptions.values()) {
      if (
        existing.cliSessionId === session.cliSessionId &&
        existing.until === until &&
        existing.afterSeq === effectiveAfterSeq &&
        (existing.runId ?? "") === callerRunKey
      ) {
        return {
          ok: true,
          pending: true,
          subscriptionId: existing.subscriptionId,
          cliSessionId: session.cliSessionId,
          reason: "subscribed",
          nextAfterSeq: effectiveAfterSeq,
          resume: { until, afterSeq: effectiveAfterSeq },
          summary: toSummary(session)
        };
      }
    }

    const subscriptionId = `sub_${randomUUID().slice(0, 12)}`;
    const sub: WaitSubscription = {
      subscriptionId,
      cliSessionId: session.cliSessionId,
      until,
      afterSeq: effectiveAfterSeq,
      ...(caller.runId ? { runId: caller.runId } : {}),
      ...(caller.sessionId ? { sessionId: caller.sessionId } : {}),
      ...(caller.toolCallId ? { toolCallId: caller.toolCallId } : {}),
      eventLimit,
      createdAt: new Date().toISOString()
    };
    waitSubscriptions.set(subscriptionId, sub);
    return {
      ok: true,
      pending: true,
      subscriptionId,
      cliSessionId: session.cliSessionId,
      reason: "subscribed",
      nextAfterSeq: effectiveAfterSeq,
      resume: { until, afterSeq: effectiveAfterSeq },
      summary: toSummary(session)
    };
  }

  // Compatibility fallback: bounded blocking wait (up to 870s, strictly under host 15-minute clamp).
  const timeoutMs = asBoundedInt(input.timeoutMs, 60_000, 100, 870_000);
  return await waitForSession(session, {
    until,
    ...(afterSeq !== undefined ? { afterSeq } : {}),
    timeoutMs,
    eventLimit,
    signal: callContext.signal
  });
}

async function handleSteer(
  input: Record<string, unknown>,
  callContext: PluginServiceContext
): Promise<Record<string, unknown>> {
  const cliSessionId = asNonEmptyString(input.cliSessionId);
  if (!cliSessionId) throw new Error("cliSessionId is required.");
  const message = asNonEmptyString(input.message);
  if (!message) throw new Error("message is required.");
  const strategy: CliSteerStrategy =
    input.strategy === "in_turn" ||
    input.strategy === "next_turn" ||
    input.strategy === "interrupt_and_resume" ||
    input.strategy === "queue"
      ? input.strategy
      : "auto";
  const requestedModel = asNonEmptyString(input.model);
  const requestedEffort = isCliReasoningEffort(input.reasoningEffort) ? input.reasoningEffort : undefined;
  const requestedPerm = isCliPermissionMode(input.permissionMode) ? input.permissionMode : undefined;
  const requestedInteraction = isCliInteractionMode(input.interactionMode) ? input.interactionMode : undefined;
  const requestedTier = isCliServiceTier(input.serviceTier) ? input.serviceTier : undefined;
  const attachments = parseAttachments(input.attachments);
  const clientMsgId = asNonEmptyString(input.clientMsgId);
  const fromQueue = input._fromQueue === true;

  const session = requireActiveOrPromotedSession(cliSessionId, true);
  const engineCap = ENGINE_CAPABILITIES[session.engine];
  const unsupportedOptions = evaluateUnsupportedRequestOptions(session.engine, {
    ...(requestedEffort ? { reasoningEffort: requestedEffort } : {}),
    ...(requestedTier === "fast" ? { serviceTier: "fast" } : {}),
    ...(requestedInteraction === "plan" ? { interactionMode: "plan" } : {}),
    ...(attachments ? { attachments } : {})
  });
  const effectiveEffort = engineCap.supportsReasoningEffort ? requestedEffort : undefined;
  const effectiveTier = engineCap.supportsFastMode ? requestedTier : requestedTier === "default" ? "default" : undefined;
  const effectiveInteraction = engineCap.planMode ? requestedInteraction : requestedInteraction === "default" ? "default" : undefined;
  const effectiveAttachments = engineCap.supportsImageAttachments ? attachments : undefined;
  const unsupportedFields =
    unsupportedOptions.length > 0
      ? {
          unsupported: true,
          unsupportedOptions
        }
      : {};

  // Queue-vs-Steer + turn-boundary safe provider slash commands + honest midTurnSteer degradation:
  const isBusy =
    session.status === "running" ||
    session.status === "needs_intervention" ||
    session.status === "starting" ||
    session.status === "interrupting";
  const isProviderSlashWhileBusy = isBusy && message.startsWith("/") && strategy !== "interrupt_and_resume";
  const degradedMidTurnToQueue =
    isBusy && !engineCap.midTurnSteer && (strategy === "auto" || strategy === "in_turn");
  if (
    degradedMidTurnToQueue ||
    (strategy === "queue" && (isBusy || session.queuePaused || session.queue.length > 0)) ||
    isProviderSlashWhileBusy
  ) {
    const queueItem: CliQueuedMessage = {
      id: `q_${randomUUID().slice(0, 8)}`,
      message,
      strategy: strategy === "queue" || degradedMidTurnToQueue ? "next_turn" : strategy,
      ...(requestedModel ? { model: requestedModel } : {}),
      ...(effectiveEffort ? { reasoningEffort: effectiveEffort } : {}),
      ...(requestedPerm ? { permissionMode: requestedPerm } : {}),
      ...(effectiveInteraction ? { interactionMode: effectiveInteraction } : {}),
      ...(effectiveTier ? { serviceTier: effectiveTier } : {}),
      ...(effectiveAttachments ? { attachments: effectiveAttachments } : {}),
      createdAt: new Date().toISOString()
    };
    session.queue.push(queueItem);
    pushDelta(session, { kind: "queue.set", queue: [...session.queue], paused: session.queuePaused }, true);
    const degradedReason = degradedMidTurnToQueue
      ? `${engineCap.displayName} does not support mid-turn steering (midTurnSteer=false); automatically degraded from '${strategy}' to 'queue' for the next turn. Pass strategy='interrupt_and_resume' to cancel the active turn immediately.`
      : undefined;
    recordEvent(
      session,
      "queue.updated",
      degradedReason ?? `已加入等待队列 (#${session.queue.length}): ${truncateText(message, 120)}`,
      {
        queueId: queueItem.id,
        queuedCount: session.queue.length,
        ...(degradedReason ? { degradedReason, requestedStrategy: strategy, effectiveStrategy: "queue" } : {})
      }
    );
    return {
      delivered: false,
      queued: true,
      queueItem,
      deliveryMode: degradedMidTurnToQueue ? "degraded.queued" : "queued",
      requestedStrategy: strategy,
      effectiveStrategy: "queue",
      ...(degradedReason ? { degradedReason } : {}),
      ...unsupportedFields,
      ...toSummary(session)
    };
  }

  const opResult: Record<string, unknown> = await withSessionOperation<Record<string, unknown>>(session, async () => {
    const previousModel = session.model;
    const previousEffort = session.reasoningEffort;
    const modelChanged = Boolean(requestedModel && requestedModel !== session.model);
    const effortChanged = Boolean(effectiveEffort && effectiveEffort !== session.reasoningEffort);
    const permChanged = Boolean(requestedPerm && requestedPerm !== session.permissionMode);
    const interactionChanged = Boolean(effectiveInteraction && effectiveInteraction !== session.interactionMode);
    const tierChanged = Boolean(effectiveTier && effectiveTier !== session.serviceTier);

    if (requestedModel) {
      session.model = requestedModel;
      recordObservedModel(session.engine, requestedModel);
    }
    if (effectiveEffort) session.reasoningEffort = effectiveEffort;
    if (requestedPerm) session.permissionMode = requestedPerm;
    if (effectiveInteraction) session.interactionMode = effectiveInteraction;
    if (effectiveTier) session.serviceTier = effectiveTier;
    if (unsupportedOptions.length > 0) {
      recordEvent(
        session,
        "protocol.notice",
        `Unsupported steer options for ${engineCap.displayName}: ${unsupportedOptions.map((u) => u.option).join(", ")}`,
        { unsupportedOptions }
      );
    }

    const switchSummary =
      modelChanged || effortChanged
        ? `已切换模型配置：${previousModel ?? "默认"}${previousEffort ? ` (${previousEffort})` : ""} → ${session.model ?? "默认"}${session.reasoningEffort ? ` (${session.reasoningEffort})` : ""}`
        : undefined;

    const trigger: CliTranscriptTurn["trigger"] = fromQueue
      ? "queued"
      : session.turns.length === 0
        ? "initial"
        : "steer";

    // 1. Codex interactive via shared `CodexSharedHost`
    if (session.engine === "codex" && session.mode === "interactive") {
      const alive =
        Boolean(session.codexHost && !session.codexHost.retired) &&
        !session.executionSettled &&
        !isTerminalCliStatus(session.status) &&
        session.status !== "starting";

      if (!alive) {
        if (!session.externalSessionId) {
          throw new Error("Codex session has exited and has no persisted threadId to resume.");
        }
        await launchEngineProcess(session, callContext, {
          prompt: message,
          resumeSessionId: session.externalSessionId,
          turnTrigger: "resume",
          ...(clientMsgId ? { clientMsgId } : {}),
          ...(attachments ? { attachments } : {})
        });
        if (switchSummary) {
          const { block } = getOrCreateBlock(session, `model-switch:${session.turns.length}`, "notice", "模型切换");
          block.status = "completed";
          replaceBlockText(session, block, switchSummary, new Date().toISOString());
        }
        recordEvent(session, "steer.sent", `Resumed Codex thread and sent steering: ${truncateText(message, 200)}`, {
          deliveryMode: "codex.respawn_resume",
          ...(session.model ? { model: session.model } : {}),
          ...(session.reasoningEffort ? { reasoningEffort: session.reasoningEffort } : {})
        });
        return { delivered: true, deliveryMode: "codex.respawn_resume", ...toSummary(session) };
      }

      const host = session.codexHost!;
      const threadId = session.externalSessionId;
      if (!threadId) throw new Error("Codex session does not have an active threadId yet.");

      if (
        session.activeTurnId &&
        (strategy === "interrupt_and_resume" || modelChanged || effortChanged || interactionChanged)
      ) {
        await host.interruptTurn(callContext, threadId, session.activeTurnId);
        await waitForSession(session, {
          until: "turn_or_intervention",
          afterSeq: session.nextSeq - 1,
          timeoutMs: 6_000,
          eventLimit: 10,
          signal: callContext.signal
        });
      }

      if (
        session.activeTurnId &&
        !modelChanged &&
        !effortChanged &&
        !interactionChanged &&
        (strategy === "auto" || strategy === "in_turn")
      ) {
        const turnsBefore = session.completedTurns;
        const expectedTurnId = session.activeTurnId;
        try {
          const steerRes = await host.steerTurn(callContext, {
            threadId,
            expectedTurnId,
            text: buildEffectivePromptWithHandoff(session, message),
            ...(tierChanged ? { serviceTier: session.serviceTier } : {}),
            ...(attachments ? { attachments } : {})
          });
          if (session.completedTurns === turnsBefore && !isTerminalCliStatus(session.status)) {
            session.activeTurnId = steerRes.turnId;
            session.lastError = undefined;
            if (session.pendingInterventions.length === 0) session.status = "running";
          }
          appendMidTurnSteerBlock(session, message, "codex.turn_steer", attachments);
          recordEvent(session, "steer.sent", `Codex mid-turn steer sent: ${truncateText(message, 200)}`, {
            deliveryMode: "codex.turn_steer",
            turnId: steerRes.turnId
          });
          return { delivered: true, deliveryMode: "codex.turn_steer", ...toSummary(session) };
        } catch (error) {
          if (strategy === "in_turn") throw error;
        }
      }

      const resolvedCwd = path.resolve(session.executionWorkspace, session.cwdRelative);
      const turnsBefore = session.completedTurns;
      session.status = "running";
      session.lastError = undefined;
      session.currentTurnAssistantText = "";
      const createdTurn = startTranscriptTurn(session, trigger, message, {
        ...(clientMsgId ? { clientMsgId } : {}),
        ...(attachments ? { attachments } : {})
      });
      await Promise.race([
        captureTurnBeforeCheckpoint(session, createdTurn, callContext),
        new Promise<void>((resolve) => setTimeout(resolve, 2_000))
      ]);
      if (switchSummary) {
        const { block } = getOrCreateBlock(session, `model-switch:${session.turns.length}`, "notice", "模型切换");
        block.status = "completed";
        replaceBlockText(session, block, switchSummary, new Date().toISOString());
      }
      try {
        const turnRes = await host.startTurn(callContext, {
          threadId,
          text: buildEffectivePromptWithHandoff(session, message),
          resolvedCwd,
          permissionMode: session.permissionMode,
          interactionMode: session.interactionMode,
          ...(session.approvalPolicy ? { approvalPolicyOverride: session.approvalPolicy } : {}),
          ...(session.model ? { model: session.model } : {}),
          ...(session.reasoningEffort ? { reasoningEffort: session.reasoningEffort } : {}),
          serviceTier: session.serviceTier,
          ...(attachments ? { attachments } : {})
        });
        if (turnRes.turnId && session.completedTurns === turnsBefore && !isTerminalCliStatus(session.status)) {
          session.activeTurnId = turnRes.turnId;
          if (!createdTurn.turnId) createdTurn.turnId = turnRes.turnId;
        }
        const deliveryMode =
          modelChanged || effortChanged
            ? "codex.turn_start_model_switch"
            : strategy === "interrupt_and_resume"
              ? "codex.interrupt_and_start"
              : "codex.turn_start";
        recordEvent(session, "steer.sent", switchSummary ?? `Codex follow-up turn started: ${truncateText(message, 200)}`, {
          deliveryMode,
          ...(turnRes.turnId ? { turnId: turnRes.turnId } : {}),
          ...(session.model ? { model: session.model } : {}),
          ...(session.reasoningEffort ? { reasoningEffort: session.reasoningEffort } : {})
        });
        return { delivered: true, deliveryMode, ...toSummary(session) };
      } catch (error) {
        const friendly = formatCliOperationError(session.engine, error instanceof Error ? error.message : String(error));
        const failedAt = new Date().toISOString();
        session.lastError = friendly;
        if (!session.executionSettled && !isTerminalCliStatus(session.status)) session.status = "idle";
        createdTurn.status = "failed";
        createdTurn.endedAt = failedAt;
        createdTurn.durationMs = Math.max(0, Date.parse(failedAt) - Date.parse(createdTurn.startedAt));
        createdTurn.blocks.push({
          id: `blk_${createdTurn.turnIndex}_err_${randomUUID().slice(0, 6)}`,
          turnIndex: createdTurn.turnIndex,
          kind: "notice",
          status: "failed",
          title: "发送指令失败",
          text: friendly,
          startedAt: failedAt,
          updatedAt: failedAt
        });
        pushDelta(session, { kind: "turn.upsert", turn: projectTurnForWire(session, createdTurn) }, true);
        pushDelta(session, { kind: "session.status", summary: toRailSummary(session) }, true);
        schedulePersist({ sessionId: session.cliSessionId });
        throw new Error(friendly);
      }
    }

    // 2. Claude Code interactive via `@anthropic-ai/claude-agent-sdk`
    if (session.engine === "claude" && session.mode === "interactive") {
      const alive =
        Boolean(session.claudeSession) &&
        !session.executionSettled &&
        !isTerminalCliStatus(session.status) &&
        session.status !== "starting";

      if (alive) {
        const sdk = session.claudeSession!;
        if (modelChanged || effortChanged || permChanged || interactionChanged) {
          await sdk.setLiveModes({
            ...(modelChanged ? { model: session.model } : {}),
            ...(effortChanged ? { reasoningEffort: session.reasoningEffort } : {}),
            ...(permChanged ? { permissionMode: session.permissionMode } : {}),
            ...(interactionChanged ? { interactionMode: session.interactionMode } : {})
          });
        }

        if (session.status === "running" && strategy === "interrupt_and_resume") {
          await sdk.interrupt();
          await waitForSession(session, {
            until: "turn_or_intervention",
            afterSeq: session.nextSeq - 1,
            timeoutMs: 6_000,
            eventLimit: 10,
            signal: callContext.signal
          });
        }

        if (session.status === "running" && (strategy === "auto" || strategy === "in_turn")) {
          sdk.sendUserMessage(buildEffectivePromptWithHandoff(session, message), {
            priority: "next",
            ...(attachments ? { attachments } : {})
          });
          appendMidTurnSteerBlock(session, message, "claude.sdk_priority_next", attachments);
          recordEvent(session, "steer.sent", `Claude SDK mid-turn steer sent: ${truncateText(message, 200)}`, {
            deliveryMode: "claude.sdk_priority_next"
          });
          return { delivered: true, deliveryMode: "claude.sdk_priority_next", ...toSummary(session) };
        }

        session.status = "running";
        session.lastError = undefined;
        session.currentTurnAssistantText = "";
        const createdTurn = startTranscriptTurn(session, trigger, message, {
          ...(clientMsgId ? { clientMsgId } : {}),
          ...(attachments ? { attachments } : {})
        });
        await Promise.race([
          captureTurnBeforeCheckpoint(session, createdTurn, callContext),
          new Promise<void>((resolve) => setTimeout(resolve, 180))
        ]);
        if (switchSummary) {
          const { block } = getOrCreateBlock(session, `model-switch:${session.turns.length}`, "notice", "模型切换");
          block.status = "completed";
          replaceBlockText(session, block, switchSummary, new Date().toISOString());
        }
        sdk.sendUserMessage(buildEffectivePromptWithHandoff(session, message), {
          ...(attachments ? { attachments } : {})
        });
        const deliveryMode =
          modelChanged || effortChanged ? "claude.sdk_live_model_switch" : "claude.stream_json_user";
        recordEvent(session, "steer.sent", switchSummary ?? `Claude SDK message sent: ${truncateText(message, 200)}`, {
          deliveryMode
        });
        return { delivered: true, deliveryMode, ...toSummary(session) };
      }

      if (session.externalSessionId) {
        await launchEngineProcess(session, callContext, {
          prompt: message,
          resumeSessionId: session.externalSessionId,
          turnTrigger: "resume",
          ...(clientMsgId ? { clientMsgId } : {}),
          ...(attachments ? { attachments } : {})
        });
        recordEvent(session, "steer.sent", `Respawned Claude SDK with resume: ${truncateText(message, 200)}`, {
          deliveryMode: "claude.respawn_resume"
        });
        return { delivered: true, deliveryMode: "claude.respawn_resume", ...toSummary(session) };
      }
      throw new Error("Claude session has exited and has no captured external session ID to resume.");
    }

    // 3. Universal ACP engines
    if (isAcpEngine(session.engine) && session.mode === "interactive") {
      const alive =
        Boolean(session.acpSession && !session.acpSession.closed) &&
        !session.executionSettled &&
        !isTerminalCliStatus(session.status);

      if (alive) {
        const acp = session.acpSession!;
        if (permChanged) acp.setPermissionMode(session.permissionMode);
        if (modelChanged && session.model) await acp.setModel(callContext, session.model).catch(() => undefined);
        if (effortChanged && session.reasoningEffort) {
          await acp.setReasoningEffort(callContext, session.reasoningEffort).catch(() => undefined);
        }
        if (interactionChanged) await acp.setMode(callContext, session.interactionMode).catch(() => undefined);

        let interruptedMidTurn = false;
        if (session.status === "running" && strategy === "interrupt_and_resume") {
          interruptedMidTurn = true;
          await acp.cancelTurn(callContext);
          await waitForSession(session, {
            until: "turn_or_intervention",
            afterSeq: session.nextSeq - 1,
            timeoutMs: 6_000,
            eventLimit: 10,
            signal: callContext.signal
          });
        }

        session.status = "running";
        session.lastError = undefined;
        session.currentTurnAssistantText = "";
        const createdTurn = startTranscriptTurn(session, trigger, message, {
          ...(clientMsgId ? { clientMsgId } : {}),
          ...(effectiveAttachments ? { attachments: effectiveAttachments } : {})
        });
        await Promise.race([
          captureTurnBeforeCheckpoint(session, createdTurn, callContext),
          new Promise<void>((resolve) => setTimeout(resolve, 180))
        ]);
        await acp.sendPrompt(callContext, buildEffectivePromptWithHandoff(session, message), effectiveAttachments);
        recordEvent(session, "steer.sent", `${session.engine} ACP prompt sent: ${truncateText(message, 200)}`, {
          deliveryMode: `${session.engine}.acp_prompt`,
          effectiveStrategy: interruptedMidTurn ? "interrupt_and_resume" : "next_turn"
        });
        return {
          delivered: true,
          deliveryMode: `${session.engine}.acp_prompt`,
          requestedStrategy: strategy,
          effectiveStrategy: interruptedMidTurn ? "interrupt_and_resume" : "next_turn",
          ...(interruptedMidTurn && !engineCap.midTurnSteer
            ? {
                degradedReason: `${engineCap.displayName} does not support mid-turn steering; cancelled active turn and started follow-up turn.`
              }
            : {}),
          ...unsupportedFields,
          ...toSummary(session)
        };
      }

      await launchEngineProcess(session, callContext, {
        prompt: message,
        ...(session.externalSessionId ? { resumeSessionId: session.externalSessionId } : {}),
        turnTrigger: session.externalSessionId ? "resume" : "steer",
        ...(clientMsgId ? { clientMsgId } : {}),
        ...(effectiveAttachments ? { attachments: effectiveAttachments } : {})
      });
      return {
        delivered: true,
        deliveryMode: `${session.engine}.acp_respawn`,
        requestedStrategy: strategy,
        effectiveStrategy: "next_turn",
        ...unsupportedFields,
        ...toSummary(session)
      };
    }

    // 4. Antigravity interactive
    if (session.engine === "antigravity" && session.mode === "interactive") {
      const alive = !session.executionSettled && !isTerminalCliStatus(session.status) && session.status !== "starting";
      if (alive && (modelChanged || effortChanged) && session.externalSessionId) {
        await callContext.process.stop(session.processId).catch(() => undefined);
        session.executionSettled = true;
        await launchEngineProcess(session, callContext, {
          prompt: message,
          resumeSessionId: session.externalSessionId,
          turnTrigger: "resume",
          ...(clientMsgId ? { clientMsgId } : {}),
          ...(attachments ? { attachments } : {})
        });
        recordEvent(session, "steer.sent", switchSummary ?? "Switched antigravity model and resumed.", {
          deliveryMode: "antigravity.respawn_model_switch"
        });
        return { delivered: true, deliveryMode: "antigravity.respawn_model_switch", ...toSummary(session) };
      }

      if (alive && strategy === "interrupt_and_resume" && session.status === "running" && session.externalSessionId) {
        await callContext.process.stop(session.processId).catch(() => undefined);
        session.executionSettled = true;
        await launchEngineProcess(session, callContext, {
          prompt: message,
          resumeSessionId: session.externalSessionId,
          turnTrigger: "resume",
          ...(clientMsgId ? { clientMsgId } : {}),
          ...(attachments ? { attachments } : {})
        });
        return { delivered: true, deliveryMode: "antigravity.restart_resume", ...toSummary(session) };
      }

      if (alive) {
        session.status = "running";
        session.lastError = undefined;
        session.currentTurnAssistantText = "";
        const createdTurn = startTranscriptTurn(session, trigger, message, {
          ...(clientMsgId ? { clientMsgId } : {}),
          ...(attachments ? { attachments } : {})
        });
        await Promise.race([
          captureTurnBeforeCheckpoint(session, createdTurn, callContext),
          new Promise<void>((resolve) => setTimeout(resolve, 180))
        ]);
        const notes = (attachments ?? []).map((a) => `[Attached file: ${a.fileName} -> ${a.path}]`).join("\n");
        const modePrefix = session.interactionMode === "plan" ? "[Plan Mode: Propose a detailed implementation plan before making edits.]\n\n" : "";
        const finalText = [notes, modePrefix + buildEffectivePromptWithHandoff(session, message)]
          .filter(Boolean)
          .join("\n\n");
        await writeSessionStdin(session, callContext.process, buildAntigravityUserFrame(finalText));
        recordEvent(session, "steer.sent", `antigravity stream-json steer sent: ${truncateText(message, 200)}`, {
          deliveryMode: "antigravity.stream_json_user"
        });
        return {
          delivered: true,
          deliveryMode: "antigravity.stream_json_user",
          requestedStrategy: strategy,
          effectiveStrategy: strategy === "in_turn" ? "in_turn" : "next_turn",
          ...unsupportedFields,
          ...toSummary(session)
        };
      }

      if (session.externalSessionId) {
        await launchEngineProcess(session, callContext, {
          prompt: message,
          resumeSessionId: session.externalSessionId,
          turnTrigger: "resume",
          ...(clientMsgId ? { clientMsgId } : {}),
          ...(effectiveAttachments ? { attachments: effectiveAttachments } : {})
        });
        return {
          delivered: true,
          deliveryMode: "antigravity.respawn_resume",
          requestedStrategy: strategy,
          effectiveStrategy: "next_turn",
          ...unsupportedFields,
          ...toSummary(session)
        };
      }
      throw new Error("antigravity session has exited and has no captured external session ID to resume.");
    }

    // 5. Generic oneshot respawn
    if (!session.executionSettled && strategy === "interrupt_and_resume") {
      await callContext.process.stop(session.processId).catch(() => undefined);
      session.executionSettled = true;
    }
    if (!session.executionSettled) {
      throw new Error(
        `Engine '${session.engine}' in '${session.mode}' mode does not support in-turn steering; use strategy='interrupt_and_resume' or stop first.`
      );
    }
    await launchEngineProcess(session, callContext, {
      prompt: message,
      turnTrigger: "steer",
      ...(clientMsgId ? { clientMsgId } : {}),
      ...(attachments ? { attachments } : {})
    });
    return { delivered: true, deliveryMode: "generic.respawn", effectiveStrategy: "next_turn", ...toSummary(session) };
  });
  return {
    ...opResult,
    ...(opResult.effectiveStrategy ? {} : { effectiveStrategy: strategy === "auto" ? "next_turn" : strategy }),
    ...unsupportedFields
  };
}

async function handleRespond(
  input: Record<string, unknown>,
  callContext: PluginServiceContext
): Promise<Record<string, unknown>> {
  const cliSessionId = asNonEmptyString(input.cliSessionId);
  if (!cliSessionId) throw new Error("cliSessionId is required.");
  const session = requireActiveOrPromotedSession(cliSessionId, false);
  if (session.executionSettled || isTerminalCliStatus(session.status)) {
    throw new Error(`CLI session ${cliSessionId} is already settled (${session.status}).`);
  }

  const interventionId = asNonEmptyString(input.interventionId);
  const index = interventionId
    ? session.pendingInterventions.findIndex((item) => item.id === interventionId)
    : 0;
  if (index < 0 || !session.pendingInterventions[index]) {
    throw new Error(
      interventionId
        ? `Pending intervention not found: ${interventionId}`
        : `Session ${cliSessionId} has no pending interventions.`
    );
  }

  const intervention = session.pendingInterventions[index]!;
  const decisionRaw = input.decision;
  const decision: CliApprovalDecision | undefined =
    decisionRaw === "accept" ||
    decisionRaw === "accept_for_session" ||
    decisionRaw === "decline" ||
    decisionRaw === "cancel"
      ? decisionRaw
      : undefined;
  const optionId = asNonEmptyString(input.optionId);
  const answers =
    input.answers && typeof input.answers === "object" && !Array.isArray(input.answers)
      ? (input.answers as Record<string, string | string[]>)
      : undefined;
  const text = typeof input.text === "string" ? input.text : undefined;

  let degradedMode: string | undefined;
  let degradedReason: string | undefined;

  if (session.engine === "codex" && session.codexHost) {
    const resultPayload = buildCodexInterventionResponse(intervention, {
      ...(decision ? { decision } : {}),
      ...(answers ? { answers } : {}),
      ...(text !== undefined ? { text } : {})
    });
    await session.codexHost.sendResponse(callContext.process, intervention.requestId, resultPayload);
  } else if (session.engine === "claude" && session.claudeSession) {
    const ok = session.claudeSession.resolveIntervention(intervention.id, {
      ...(decision ? { decision } : {}),
      ...(answers ? { answers } : {}),
      ...(text !== undefined ? { text } : {})
    });
    if (!ok) {
      throw new Error(`Claude SDK pending permission already settled: ${intervention.id}`);
    }
  } else if (session.acpSession) {
    await session.acpSession.respondToIntervention(callContext, intervention, {
      ...(decision ? { decision } : {}),
      ...(optionId ? { optionId } : {}),
      ...(answers ? { answers } : {}),
      ...(text !== undefined ? { text } : {})
    });
  } else if (session.engine === "antigravity") {
    if (!text) {
      return {
        resolved: false,
        unsupported: true,
        capability: "structuredApprovals",
        interventionId: intervention.id,
        reason: "Antigravity CLI (agy) stream-json protocol does not support structured JSON-RPC approval decisions.",
        alternatives: [
          "Call respond with freeform 'text' parameter to send a follow-up text frame",
          "Restart or start the session with permissionMode='accept_edits' or 'full_access'"
        ],
        ...toSummary(session)
      };
    }
    await writeSessionStdin(session, callContext.process, buildAntigravityUserFrame(text));
    degradedMode = "antigravity.text_frame";
    degradedReason = "Antigravity CLI lacks structured approval responses; forwarded freeform text frame instead.";
  } else {
    const rawLine = `${text ?? decision ?? "no"}\n`;
    await writeSessionStdin(session, callContext.process, rawLine);
  }

  session.pendingInterventions.splice(index, 1);
  if (session.pendingInterventions.length === 0 && session.status === "needs_intervention") {
    session.status = "running";
    const turn = session.turns[session.turns.length - 1];
    if (turn && turn.status === "needs_intervention") turn.status = "running";
  }
  const intBlock = session.turns
    .flatMap((t) => t.blocks)
    .find((b) => b.kind === "intervention" && b.meta?.interventionId === intervention.id);
  if (intBlock) {
    intBlock.status = decision === "decline" || decision === "cancel" ? "interrupted" : "completed";
    intBlock.meta = { ...(intBlock.meta ?? {}), resolution: decision ?? (answers ? "answers" : "text") };
    intBlock.updatedAt = new Date().toISOString();
    pushDelta(
      session,
      {
        kind: "block.status",
        turnIndex: intBlock.turnIndex,
        blockId: intBlock.id,
        status: intBlock.status,
        meta: intBlock.meta,
        updatedAt: intBlock.updatedAt
      },
      true
    );
  }
  pushDelta(
    session,
    { kind: "interventions.set", items: session.pendingInterventions.map((item) => ({ ...item })) },
    true
  );
  pushDelta(session, { kind: "session.status", summary: toRailSummary(session) }, true);
  recordEvent(
    session,
    "intervention.resolved",
    `已处理干预 ${intervention.id} (${intervention.method}): ${decision ?? (answers ? "answers" : "text")}`,
    {
      interventionId: intervention.id,
      method: intervention.method,
      ...(decision ? { decision } : {})
    }
  );

  return {
    resolved: true,
    interventionId: intervention.id,
    ...(degradedMode ? { degradedMode } : {}),
    ...(degradedReason ? { degradedReason } : {}),
    ...toSummary(session)
  };
}

async function handleStop(
  input: Record<string, unknown>,
  callContext: PluginServiceContext
): Promise<Record<string, unknown>> {
  const cliSessionId = asNonEmptyString(input.cliSessionId);
  if (!cliSessionId) throw new Error("cliSessionId is required.");
  const session = requireActiveOrPromotedSession(cliSessionId, false);
  const mode: CliStopMode = input.mode === "kill" ? "kill" : "interrupt";
  const forceAfterMs = asBoundedInt(input.forceAfterMs, 5_000, 500, 30_000);

  if (session.executionSettled || isTerminalCliStatus(session.status)) {
    return {
      stopped: true,
      stopMode: mode,
      alreadySettled: true,
      ...toSummary(session)
    };
  }

  if (session.queue.length > 0) {
    session.queuePaused = true;
    pushDelta(session, { kind: "queue.set", queue: [...session.queue], paused: true }, true);
  }

  if (mode === "interrupt") {
    if (session.engine === "codex" && session.codexHost && session.mode === "interactive") {
      if (!session.externalSessionId || !session.activeTurnId) {
        return {
          stopped: true,
          stopMode: "interrupt",
          note: "Codex session has no active turn; process remains idle and reusable.",
          ...toSummary(session)
        };
      }
      session.status = "interrupting";
      await session.codexHost.interruptTurn(callContext, session.externalSessionId, session.activeTurnId);
      const observed = await waitForSession(session, {
        until: "turn_or_intervention",
        afterSeq: session.nextSeq - 1,
        timeoutMs: forceAfterMs,
        eventLimit: 20,
        signal: callContext.signal
      });
      const currentStatus = toSummary(session).status;
      const interrupted = currentStatus === "idle" || isTerminalCliStatus(currentStatus);
      return {
        stopped: interrupted,
        stopMode: "interrupt",
        ...observed,
        ...(interrupted ? {} : { nextAction: "Turn did not confirm interrupt within grace window; call stop with mode='kill' if immediate termination is needed." })
      };
    }

    if (session.engine === "claude" && session.claudeSession && session.mode === "interactive") {
      if (session.status === "idle") {
        await session.claudeSession.stop();
        const observed = await waitForSession(session, {
          until: "settled",
          afterSeq: session.nextSeq - 1,
          timeoutMs: forceAfterMs,
          eventLimit: 20,
          signal: callContext.signal
        });
        return { stopped: session.executionSettled, stopMode: "interrupt", ...observed };
      }
      session.status = "interrupting";
      await session.claudeSession.interrupt();
      const observed = await waitForSession(session, {
        until: "turn_or_intervention",
        afterSeq: session.nextSeq - 1,
        timeoutMs: forceAfterMs,
        eventLimit: 20,
        signal: callContext.signal
      });
      const currentStatus = toSummary(session).status;
      const interrupted = currentStatus === "idle" || isTerminalCliStatus(currentStatus);
      return {
        stopped: interrupted,
        stopMode: "interrupt",
        ...observed,
        ...(interrupted ? {} : { nextAction: "Claude turn did not confirm soft interrupt within grace window; call stop with mode='kill'." })
      };
    }

    if (session.acpSession && session.mode === "interactive") {
      if (session.status === "idle") {
        return { stopped: true, stopMode: "interrupt", ...toSummary(session) };
      }
      session.status = "interrupting";
      await session.acpSession.cancelTurn(callContext);
      const observed = await waitForSession(session, {
        until: "turn_or_intervention",
        afterSeq: session.nextSeq - 1,
        timeoutMs: forceAfterMs,
        eventLimit: 20,
        signal: callContext.signal
      });
      const currentStatus = toSummary(session).status;
      return {
        stopped: currentStatus === "idle" || isTerminalCliStatus(currentStatus),
        stopMode: "interrupt",
        ...observed
      };
    }

    if (session.engine === "antigravity" && session.mode === "interactive") {
      if (session.status === "idle") {
        await callContext.process.end(session.processId).catch(() => undefined);
        const observed = await waitForSession(session, {
          until: "settled",
          afterSeq: session.nextSeq - 1,
          timeoutMs: forceAfterMs,
          eventLimit: 20,
          signal: callContext.signal
        });
        return { stopped: session.executionSettled, stopMode: "interrupt", interruptMethod: "stdin_eof", ...observed };
      }
      session.status = "interrupting";
      await callContext.process.end(session.processId).catch(() => undefined);
      const observed = await waitForSession(session, {
        until: "turn_or_intervention",
        afterSeq: session.nextSeq - 1,
        timeoutMs: forceAfterMs,
        eventLimit: 20,
        signal: callContext.signal
      });
      const currentStatus = toSummary(session).status;
      const interrupted = currentStatus === "idle" || isTerminalCliStatus(currentStatus);
      if (!interrupted && !session.executionSettled) {
        session.status = "running";
      }
      return {
        stopped: interrupted,
        stopMode: "interrupt",
        interruptMethod: "stdin_eof",
        ...(!interrupted
          ? {
              unsupported: true,
              capability: "softInterrupt",
              nextAction:
                "Antigravity CLI (agy) did not confirm soft interrupt via stdin EOF within grace window; call stop with mode='kill' (conversation remains resumable via --conversation on next steer)."
            }
          : {}),
        ...observed
      };
    }
  }

  // mode === "kill": explicitly purge subscriptions so caller-initiated kill produces zero ghost wakes.
  purgeSubscriptionsForSession(session.cliSessionId);

  if (session.codexHost) {
    const host = session.codexHost;
    session.codexHost = undefined;
    if (session.externalSessionId) {
      await host.unsubscribeThread(callContext, session.externalSessionId);
    }
    session.executionSettled = true;
    session.status = "stopped";
    session.endedAt = session.endedAt ?? new Date().toISOString();
    session.activeTurnId = undefined;
    session.pendingInterventions = [];
    const lastTurn = session.turns[session.turns.length - 1];
    if (lastTurn && (lastTurn.status === "running" || lastTurn.status === "needs_intervention")) {
      lastTurn.status = "interrupted";
      lastTurn.endedAt = session.endedAt;
      pushDelta(session, { kind: "turn.upsert", turn: projectTurnForWire(session, lastTurn) }, true);
    }
    // If no other Codex threads remain on this shared host, cleanly retire the shared process.
    await codexPool.stopHostIfIdle(host, callContext.process);
    pushDelta(session, { kind: "interventions.set", items: [] }, true);
    pushDelta(session, { kind: "session.status", summary: toRailSummary(session) }, true);
    recordEvent(session, "process.exited", "Codex thread closed and unsubscribed.", {
      stopMode: "kill",
      remainingSharedThreads: host.activeThreadCount
    });
    schedulePersist({ sessionId: session.cliSessionId });
    return { stopped: true, stopMode: "kill", ...toSummary(session) };
  }

  if (session.claudeSession) {
    const sdk = session.claudeSession;
    session.claudeSession = undefined;
    await sdk.stop();
    session.executionSettled = true;
    session.status = "stopped";
    session.endedAt = session.endedAt ?? new Date().toISOString();
    session.activeTurnId = undefined;
    session.pendingInterventions = [];
    pushDelta(session, { kind: "interventions.set", items: [] }, true);
    pushDelta(session, { kind: "session.status", summary: toRailSummary(session) }, true);
    recordEvent(session, "process.exited", "Claude SDK session terminated.", { stopMode: "kill" });
    schedulePersist({ sessionId: session.cliSessionId });
    return { stopped: true, stopMode: "kill", ...toSummary(session) };
  }

  if (session.acpSession) {
    const acp = session.acpSession;
    session.acpSession = undefined;
    await acp.stop(callContext.process);
    session.executionSettled = true;
    session.status = "stopped";
    session.endedAt = session.endedAt ?? new Date().toISOString();
    session.activeTurnId = undefined;
    session.pendingInterventions = [];
    pushDelta(session, { kind: "interventions.set", items: [] }, true);
    pushDelta(session, { kind: "session.status", summary: toRailSummary(session) }, true);
    recordEvent(session, "process.exited", `${session.engine} ACP session terminated.`, { stopMode: "kill" });
    schedulePersist({ sessionId: session.cliSessionId });
    return { stopped: true, stopMode: "kill", ...toSummary(session) };
  }

  const snapshot = await callContext.process.stop(session.processId);
  session.executionSettled = snapshot.executionSettled;
  session.status = "stopped";
  session.endedAt = session.endedAt ?? new Date().toISOString();
  session.exitCode = snapshot.exitCode;
  session.signal = snapshot.signal;
  session.activeTurnId = undefined;
  session.pendingInterventions = [];
  const lastTurn = session.turns[session.turns.length - 1];
  if (lastTurn && (lastTurn.status === "running" || lastTurn.status === "needs_intervention")) {
    lastTurn.status = "interrupted";
    lastTurn.endedAt = session.endedAt;
    pushDelta(session, { kind: "turn.upsert", turn: projectTurnForWire(session, lastTurn) }, true);
  }
  pushDelta(session, { kind: "interventions.set", items: [] }, true);
  pushDelta(session, { kind: "session.status", summary: toRailSummary(session) }, true);
  recordEvent(session, "process.exited", `External ${session.engine} process group killed.`, {
    stopMode: "kill",
    executionSettled: snapshot.executionSettled,
    ...(snapshot.exitCode !== undefined ? { exitCode: snapshot.exitCode } : {}),
    ...(snapshot.signal ? { signal: snapshot.signal } : {})
  });
  schedulePersist({ sessionId: session.cliSessionId });
  return { stopped: snapshot.executionSettled, stopMode: "kill", ...toSummary(session) };
}

// ============================================================================
// v0.5 / v0.7 View Actions: Queue, SetModes, Compact, Fork, Handoff, Undo, Native Import
// ============================================================================

async function handleQueueAction(
  payload: Record<string, unknown>,
  callContext: PluginServiceContext
): Promise<Record<string, unknown>> {
  const cliSessionId = asNonEmptyString(payload.cliSessionId);
  if (!cliSessionId) throw new Error("cliSessionId is required.");
  const session = requireActiveOrPromotedSession(cliSessionId, true);
  const action = asNonEmptyString(payload.action);

  switch (action) {
    case "add": {
      const message = asNonEmptyString(payload.message);
      if (!message) throw new Error("message is required.");
      const item: CliQueuedMessage = {
        id: `q_${randomUUID().slice(0, 8)}`,
        message,
        strategy: "next_turn",
        ...(asNonEmptyString(payload.model) ? { model: asNonEmptyString(payload.model) } : {}),
        ...(isCliReasoningEffort(payload.reasoningEffort) ? { reasoningEffort: payload.reasoningEffort } : {}),
        ...(isCliPermissionMode(payload.permissionMode) ? { permissionMode: payload.permissionMode } : {}),
        ...(isCliInteractionMode(payload.interactionMode) ? { interactionMode: payload.interactionMode } : {}),
        ...(isCliServiceTier(payload.serviceTier) ? { serviceTier: payload.serviceTier } : {}),
        ...(parseAttachments(payload.attachments) ? { attachments: parseAttachments(payload.attachments) } : {}),
        createdAt: new Date().toISOString()
      };
      session.queue.push(item);
      pushDelta(session, { kind: "queue.set", queue: [...session.queue], paused: session.queuePaused }, true);
      if (session.status === "idle" && !session.queuePaused) {
        scheduleQueueDrain(session);
      }
      return { queue: session.queue, paused: session.queuePaused };
    }
    case "edit": {
      const queueId = asNonEmptyString(payload.queueId);
      const message = asNonEmptyString(payload.message);
      if (!queueId || !message) throw new Error("queueId and message are required.");
      const item = session.queue.find((q) => q.id === queueId);
      if (!item) throw new Error(`Queued message not found: ${queueId}`);
      item.message = message;
      pushDelta(session, { kind: "queue.set", queue: [...session.queue], paused: session.queuePaused }, true);
      return { queue: session.queue, paused: session.queuePaused };
    }
    case "remove": {
      const queueId = asNonEmptyString(payload.queueId);
      if (!queueId) throw new Error("queueId is required.");
      session.queue = session.queue.filter((q) => q.id !== queueId);
      pushDelta(session, { kind: "queue.set", queue: [...session.queue], paused: session.queuePaused }, true);
      return { queue: session.queue, paused: session.queuePaused };
    }
    case "clear": {
      session.queue = [];
      session.queuePaused = false;
      pushDelta(session, { kind: "queue.set", queue: [], paused: false }, true);
      return { queue: [], paused: false };
    }
    case "resume": {
      session.queuePaused = false;
      pushDelta(session, { kind: "queue.set", queue: [...session.queue], paused: false }, true);
      if (session.status === "idle" && session.queue.length > 0) {
        scheduleQueueDrain(session);
      }
      return { queue: session.queue, paused: false };
    }
    case "promote": {
      const queueId = asNonEmptyString(payload.queueId);
      const idx = queueId ? session.queue.findIndex((q) => q.id === queueId) : 0;
      if (idx < 0 || !session.queue[idx]) throw new Error("No queued message available to promote.");
      const [item] = session.queue.splice(idx, 1);
      session.queuePaused = false;
      pushDelta(session, { kind: "queue.set", queue: [...session.queue], paused: false }, true);
      const result = await handleSteer(
        {
          cliSessionId,
          message: item!.message,
          strategy: "auto",
          ...(item!.model ? { model: item!.model } : {}),
          ...(item!.reasoningEffort ? { reasoningEffort: item!.reasoningEffort } : {}),
          ...(item!.permissionMode ? { permissionMode: item!.permissionMode } : {}),
          ...(item!.interactionMode ? { interactionMode: item!.interactionMode } : {}),
          ...(item!.serviceTier ? { serviceTier: item!.serviceTier } : {}),
          ...(item!.attachments ? { attachments: item!.attachments } : {}),
          _fromQueue: true
        },
        callContext
      );
      return { promoted: true, queue: session.queue, result };
    }
    default:
      throw new Error(`Unsupported queue action: ${action ?? "<missing>"}`);
  }
}

async function handleSetModes(
  payload: Record<string, unknown>,
  callContext: PluginServiceContext
): Promise<Record<string, unknown>> {
  const cliSessionId = asNonEmptyString(payload.cliSessionId);
  if (!cliSessionId) throw new Error("cliSessionId is required.");
  const session = requireActiveOrPromotedSession(cliSessionId, true);

  const permissionMode = isCliPermissionMode(payload.permissionMode) ? payload.permissionMode : undefined;
  const requestedInteractionMode = isCliInteractionMode(payload.interactionMode) ? payload.interactionMode : undefined;
  const requestedServiceTier = isCliServiceTier(payload.serviceTier) ? payload.serviceTier : undefined;
  const model = asNonEmptyString(payload.model);
  const requestedReasoningEffort = isCliReasoningEffort(payload.reasoningEffort) ? payload.reasoningEffort : undefined;

  const cap = ENGINE_CAPABILITIES[session.engine];
  const unsupportedOptions = evaluateUnsupportedRequestOptions(session.engine, {
    ...(requestedReasoningEffort ? { reasoningEffort: requestedReasoningEffort } : {}),
    ...(requestedServiceTier === "fast" ? { serviceTier: "fast" } : {}),
    ...(requestedInteractionMode === "plan" ? { interactionMode: "plan" } : {})
  });
  const interactionMode = cap.planMode ? requestedInteractionMode : requestedInteractionMode === "default" ? "default" : undefined;
  const serviceTier = cap.supportsFastMode ? requestedServiceTier : requestedServiceTier === "default" ? "default" : undefined;
  const reasoningEffort = cap.supportsReasoningEffort ? requestedReasoningEffort : undefined;

  if (permissionMode) session.permissionMode = permissionMode;
  if (interactionMode) session.interactionMode = interactionMode;
  if (serviceTier) session.serviceTier = serviceTier;
  if (model) {
    session.model = model;
    recordObservedModel(session.engine, model);
  }
  if (reasoningEffort) session.reasoningEffort = reasoningEffort;

  let appliedLive = false;
  if (session.codexHost && !session.codexHost.retired && session.externalSessionId) {
    if (serviceTier || model || reasoningEffort) {
      await session.codexHost
        .updateThreadSettings(callContext, session.externalSessionId, {
          ...(serviceTier ? { serviceTier } : {}),
          ...(model ? { model } : {}),
          ...(reasoningEffort ? { reasoningEffort } : {})
        })
        .then(() => {
          appliedLive = true;
        })
        .catch(() => undefined);
    } else {
      appliedLive = true;
    }
  } else if (session.claudeSession) {
    const res = await session.claudeSession.setLiveModes({
      ...(model ? { model } : {}),
      ...(reasoningEffort ? { reasoningEffort } : {}),
      ...(permissionMode ? { permissionMode } : {}),
      ...(interactionMode ? { interactionMode } : {})
    });
    appliedLive = res.appliedLive;
  } else if (session.acpSession && !session.acpSession.closed) {
    if (permissionMode) session.acpSession.setPermissionMode(permissionMode);
    if (model) await session.acpSession.setModel(callContext, model).catch(() => undefined);
    if (reasoningEffort) await session.acpSession.setReasoningEffort(callContext, reasoningEffort).catch(() => undefined);
    if (interactionMode) await session.acpSession.setMode(callContext, interactionMode).catch(() => undefined);
    appliedLive = true;
  }

  pushDelta(session, { kind: "session.status", summary: toRailSummary(session) }, true);
  schedulePersist({ sessionId: session.cliSessionId });
  return {
    appliedLive,
    ...(unsupportedOptions.length > 0 ? { unsupported: true, unsupportedOptions } : {}),
    summary: toSummary(session)
  };
}

async function handleCompact(
  payload: Record<string, unknown>,
  callContext: PluginServiceContext
): Promise<Record<string, unknown>> {
  const cliSessionId = asNonEmptyString(payload.cliSessionId);
  if (!cliSessionId) throw new Error("cliSessionId is required.");
  const session = requireActiveOrPromotedSession(cliSessionId, true);

  if (session.engine === "codex" && session.codexHost && session.externalSessionId) {
    await session.codexHost.compactThread(callContext, session.externalSessionId);
    recordEvent(session, "protocol.notice", "已触发 Codex 上下文压缩 (thread/compact/start)。");
    return { ok: true, mode: "codex.compact" };
  }
  if (session.engine === "claude" && session.claudeSession) {
    await handleSteer({ cliSessionId, message: "/compact", strategy: "queue" }, callContext);
    return { ok: true, mode: "claude.slash_compact" };
  }
  return {
    ok: false,
    unsupported: true,
    capability: "nativeCompact",
    reason: `${ENGINE_CAPABILITIES[session.engine].displayName} does not expose a native context compaction protocol.`,
    alternatives: ["handoff", "fork"],
    note: `${ENGINE_CAPABILITIES[session.engine].displayName} 当前暂不支持原生上下文压缩，可使用 handoff（跨引擎/同引擎交接）开启精简上下文新会话。`
  };
}

async function handleFork(
  payload: Record<string, unknown>,
  callContext: PluginServiceContext
): Promise<Record<string, unknown>> {
  const cliSessionId = asNonEmptyString(payload.cliSessionId);
  if (!cliSessionId) throw new Error("cliSessionId is required.");
  const source = requireActiveOrPromotedSession(cliSessionId, true);
  const atTurnIndex = asBoundedInt(payload.atTurnIndex, source.turns.length, 0, Math.max(0, source.turns.length));
  const copiedTurns = source.turns
    .filter((t) => t.turnIndex <= atTurnIndex)
    .map((t) => ({ ...t, blocks: t.blocks.map((b) => ({ ...b })) }));
  const lastCopiedTurn = copiedTurns[copiedTurns.length - 1];
  const label = asNonEmptyString(payload.label) ?? `${source.label ?? source.cliSessionId} · 分支`;
  const resolvedCwd = path.resolve(source.executionWorkspace, source.cwdRelative);

  const now = new Date().toISOString();
  const newId = `cli_${source.engine}_${randomUUID().slice(0, 10)}`;
  const forked: SessionRecord = {
    cliSessionId: newId,
    engine: source.engine,
    mode: "interactive",
    status: "idle",
    label,
    processId: "",
    executionWorkspace: source.executionWorkspace,
    cwdRelative: source.cwdRelative,
    isWorktree: source.isWorktree,
    ...(source.model ? { model: source.model } : {}),
    ...(source.reasoningEffort ? { reasoningEffort: source.reasoningEffort } : {}),
    ...(source.approvalPolicy ? { approvalPolicy: source.approvalPolicy } : {}),
    permissionMode: source.permissionMode,
    interactionMode: source.interactionMode,
    serviceTier: source.serviceTier,
    ...(source.sandbox ? { sandbox: source.sandbox } : {}),
    extraArgs: [...source.extraArgs],
    createdAt: now,
    updatedAt: now,
    executionSettled: true,
    truncatedLog: false,
    nextSeq: 1,
    completedTurns: copiedTurns.length,
    events: [],
    turns: copiedTurns,
    blockIndex: new Map(),
    blockFullText: new Map(),
    pendingInterventions: [],
    queue: [],
    queuePaused: false,
    currentTurnAssistantText: "",
    lastAssistantText: source.lastAssistantText,
    lastActivitySummary: `从 ${source.label ?? source.cliSessionId} (Turn #${atTurnIndex}) 分支`,
    forkedFromSessionId: source.cliSessionId,
    rawStdoutTail: "",
    rawStderrTail: "",
    stdoutLineBuffer: "",
    stderrLineBuffer: "",
    writeChain: Promise.resolve(),
    opChain: Promise.resolve(),
    waiters: new Set(),
    readerActive: false,
    pendingDeltas: [],
    recentDeltas: [],
    lastRailFingerprint: "",
    drainingQueue: false
  };

  let forkMode = "portable_handoff";

  if (source.engine === "codex" && source.externalSessionId) {
    try {
      const host = codexPool.getOrCreate(forked.executionWorkspace, forked.cwdRelative, forked.extraArgs);
      await host.ensureReady(callContext);
      const res = await host.forkThread(callContext, {
        threadId: source.externalSessionId,
        resolvedCwd,
        ...(lastCopiedTurn?.turnId ? { lastTurnId: lastCopiedTurn.turnId } : {}),
        ...(forked.model ? { model: forked.model } : {})
      });
      forked.codexHost = host;
      forked.processId = host.processId;
      forked.externalSessionId = res.threadId;
      forked.executionSettled = false;
      host.attachThread(res.threadId, {
        onActions: (actions, rawLine) => {
          if (rawLine) forked.rawStdoutTail = appendTail(forked.rawStdoutTail, `${rawLine}\n`);
          for (const action of actions) applyParsedAction(forked, action);
        },
        onStderr: (chunk) => processStderrLines(forked, chunk, false),
        onHostRetired: (reason, exitCode, signal) => {
          if (forked.codexHost === host) {
            forked.codexHost = undefined;
            handleExternalHostSettled(forked, reason, exitCode, signal);
          }
        }
      });
      forkMode = "codex.native_fork";
    } catch {
      // Fallback to portable handoff below.
    }
  } else if (source.engine === "claude" && source.externalSessionId) {
    sessions.set(newId, forked);
    try {
      await launchEngineProcess(forked, callContext, {
        resumeSessionId: source.externalSessionId,
        ...(lastCopiedTurn?.providerMessageId ? { resumeSessionAt: lastCopiedTurn.providerMessageId } : {}),
        forkSession: true,
        turnTrigger: "resume"
      });
      forkMode = "claude.native_fork";
    } catch {
      forked.executionSettled = true;
    }
  } else if (isAcpEngine(source.engine) && ENGINE_CAPABILITIES[source.engine].nativeFork && source.externalSessionId) {
    sessions.set(newId, forked);
    try {
      await launchEngineProcess(forked, callContext, {
        forkFromSessionId: source.externalSessionId,
        turnTrigger: "resume"
      });
      forkMode = `${source.engine}.native_fork`;
    } catch {
      forked.executionSettled = true;
    }
  }

  if (forkMode === "portable_handoff") {
    const bundle = buildPortableHandoff({
      sourceEngine: source.engine,
      sourceSessionId: source.cliSessionId,
      targetEngine: forked.engine,
      turns: copiedTurns
    });
    forked.pendingHandoffPrefix = bundle.summaryText;
  }

  sessions.set(newId, forked);
  focusedCliSessionId = newId;
  recordEvent(forked, "session.forked", `分支会话就绪 (${forkMode})`, {
    forkedFromSessionId: source.cliSessionId,
    atTurnIndex,
    forkMode
  });
  schedulePersist({ sessionId: newId });
  await callContext.events.emit("focus.changed", { focusedCliSessionId: newId }).catch(() => undefined);
  return { forkMode, ...toSummary(forked) };
}

async function handleHandoff(
  payload: Record<string, unknown>,
  callContext: PluginServiceContext
): Promise<Record<string, unknown>> {
  const cliSessionId = asNonEmptyString(payload.cliSessionId);
  if (!cliSessionId) throw new Error("cliSessionId is required.");
  const targetEngine = payload.targetEngine;
  if (!isCliEngine(targetEngine)) {
    throw new Error(`targetEngine must be one of: ${ALL_CLI_ENGINES.join(", ")}.`);
  }
  const source = requireActiveOrPromotedSession(cliSessionId, true);
  const prompt = asNonEmptyString(payload.prompt);
  const targetModel = asNonEmptyString(payload.targetModel) ?? enginePreferences[targetEngine]?.model;
  const reasoningEffort = isCliReasoningEffort(payload.reasoningEffort)
    ? payload.reasoningEffort
    : enginePreferences[targetEngine]?.reasoningEffort;
  const label =
    asNonEmptyString(payload.label) ??
    `${ENGINE_CAPABILITIES[targetEngine].displayName} ← ${source.label ?? ENGINE_CAPABILITIES[source.engine].displayName}`;

  const bundle = buildPortableHandoff({
    sourceEngine: source.engine,
    sourceSessionId: source.cliSessionId,
    targetEngine,
    turns: source.turns
  });

  const now = new Date().toISOString();
  const newId = `cli_${targetEngine}_${randomUUID().slice(0, 10)}`;
  const target: SessionRecord = {
    cliSessionId: newId,
    engine: targetEngine,
    mode: "interactive",
    status: "starting",
    label,
    processId: "",
    executionWorkspace: source.executionWorkspace,
    cwdRelative: source.cwdRelative,
    isWorktree: source.isWorktree,
    ...(targetModel ? { model: targetModel } : {}),
    ...(reasoningEffort ? { reasoningEffort } : {}),
    permissionMode: source.permissionMode,
    interactionMode: "default",
    serviceTier: enginePreferences[targetEngine]?.serviceTier ?? "default",
    extraArgs: [],
    createdAt: now,
    updatedAt: now,
    executionSettled: false,
    truncatedLog: false,
    nextSeq: 1,
    completedTurns: 0,
    events: [],
    turns: [],
    blockIndex: new Map(),
    blockFullText: new Map(),
    pendingInterventions: [],
    queue: [],
    queuePaused: false,
    currentTurnAssistantText: "",
    lastAssistantText: "",
    lastActivitySummary: `已从 ${ENGINE_CAPABILITIES[source.engine].displayName} 交接 ${bundle.includedTurns} 轮上下文`,
    forkedFromSessionId: source.cliSessionId,
    handoffFromEngine: source.engine,
    rawStdoutTail: "",
    rawStderrTail: "",
    stdoutLineBuffer: "",
    stderrLineBuffer: "",
    writeChain: Promise.resolve(),
    opChain: Promise.resolve(),
    waiters: new Set(),
    readerActive: false,
    pendingDeltas: [],
    recentDeltas: [],
    lastRailFingerprint: "",
    drainingQueue: false
  };
  sessions.set(newId, target);
  focusedCliSessionId = newId;

  let injectionMode: "codex.inject_items" | "inline_prefix" = "inline_prefix";

  if (targetEngine === "codex") {
    // Start blank Codex thread first, then inject structured history items natively.
    await launchEngineProcess(target, callContext, { turnTrigger: "handoff" });
    if (target.codexHost && target.externalSessionId) {
      const injected = await target.codexHost.injectItems(
        callContext,
        target.externalSessionId,
        bundle.codexInjectItems
      );
      if (injected) {
        injectionMode = "codex.inject_items";
      } else {
        target.pendingHandoffPrefix = bundle.summaryText;
      }
    }
    const noticeTurn = startTranscriptTurn(target, "handoff", "", {});
    noticeTurn.status = "completed";
    noticeTurn.endedAt = new Date().toISOString();
    noticeTurn.blocks.push({
      id: `blk_handoff_${randomUUID().slice(0, 6)}`,
      turnIndex: noticeTurn.turnIndex,
      kind: "notice",
      status: "completed",
      title: `跨引擎上下文交接 (${ENGINE_CAPABILITIES[source.engine].displayName} → Codex)`,
      text: `已无损交接 ${bundle.includedTurns} 轮上下文${bundle.omittedTurns > 0 ? `（按预算省略 ${bundle.omittedTurns} 轮早期历史）` : ""}，注入方式：${injectionMode === "codex.inject_items" ? "原生 thread/inject_items" : "首条消息结构化前缀"}。`,
      startedAt: now,
      updatedAt: now
    });
    pushDelta(target, { kind: "turn.upsert", turn: projectTurnForWire(target, noticeTurn) }, true);
    if (prompt) {
      await handleSteer({ cliSessionId: newId, message: prompt, strategy: "next_turn" }, callContext);
    }
  } else {
    target.pendingHandoffPrefix = bundle.summaryText;
    await launchEngineProcess(target, callContext, {
      ...(prompt ? { prompt } : {}),
      turnTrigger: "handoff"
    });
    if (!prompt) {
      const noticeTurn = startTranscriptTurn(target, "handoff", "", {});
      noticeTurn.status = "completed";
      noticeTurn.endedAt = new Date().toISOString();
      noticeTurn.blocks.push({
        id: `blk_handoff_${randomUUID().slice(0, 6)}`,
        turnIndex: noticeTurn.turnIndex,
        kind: "notice",
        status: "completed",
        title: `跨引擎上下文交接 (${ENGINE_CAPABILITIES[source.engine].displayName} → ${ENGINE_CAPABILITIES[targetEngine].displayName})`,
        text: `已打包 ${bundle.includedTurns} 轮上下文，将在您发送下一条指令时自动无损注入。`,
        startedAt: now,
        updatedAt: now
      });
      pushDelta(target, { kind: "turn.upsert", turn: projectTurnForWire(target, noticeTurn) }, true);
    }
  }

  recordEvent(target, "session.handoff", `跨引擎交接完成 (${source.engine} → ${targetEngine}, ${bundle.includedTurns} 轮)`, {
    sourceSessionId: source.cliSessionId,
    sourceEngine: source.engine,
    targetEngine,
    injectionMode,
    includedTurns: bundle.includedTurns,
    omittedTurns: bundle.omittedTurns
  });
  schedulePersist({ sessionId: newId });
  await callContext.events.emit("focus.changed", { focusedCliSessionId: newId }).catch(() => undefined);
  return {
    injectionMode,
    includedTurns: bundle.includedTurns,
    omittedTurns: bundle.omittedTurns,
    ...toSummary(target)
  };
}

async function handleUndoTurn(
  payload: Record<string, unknown>,
  callContext: PluginServiceContext
): Promise<Record<string, unknown>> {
  const cliSessionId = asNonEmptyString(payload.cliSessionId);
  if (!cliSessionId) throw new Error("cliSessionId is required.");
  const session = requireActiveOrPromotedSession(cliSessionId, true);
  if (session.turns.length === 0) {
    throw new Error("当前会话没有可撤回的轮次。");
  }
  const targetTurnIndex = asBoundedInt(
    payload.turnIndex,
    session.turns[session.turns.length - 1]!.turnIndex,
    1,
    session.turns[session.turns.length - 1]!.turnIndex
  );
  const revertFiles = payload.revertFiles === true;
  const forceRevertFiles = payload.forceRevertFiles === true;
  const targetTurn = session.turns.find((t) => t.turnIndex === targetTurnIndex);
  if (!targetTurn) {
    throw new Error(`未找到 Turn #${targetTurnIndex}。`);
  }

  if (revertFiles && !session.isWorktree && !forceRevertFiles) {
    throw new Error(
      "安全护栏：当前会话运行在主工作区（非独立 worktree）。如需同步回滚磁盘文件，请显式确认强制回滚（forceRevertFiles=true），或仅撤回对话上下文。"
    );
  }

  let filesReverted = false;
  if (revertFiles) {
    if (!targetTurn.checkpoint?.beforeRef) {
      throw new Error(`Turn #${targetTurnIndex} 未捕获到 Git 检查点，无法回滚磁盘文件。`);
    }
    const resolvedCwd = path.resolve(session.executionWorkspace, session.cwdRelative);
    const restored = await restoreHiddenGitCheckpoint(
      callContext.process,
      resolvedCwd,
      targetTurn.checkpoint.beforeRef
    );
    if (!restored.ok) {
      throw new Error(restored.error ?? "恢复 Git 检查点失败。");
    }
    filesReverted = true;
  }

  let providerReverted = false;
  if (session.engine === "codex" && session.codexHost && session.externalSessionId && targetTurn.turnId) {
    providerReverted = await session.codexHost.revertThread(
      callContext,
      session.externalSessionId,
      targetTurn.turnId
    );
  }

  const keptTurns = session.turns.filter((t) => t.turnIndex < targetTurnIndex);
  const prevTurn = keptTurns[keptTurns.length - 1];
  session.turns = keptTurns;
  session.completedTurns = keptTurns.length;
  session.blockIndex.clear();
  session.lastAssistantText =
    prevTurn?.blocks.filter((b) => b.kind === "assistant").map((b) => b.text).join("\n") ?? "";

  if (session.engine === "claude" && session.externalSessionId && prevTurn?.providerMessageId) {
    await launchEngineProcess(session, callContext, {
      resumeSessionId: session.externalSessionId,
      resumeSessionAt: prevTurn.providerMessageId,
      turnTrigger: "resume"
    }).catch(() => undefined);
    providerReverted = true;
  }

  recordEvent(
    session,
    "turn.undone",
    `已撤回至 Turn #${Math.max(0, targetTurnIndex - 1)}${filesReverted ? "（并还原磁盘文件）" : ""}`,
    { undoneFromTurnIndex: targetTurnIndex, filesReverted, providerReverted }
  );
  schedulePersist({ sessionId: session.cliSessionId });
  const rollbackStrategy = providerReverted
    ? filesReverted
      ? "native_provider_and_git_checkpoint"
      : "native_provider"
    : filesReverted
      ? "cotree_git_checkpoint"
      : "context_only";
  return {
    undone: true,
    undoneFromTurnIndex: targetTurnIndex,
    remainingTurns: session.turns.length,
    filesReverted,
    providerReverted,
    nativeRollbackSupported: ENGINE_CAPABILITIES[session.engine].nativeRollback,
    rollbackStrategy,
    summary: toSummary(session)
  };
}

async function handleListNativeSessions(
  payload: Record<string, unknown>,
  callContext: PluginServiceContext
): Promise<Record<string, unknown>> {
  const targetEngine = isCliEngine(payload.engine) ? payload.engine : undefined;
  const limit = asBoundedInt(payload.limit, 25, 1, 100);
  const entries: CliNativeSessionEntry[] = [];

  if (!targetEngine || targetEngine === "codex") {
    let host = codexPool.findWarmHost(callContext.workspace) ?? codexPool.findWarmHost();
    let ephemeral = false;
    if (!host) {
      host = codexPool.getOrCreate(callContext.workspace, ".", []);
      ephemeral = true;
    }
    try {
      await host.ensureReady(callContext);
      const codexThreads = await host.listNativeThreads(callContext, limit);
      entries.push(...codexThreads);
    } catch {
      // Codex unavailable or thread/list unsupported.
    } finally {
      if (ephemeral && host.activeThreadCount === 0) {
        await codexPool.stopHostIfIdle(host, callContext.process).catch(() => undefined);
      }
    }
  }

  for (const session of sessions.values()) {
    if (session.acpSession && !session.acpSession.closed && (!targetEngine || targetEngine === session.engine)) {
      const acpList = await session.acpSession.listSessions(callContext);
      entries.push(...acpList);
    }
  }

  // Deduplicate by (engine, externalSessionId)
  const seen = new Set<string>();
  const deduped = entries.filter((e) => {
    const k = `${e.engine}:${e.externalSessionId}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return { sessions: deduped };
}

async function handleImportNativeSession(
  payload: Record<string, unknown>,
  callContext: PluginServiceContext,
  caller?: CallerMetadata
): Promise<Record<string, unknown>> {
  const engine = payload.engine;
  if (!isCliEngine(engine)) throw new Error("Valid engine is required.");
  const externalSessionId = asNonEmptyString(payload.externalSessionId);
  if (!externalSessionId) throw new Error("externalSessionId is required.");

  // Reuse if already tracked
  for (const existing of sessions.values()) {
    if (existing.engine === engine && existing.externalSessionId === externalSessionId) {
      focusedCliSessionId = existing.cliSessionId;
      await callContext.events.emit("focus.changed", { focusedCliSessionId: existing.cliSessionId }).catch(() => undefined);
      return { imported: false, alreadyTracked: true, ...toSummary(existing) };
    }
  }

  const label = asNonEmptyString(payload.title) ?? `${ENGINE_CAPABILITIES[engine].displayName} ${externalSessionId.slice(0, 8)}`;
  const model = asNonEmptyString(payload.model);
  const autoResume = payload.autoResume !== false;

  if (autoResume) {
    const started = await handleStart(
      {
        engine,
        mode: "interactive",
        resumeSessionId: externalSessionId,
        label,
        ...(model ? { model } : {})
      },
      caller ?? { workspace: callContext.workspace },
      callContext,
      { allowEmptyPrompt: true, autoFocus: true }
    );
    const id = asNonEmptyString(started.cliSessionId);
    if (id) {
      await callContext.events.emit("focus.changed", { focusedCliSessionId: id }).catch(() => undefined);
    }
    return { imported: true, ...started };
  }

  const now = new Date().toISOString();
  const id = `cli_${engine}_${randomUUID().slice(0, 10)}`;
  const record: CliPersistedSessionRecord = {
    cliSessionId: id,
    engine,
    mode: "interactive",
    status: "exited",
    label,
    executionWorkspace: callContext.workspace,
    cwdRelative: ".",
    isWorktree: false,
    externalSessionId,
    ...(model ? { model } : {}),
    permissionMode: enginePreferences[engine]?.permissionMode ?? "supervised",
    interactionMode: "default",
    serviceTier: enginePreferences[engine]?.serviceTier ?? "default",
    createdAt: now,
    updatedAt: now,
    lastAssistantText: "",
    lastActivitySummary: `已导入原生 ${ENGINE_CAPABILITIES[engine].displayName} 会话 (${externalSessionId.slice(0, 10)})`,
    turns: []
  };
  historyRecords.set(id, record);
  focusedCliSessionId = id;
  schedulePersist({ sessionId: id });
  await callContext.events.emit("focus.changed", { focusedCliSessionId: id }).catch(() => undefined);
  return { imported: true, ...historyToSummary(record) };
}

async function handleDeleteSession(
  payload: Record<string, unknown>,
  callContext: PluginServiceContext
): Promise<Record<string, unknown>> {
  const cliSessionId = asNonEmptyString(payload.cliSessionId);
  if (!cliSessionId) throw new Error("cliSessionId is required.");

  const live = sessions.get(cliSessionId);
  const historical = historyRecords.get(cliSessionId);
  if (!live && !historical) {
    const fallbackFocus = focusedCliSessionId ?? listAllSessionSummaries()[0]?.cliSessionId ?? null;
    return {
      deleted: false,
      alreadyDeleted: true,
      cliSessionId,
      focusedCliSessionId: fallbackFocus
    };
  }

  // Mark deleted upfront to prevent late background reader / stop callbacks from
  // re-emitting rail.updated or re-persisting this session.
  deletedSessionIds.add(cliSessionId);
  purgeSubscriptionsForSession(cliSessionId);

  if (live) {
    if (live.emitTimer) {
      clearTimeout(live.emitTimer);
      live.emitTimer = undefined;
    }
    const needsKill =
      !live.executionSettled &&
      !isTerminalCliStatus(live.status) &&
      Boolean(live.codexHost || live.claudeSession || live.acpSession || live.processId);
    if (needsKill) {
      await handleStop({ cliSessionId, mode: "kill" }, callContext).catch(() => undefined);
    }
    if (live.emitTimer) {
      clearTimeout(live.emitTimer);
      live.emitTimer = undefined;
    }
    live.waiters.clear();
    sessions.delete(cliSessionId);
  }

  historyRecords.delete(cliSessionId);
  dirtySessionIds.delete(cliSessionId);

  const persistCtx = lifecycleContext ?? callContext;
  const sessionKey = `${CHECKPOINT_SESSION_PREFIX}${cliSessionId}`;
  try {
    await persistCtx.checkpoints?.delete?.(sessionKey);
  } catch {
    // Best-effort checkpoint key deletion; index flush below removes it from boot hydration.
  }
  checkpointRevisions.delete(sessionKey);
  dirtyIndex = true;
  await flushDirtyPersistence(persistCtx, false).catch(() => undefined);

  const remaining = listAllSessionSummaries();
  const focusChanged = focusedCliSessionId === cliSessionId;
  if (focusChanged) {
    focusedCliSessionId = remaining[0]?.cliSessionId;
  }
  const nextFocus = focusedCliSessionId ?? remaining[0]?.cliSessionId ?? null;

  const eventCtx = lifecycleContext ?? callContext;
  await eventCtx.events
    .emit(
      "session.deleted",
      toStrictJsonValue({
        cliSessionId,
        focusedCliSessionId: nextFocus
      })
    )
    .catch(() => undefined);
  if (focusChanged) {
    await eventCtx.events
      .emit("focus.changed", toStrictJsonValue({ focusedCliSessionId: nextFocus }))
      .catch(() => undefined);
  }

  return {
    deleted: true,
    cliSessionId,
    focusedCliSessionId: nextFocus,
    remainingCount: remaining.length
  };
}

// ============================================================================
// Transcript / Read Payloads with Windowing, Pagination & Delta Catch-up
// ============================================================================

function buildTranscriptPayload(
  cliSessionId: string,
  options: { includeRawTail?: boolean; limitTurns?: number } = {}
): CliSessionTranscript {
  const limitTurns = options.limitTurns ?? DEFAULT_TRANSCRIPT_TURN_WINDOW;
  const live = sessions.get(cliSessionId);
  if (live) {
    const total = live.turns.length;
    const startIdx = Math.max(0, total - limitTurns);
    const slice = live.turns.slice(startIdx).map((t) => projectTurnForWire(live, t));
    return {
      summary: toSummary(live),
      turns: slice,
      hasOlderTurns: startIdx > 0,
      ...(slice[0] ? { oldestTurnIndex: slice[0].turnIndex } : {}),
      queue: [...live.queue],
      events: live.events.slice(-150),
      ...(options.includeRawTail
        ? { rawTail: { stdout: live.rawStdoutTail, stderr: live.rawStderrTail } }
        : {})
    };
  }
  const historical = historyRecords.get(cliSessionId);
  if (historical) {
    const total = historical.turns.length;
    const startIdx = Math.max(0, total - limitTurns);
    const slice = historical.turns.slice(startIdx).map((t) => projectTurnForWire(undefined, t));
    return {
      summary: historyToSummary(historical),
      turns: slice,
      hasOlderTurns: startIdx > 0,
      ...(slice[0] ? { oldestTurnIndex: slice[0].turnIndex } : {}),
      queue: [],
      events: []
    };
  }
  throw new Error(`Managed CLI session not found: ${cliSessionId}`);
}

function handleRead(input: Record<string, unknown>): Record<string, unknown> {
  const cliSessionId = asNonEmptyString(input.cliSessionId);
  if (!cliSessionId) {
    return {
      focusedCliSessionId: focusedCliSessionId ?? listAllSessionSummaries()[0]?.cliSessionId ?? null,
      sessions: listAllSessionSummaries()
    };
  }
  const live = sessions.get(cliSessionId);
  const includeTranscript = input.includeTranscript === true;
  const includeRawTail = input.includeRawTail === true;

  if (!live) {
    const historical = historyRecords.get(cliSessionId);
    if (!historical) throw new Error(`Managed CLI session not found: ${cliSessionId}`);
    return {
      ...historyToSummary(historical),
      afterSeq: 0,
      nextSeq: 0,
      hasMore: false,
      events: [],
      ...(includeTranscript ? { turns: historical.turns } : {})
    };
  }

  const afterSeq = asBoundedInt(input.afterSeq, 0, 0, Number.MAX_SAFE_INTEGER);
  const limit = asBoundedInt(input.limit, 50, 1, 200);
  const events = live.events.filter((item) => item.seq > afterSeq).slice(0, limit);
  const nextSeq = events.length > 0 ? events[events.length - 1]!.seq : afterSeq;
  return {
    ...toSummary(live),
    afterSeq,
    nextSeq,
    hasMore: live.events.some((item) => item.seq > nextSeq),
    events,
    ...(includeTranscript ? { turns: live.turns } : {}),
    ...(includeRawTail
      ? { rawTail: { stdout: live.rawStdoutTail, stderr: live.rawStderrTail } }
      : {})
  };
}

// ============================================================================
// Hydration Helpers
// ============================================================================

function normalizeLoadedSessionRecord(
  entry: Record<string, unknown>,
  fallbackWorkspace: string
): CliPersistedSessionRecord | undefined {
  const id = asNonEmptyString(entry.cliSessionId);
  if (!id || !isCliEngine(entry.engine)) return undefined;
  return {
    cliSessionId: id,
    engine: entry.engine,
    mode: entry.mode === "oneshot" ? "oneshot" : "interactive",
    status: isTerminalCliStatus(entry.status as CliSessionStatus)
      ? (entry.status as CliSessionStatus)
      : "exited",
    ...(asNonEmptyString(entry.label) ? { label: asNonEmptyString(entry.label) } : {}),
    executionWorkspace: asNonEmptyString(entry.executionWorkspace) ?? fallbackWorkspace,
    cwdRelative: asNonEmptyString(entry.cwdRelative) ?? ".",
    isWorktree: entry.isWorktree === true,
    ...(asNonEmptyString(entry.ownerSessionId) ? { ownerSessionId: asNonEmptyString(entry.ownerSessionId) } : {}),
    ...(asNonEmptyString(entry.ownerRunId) ? { ownerRunId: asNonEmptyString(entry.ownerRunId) } : {}),
    ...(asNonEmptyString(entry.ownerAgentId) ? { ownerAgentId: asNonEmptyString(entry.ownerAgentId) } : {}),
    ...(asNonEmptyString(entry.externalSessionId) ? { externalSessionId: asNonEmptyString(entry.externalSessionId) } : {}),
    ...(asNonEmptyString(entry.model) ? { model: asNonEmptyString(entry.model) } : {}),
    ...(asNonEmptyString(entry.reasoningEffort) ? { reasoningEffort: asNonEmptyString(entry.reasoningEffort) } : {}),
    ...(asNonEmptyString(entry.approvalPolicy) ? { approvalPolicy: asNonEmptyString(entry.approvalPolicy) } : {}),
    permissionMode: isCliPermissionMode(entry.permissionMode)
      ? entry.permissionMode
      : mapApprovalPolicyToPermissionMode(asNonEmptyString(entry.approvalPolicy)),
    interactionMode: isCliInteractionMode(entry.interactionMode) ? entry.interactionMode : "default",
    serviceTier: isCliServiceTier(entry.serviceTier) ? entry.serviceTier : "default",
    ...(asNonEmptyString(entry.sandbox) ? { sandbox: asNonEmptyString(entry.sandbox) } : {}),
    ...(Array.isArray(entry.extraArgs)
      ? { extraArgs: entry.extraArgs.filter((v): v is string => typeof v === "string") }
      : {}),
    createdAt: asNonEmptyString(entry.createdAt) ?? new Date().toISOString(),
    updatedAt: asNonEmptyString(entry.updatedAt) ?? new Date().toISOString(),
    ...(asNonEmptyString(entry.endedAt) ? { endedAt: asNonEmptyString(entry.endedAt) } : {}),
    ...(typeof entry.exitCode === "number" ? { exitCode: entry.exitCode } : {}),
    ...(asNonEmptyString(entry.signal) ? { signal: asNonEmptyString(entry.signal) } : {}),
    lastAssistantText: typeof entry.lastAssistantText === "string" ? entry.lastAssistantText : "",
    lastActivitySummary: typeof entry.lastActivitySummary === "string" ? entry.lastActivitySummary : "历史托管会话",
    ...(asNonEmptyString(entry.lastError) ? { lastError: stripAnsi(asNonEmptyString(entry.lastError)!) } : {}),
    ...(entry.totalUsage && typeof entry.totalUsage === "object" && !Array.isArray(entry.totalUsage)
      ? { totalUsage: entry.totalUsage as Record<string, unknown> }
      : {}),
    ...(entry.contextUsage && typeof entry.contextUsage === "object" && !Array.isArray(entry.contextUsage)
      ? { contextUsage: entry.contextUsage as CliContextUsage }
      : {}),
    ...(typeof entry.totalCostUsd === "number" ? { totalCostUsd: entry.totalCostUsd } : {}),
    ...(asNonEmptyString(entry.forkedFromSessionId)
      ? { forkedFromSessionId: asNonEmptyString(entry.forkedFromSessionId) }
      : {}),
    ...(isCliEngine(entry.handoffFromEngine) ? { handoffFromEngine: entry.handoffFromEngine } : {}),
    turns: Array.isArray(entry.turns) ? sanitizePersistedTurns(entry.turns as CliTranscriptTurn[]) : []
  };
}

function loadPreferencesFromRecord(rawPrefs: Record<string, unknown>): Partial<Record<CliEngine, CliEnginePreference>> {
  const out: Partial<Record<CliEngine, CliEnginePreference>> = {};
  for (const engine of ALL_CLI_ENGINES) {
    const entry = asObject(rawPrefs[engine]);
    const model = asNonEmptyString(entry.model);
    const reasoningEffort = isCliReasoningEffort(entry.reasoningEffort) ? entry.reasoningEffort : undefined;
    const permissionMode = isCliPermissionMode(entry.permissionMode) ? entry.permissionMode : undefined;
    const serviceTier = isCliServiceTier(entry.serviceTier) ? entry.serviceTier : undefined;
    const followUpMode = entry.followUpMode === "steer" || entry.followUpMode === "queue" ? entry.followUpMode : undefined;
    const command = engine === "acp" ? asNonEmptyString(entry.command) : undefined;
    if (model || reasoningEffort || permissionMode || serviceTier || followUpMode || command) {
      out[engine] = {
        ...(model ? { model } : {}),
        ...(reasoningEffort ? { reasoningEffort } : {}),
        ...(permissionMode ? { permissionMode } : {}),
        ...(serviceTier ? { serviceTier } : {}),
        ...(followUpMode ? { followUpMode } : {}),
        ...(command ? { command } : {})
      };
    }
  }
  return out;
}

// ============================================================================
// Service Definition
// ============================================================================

export default defineService({
  async start(context) {
    lifecycleContext = context;
    await refreshRuntimeSettings(context);
    try {
      const cp = context.checkpoints;
      if (cp) {
        const indexCp = await cp.get(CHECKPOINT_INDEX_KEY);
        if (indexCp) {
          checkpointRevisions.set(CHECKPOINT_INDEX_KEY, indexCp.revision);
          const idxObj = asObject(indexCp.value);
          const ids = Array.isArray(idxObj.sessionIds)
            ? idxObj.sessionIds
                .filter((s): s is string => typeof s === "string")
                .slice(0, runtimeSettings.historyLimits.maxSessions)
            : [];
          const loaded = await Promise.all(ids.map((id) => cp.get(`${CHECKPOINT_SESSION_PREFIX}${id}`)));
          loaded.forEach((item, i) => {
            if (!item) return;
            const id = ids[i]!;
            checkpointRevisions.set(`${CHECKPOINT_SESSION_PREFIX}${id}`, item.revision);
            const normalized = normalizeLoadedSessionRecord(asObject(item.value), context.workspace);
            if (normalized) historyRecords.set(normalized.cliSessionId, normalized);
          });
        } else {
          // Transparent one-time migration from legacy v0.3 single-key checkpoint.
          const legacy = await cp.get();
          if (legacy) {
            const record = asObject(legacy.value);
            if (Array.isArray(record.sessions)) {
              for (const item of record.sessions) {
                const normalized = normalizeLoadedSessionRecord(asObject(item), context.workspace);
                if (normalized) {
                  historyRecords.set(normalized.cliSessionId, normalized);
                  dirtySessionIds.add(normalized.cliSessionId);
                }
              }
              dirtyIndex = true;
            }
            if (record.enginePreferences) {
              enginePreferences = loadPreferencesFromRecord(asObject(record.enginePreferences));
              dirtyPrefs = true;
            }
          }
        }

        const prefsCp = await cp.get(CHECKPOINT_PREFS_KEY);
        if (prefsCp) {
          checkpointRevisions.set(CHECKPOINT_PREFS_KEY, prefsCp.revision);
          enginePreferences = loadPreferencesFromRecord(asObject(asObject(prefsCp.value).enginePreferences));
        }

        const providerCacheCp = await cp.get(CHECKPOINT_PROVIDER_CACHE_KEY);
        if (providerCacheCp) {
          checkpointRevisions.set(CHECKPOINT_PROVIDER_CACHE_KEY, providerCacheCp.revision);
          const rawEngines = asObject(asObject(providerCacheCp.value).engines);
          if (Object.keys(rawEngines).length > 0) {
            cachedEngineSnapshot = rawEngines as Record<string, Record<string, unknown>>;
            cachedEngineHydratedFromDisk = true;
            for (const engine of ALL_CLI_ENGINES) {
              const cat = asObject(rawEngines[engine]).modelCatalog as CliEngineModelCatalog | undefined;
              if (cat && Array.isArray(cat.models)) {
                modelCatalogCache.set(engine, { expiresAt: Date.now() + 60_000, catalog: cat });
              }
            }
          }
        }
      }
    } catch {
      // Starting with empty history on first run is expected.
    }

    await context.events.emit("service.ready", {
      pluginId: PLUGIN_ID,
      version: PLUGIN_VERSION,
      controlWorkspace: context.workspace
    });
  },

  async call(method, rawInput, context) {
    const payload = asObject(rawInput);

    if (method === "tool") {
      const toolName = asNonEmptyString(payload.toolName);
      const toolInput = asObject(payload.input);
      const ctxRecord = asObject(payload.context);
      const caller: CallerMetadata = {
        workspace: asNonEmptyString(ctxRecord.workspace) ?? context.workspace,
        ...(asNonEmptyString(ctxRecord.runId) ? { runId: asNonEmptyString(ctxRecord.runId) } : {}),
        ...(asNonEmptyString(ctxRecord.agentId) ? { agentId: asNonEmptyString(ctxRecord.agentId) } : {}),
        ...(asNonEmptyString(ctxRecord.sessionId) ? { sessionId: asNonEmptyString(ctxRecord.sessionId) } : {}),
        ...(asNonEmptyString(ctxRecord.toolCallId) ? { toolCallId: asNonEmptyString(ctxRecord.toolCallId) } : {})
      };

      try {
        let output: Record<string, unknown>;
        switch (toolName) {
          case "inspect":
            output = await handleInspect(toolInput, context, { allowStale: false });
            break;
          case "start":
            output = await handleStart(toolInput, caller, context);
            break;
          case "wait":
            output = await handleWait(toolInput, caller, context);
            break;
          case "steer":
            output = await handleSteer(toolInput, context);
            break;
          case "respond":
            output = await handleRespond(toolInput, context);
            break;
          case "stop":
            output = await handleStop(toolInput, context);
            break;
          case "read":
            output = handleRead(toolInput);
            break;
          case "handoff":
            output = await handleHandoff(toolInput, context);
            break;
          case "fork":
            output = await handleFork(toolInput, context);
            break;
          case "compact":
            output = await handleCompact(toolInput, context);
            break;
          case "undoTurn":
            output = await handleUndoTurn(toolInput, context);
            break;
          case "queue":
            output = await handleQueueAction(toolInput, context);
            break;
          case "listNativeSessions":
            output = await handleListNativeSessions(toolInput, context);
            break;
          case "importNative":
            output = await handleImportNativeSession(toolInput, context, caller);
            break;
          default:
            return makeToolError("EXTERNAL_CLI_TOOL_UNSUPPORTED", `Unsupported tool name: ${toolName ?? "<missing>"}`, false);
        }
        return toStrictJsonValue({ ok: true, output });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return makeToolError("EXTERNAL_CLI_OPERATION_FAILED", message, true);
      }
    }

    // Direct Custom View RPC methods (Sidecar + Primary Transcript Surface)
    switch (method) {
      case "view.inspect":
        return toStrictJsonValue(
          await handleInspect({ ...payload, includeHistory: true }, context, {
            allowStale: payload.refreshModels !== true
          })
        );
      case "view.models": {
        const targetEngine = isCliEngine(payload.engine) ? payload.engine : undefined;
        const engines = await inspectEngines(context, {
          includeModels: true,
          refreshModels: payload.refresh === true,
          allowStale: false,
          ...(targetEngine ? { targetEngine } : {})
        });
        return toStrictJsonValue({ engines, enginePreferences });
      }
      case "view.setPreference": {
        if (!isCliEngine(payload.engine)) {
          throw new Error(`engine must be one of: ${ALL_CLI_ENGINES.join(", ")}.`);
        }
        const model = asNonEmptyString(payload.model);
        const reasoningEffort = isCliReasoningEffort(payload.reasoningEffort) ? payload.reasoningEffort : undefined;
        const permissionMode = isCliPermissionMode(payload.permissionMode) ? payload.permissionMode : undefined;
        const serviceTier = isCliServiceTier(payload.serviceTier) ? payload.serviceTier : undefined;
        const followUpMode =
          payload.followUpMode === "steer" || payload.followUpMode === "queue"
            ? payload.followUpMode
            : undefined;
        const command = payload.engine === "acp" ? asNonEmptyString(payload.command) : undefined;
        if (command) {
          await refreshRuntimeSettings(context);
          resolveAcpCommandExecutable(command, {
            customCliAllowlist: runtimeSettings.customCliAllowlist
          });
        }
        if (!model && !reasoningEffort && !permissionMode && !serviceTier && !followUpMode && !command) {
          const next = { ...enginePreferences };
          delete next[payload.engine];
          enginePreferences = next;
        } else {
          enginePreferences = {
            ...enginePreferences,
            [payload.engine]: {
              ...(model ? { model } : {}),
              ...(reasoningEffort ? { reasoningEffort } : {}),
              ...(permissionMode ? { permissionMode } : {}),
              ...(serviceTier ? { serviceTier } : {}),
              ...(followUpMode ? { followUpMode } : {}),
              ...(command ? { command } : {})
            }
          };
        }
        schedulePersist({ prefs: true });
        await context.events.emit("preferences.updated", toStrictJsonValue({ enginePreferences })).catch(() => undefined);
        return toStrictJsonValue({ enginePreferences });
      }
      case "view.list":
        return toStrictJsonValue(handleRead({}));
      case "view.read":
        return toStrictJsonValue(handleRead(payload));
      case "view.focus": {
        const targetId = asNonEmptyString(payload.cliSessionId);
        if (targetId && (sessions.has(targetId) || historyRecords.has(targetId))) {
          focusedCliSessionId = targetId;
          lastExplicitFocusAt = Date.now();
          await context.events.emit("focus.changed", { focusedCliSessionId: targetId, explicit: true }).catch(() => undefined);
        }
        return toStrictJsonValue({ focusedCliSessionId: focusedCliSessionId ?? null });
      }
      case "view.transcript": {
        const all = listAllSessionSummaries();
        const engines = await inspectEngines(context, {
          includeModels: true,
          refreshModels: payload.refreshModels === true,
          allowStale: payload.refreshModels !== true
        });
        const requestedId = asNonEmptyString(payload.cliSessionId) ?? focusedCliSessionId ?? all[0]?.cliSessionId;
        if (requestedId && (sessions.has(requestedId) || historyRecords.has(requestedId))) {
          const changedFocus = focusedCliSessionId !== requestedId;
          focusedCliSessionId = requestedId;
          if (payload.focus === true && changedFocus) {
            await context.events.emit("focus.changed", { focusedCliSessionId: requestedId }).catch(() => undefined);
          }
        }

        const afterSeq = asNumber(payload.afterSeq);
        const liveSession = requestedId ? sessions.get(requestedId) : undefined;
        if (
          afterSeq !== undefined &&
          afterSeq > 0 &&
          liveSession &&
          liveSession.recentDeltas.length > 0 &&
          liveSession.recentDeltas[0]!.seq <= afterSeq + 1
        ) {
          // Fast incremental catch-up on warm session switch!
          const missed = liveSession.recentDeltas.filter((d) => d.seq > afterSeq).map((d) => d.delta);
          return toStrictJsonValue({
            controlWorkspace: lifecycleContext?.workspace ?? context.workspace,
            focusedCliSessionId: focusedCliSessionId ?? null,
            engines,
            enginePreferences,
            pluginSlashCommands: PLUGIN_SLASH_COMMANDS,
            sessions: all,
            incremental: true,
            latestSeq: liveSession.nextSeq - 1,
            summary: toSummary(liveSession),
            deltas: missed
          });
        }

        const includeRawTail = payload.includeRawTail === true;
        const limitTurns = asBoundedInt(payload.limitTurns, DEFAULT_TRANSCRIPT_TURN_WINDOW, 1, 200);
        const transcript =
          requestedId && (sessions.has(requestedId) || historyRecords.has(requestedId))
            ? buildTranscriptPayload(requestedId, { includeRawTail, limitTurns })
            : null;
        return toStrictJsonValue({
          controlWorkspace: lifecycleContext?.workspace ?? context.workspace,
          focusedCliSessionId: focusedCliSessionId ?? null,
          engines,
          enginePreferences,
          pluginSlashCommands: PLUGIN_SLASH_COMMANDS,
          sessions: all,
          transcript
        });
      }
      case "view.transcriptPage": {
        const cliSessionId = asNonEmptyString(payload.cliSessionId);
        if (!cliSessionId) throw new Error("cliSessionId is required.");
        const beforeTurnIndex = asBoundedInt(payload.beforeTurnIndex, Number.MAX_SAFE_INTEGER, 1, Number.MAX_SAFE_INTEGER);
        const limit = asBoundedInt(payload.limit, DEFAULT_TRANSCRIPT_TURN_WINDOW, 1, 100);
        const live = sessions.get(cliSessionId);
        const allTurns = live?.turns ?? historyRecords.get(cliSessionId)?.turns;
        if (!allTurns) throw new Error(`Managed CLI session not found: ${cliSessionId}`);
        const older = allTurns.filter((t) => t.turnIndex < beforeTurnIndex);
        const slice = older.slice(-limit).map((t) => projectTurnForWire(live, t));
        return toStrictJsonValue({
          cliSessionId,
          turns: slice,
          hasOlderTurns: older.length > slice.length,
          ...(slice[0] ? { oldestTurnIndex: slice[0].turnIndex } : {})
        });
      }
      case "view.blockDetail": {
        const cliSessionId = asNonEmptyString(payload.cliSessionId);
        const blockId = asNonEmptyString(payload.blockId);
        if (!cliSessionId || !blockId) throw new Error("cliSessionId and blockId are required.");
        const live = sessions.get(cliSessionId);
        if (live) {
          const full = live.blockFullText.get(blockId);
          if (full !== undefined) {
            return toStrictJsonValue({ cliSessionId, blockId, text: full, totalTextChars: full.length });
          }
          for (const turn of live.turns) {
            const blk = turn.blocks.find((b) => b.id === blockId);
            if (blk) {
              return toStrictJsonValue({ cliSessionId, blockId, text: blk.text, totalTextChars: blk.text.length });
            }
          }
        }
        const hist = historyRecords.get(cliSessionId);
        if (hist) {
          for (const turn of hist.turns) {
            const blk = turn.blocks.find((b) => b.id === blockId);
            if (blk) {
              return toStrictJsonValue({ cliSessionId, blockId, text: blk.text, totalTextChars: blk.text.length });
            }
          }
        }
        throw new Error(`Transcript block not found: ${blockId}`);
      }
      case "view.start": {
        const started = await handleStart(payload, { workspace: context.workspace }, context, {
          allowEmptyPrompt: true,
          autoFocus: true
        });
        const startedId = asNonEmptyString(started.cliSessionId);
        if (startedId) {
          await context.events.emit("focus.changed", { focusedCliSessionId: startedId }).catch(() => undefined);
        }
        return toStrictJsonValue(started);
      }
      case "view.steer":
        return toStrictJsonValue(await handleSteer(payload, context));
      case "view.respond":
        return toStrictJsonValue(await handleRespond(payload, context));
      case "view.stop":
        return toStrictJsonValue(await handleStop(payload, context));
      case "view.delete":
        return toStrictJsonValue(await handleDeleteSession(payload, context));
      case "view.queue":
        return toStrictJsonValue(await handleQueueAction(payload, context));
      case "view.setModes":
        return toStrictJsonValue(await handleSetModes(payload, context));
      case "view.compact":
        return toStrictJsonValue(await handleCompact(payload, context));
      case "view.fork":
        return toStrictJsonValue(await handleFork(payload, context));
      case "view.handoff":
        return toStrictJsonValue(await handleHandoff(payload, context));
      case "view.undoTurn":
        return toStrictJsonValue(await handleUndoTurn(payload, context));
      case "view.listNativeSessions":
        return toStrictJsonValue(await handleListNativeSessions(payload, context));
      case "view.importNative":
        return toStrictJsonValue(await handleImportNativeSession(payload, context));
      case "view.listFiles": {
        const cliSessionId = asNonEmptyString(payload.cliSessionId);
        const session = cliSessionId ? sessions.get(cliSessionId) ?? historyRecords.get(cliSessionId) : undefined;
        const resolvedCwd = path.resolve(
          session?.executionWorkspace ?? context.workspace,
          session?.cwdRelative ?? "."
        );
        const query = asNonEmptyString(payload.query) ?? "";
        const limit = asBoundedInt(payload.limit, 150, 1, 500);
        const files = await listWorkspaceGitFiles(context.process, resolvedCwd, query, limit);
        return toStrictJsonValue({ files });
      }
      default:
        throw new Error(`Unsupported service method: ${method}`);
    }
  },

  async stop(context) {
    waitSubscriptions.clear();
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = undefined;
    }
    for (const session of sessions.values()) {
      if (session.emitTimer) {
        clearTimeout(session.emitTimer);
        session.emitTimer = undefined;
      }
      if (session.claudeSession) {
        await session.claudeSession.stop().catch(() => undefined);
        session.claudeSession = undefined;
      }
      if (session.acpSession) {
        await session.acpSession.stop(context.process).catch(() => undefined);
        session.acpSession = undefined;
      }
      if (!session.codexHost && session.processId && !session.executionSettled) {
        await context.process.stop(session.processId).catch(() => undefined);
      }
      session.codexHost = undefined;
      session.executionSettled = true;
      if (!isTerminalCliStatus(session.status)) {
        session.status = "stopped";
      }
      historyRecords.set(session.cliSessionId, toPersisted(session));
    }
    await codexPool.stopAll(context.process).catch(() => undefined);
    await flushDirtyPersistence(context, true);
    lifecycleContext = undefined;
  }
});
