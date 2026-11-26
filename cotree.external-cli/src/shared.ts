export const PLUGIN_ID = "cotree.external-cli";
export const PLUGIN_VERSION = "0.8.0";
export const SERVICE_ID = "cli-runner";

export type CliEngine =
  | "codex"
  | "claude"
  | "antigravity"
  | "gemini"
  | "opencode"
  | "qwen"
  | "kiro"
  | "goose"
  | "acp";

export type CliReasoningEffort = "low" | "medium" | "high" | "xhigh" | "max" | "ultra";
export type CliPermissionMode = "supervised" | "accept_edits" | "auto" | "full_access";
export type CliInteractionMode = "default" | "plan";
export type CliServiceTier = "default" | "fast";
export type CliFollowUpMode = "queue" | "steer";

export type CliModelOption = {
  id: string;
  displayName: string;
  description?: string;
  group?: string;
  isDefault?: boolean;
  contextWindow?: number;
  supportedReasoningEfforts?: string[];
  defaultReasoningEffort?: string;
  supportsFastMode?: boolean;
};

export type CliModelCatalogSource = "live_rpc" | "live_cli" | "live_acp" | "aliases_and_custom" | "cached" | "unavailable";

export type CliSlashCommandInfo = {
  name: string;
  description: string;
  source: "plugin" | "provider";
};

export type CliEngineModelCatalog = {
  engine: CliEngine;
  source: CliModelCatalogSource;
  fetchedAt: string;
  defaultModel?: string;
  supportsMidSessionSwitch: boolean;
  supportsReasoningEffort: boolean;
  supportedReasoningEfforts?: string[];
  models: CliModelOption[];
  slashCommands?: CliSlashCommandInfo[];
  note?: string;
};

export type CliEnginePreference = {
  model?: string;
  reasoningEffort?: string;
  permissionMode?: CliPermissionMode;
  serviceTier?: CliServiceTier;
  followUpMode?: CliFollowUpMode;
  command?: string;
};

export type CliRunMode = "interactive" | "oneshot";
export type CliSessionStatus =
  | "starting"
  | "running"
  | "needs_intervention"
  | "idle"
  | "interrupting"
  | "stopped"
  | "exited"
  | "failed";

export type CliSteerStrategy = "auto" | "in_turn" | "next_turn" | "interrupt_and_resume" | "queue";
export type CliApprovalDecision = "accept" | "accept_for_session" | "decline" | "cancel";
export type CliStopMode = "interrupt" | "kill";

export type CliInterventionKind =
  | "command_approval"
  | "file_change_approval"
  | "permissions_approval"
  | "user_input"
  | "plan_approval"
  | "control_request";

export type CliUserInputOption = {
  label: string;
  description?: string;
  value?: string;
};

export type CliUserInputQuestion = {
  id: string;
  header?: string;
  question: string;
  multiSelect?: boolean;
  options?: CliUserInputOption[];
};

export type CliPendingIntervention = {
  id: string;
  requestId: string | number;
  kind: CliInterventionKind;
  method: string;
  title: string;
  details: Record<string, unknown>;
  questions?: CliUserInputQuestion[];
  nativeOptions?: Array<{ id: string; label: string; kind?: string }>;
  createdAt: string;
};

export type CliAttachmentRef = {
  attachmentId: string;
  path: string;
  fileName: string;
  mimeType: string;
  bytes: number;
};

export type CliQueuedMessage = {
  id: string;
  message: string;
  strategy: CliSteerStrategy;
  model?: string;
  reasoningEffort?: string;
  permissionMode?: CliPermissionMode;
  interactionMode?: CliInteractionMode;
  serviceTier?: CliServiceTier;
  attachments?: CliAttachmentRef[];
  createdAt: string;
};

export type CliContextUsage = {
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  totalTokens?: number;
  contextWindow?: number;
  autoCompactAt?: number;
  costUsd?: number;
};

export type CliChangedFileStat = {
  path: string;
  additions: number;
  deletions: number;
  status: "added" | "modified" | "deleted" | "renamed";
};

export type CliTurnCheckpoint = {
  turnIndex: number;
  beforeRef?: string;
  afterRef?: string;
  changedFiles?: CliChangedFileStat[];
  canUndoFiles?: boolean;
};

export type CliTimelineEventType =
  | "session.started"
  | "session.resumed"
  | "session.forked"
  | "session.imported"
  | "session.handoff"
  | "turn.started"
  | "turn.completed"
  | "turn.failed"
  | "turn.interrupted"
  | "turn.undone"
  | "assistant.delta"
  | "assistant.message"
  | "tool.activity"
  | "plan.updated"
  | "steer.sent"
  | "queue.updated"
  | "intervention.requested"
  | "intervention.resolved"
  | "process.stderr"
  | "process.exited"
  | "process.truncated"
  | "protocol.notice";

export type CliTimelineEvent = {
  seq: number;
  at: string;
  type: CliTimelineEventType;
  summary: string;
  data?: Record<string, unknown>;
};

export type CliTranscriptBlockKind =
  | "user"
  | "steer"
  | "reasoning"
  | "assistant"
  | "command"
  | "file_change"
  | "tool"
  | "plan"
  | "image"
  | "intervention"
  | "stderr"
  | "notice";

export type CliTranscriptBlockStatus =
  | "streaming"
  | "completed"
  | "failed"
  | "interrupted"
  | "pending";

export type CliTranscriptBlock = {
  id: string;
  turnIndex: number;
  kind: CliTranscriptBlockKind;
  status: CliTranscriptBlockStatus;
  title: string;
  text: string;
  outputOmitted?: boolean;
  totalTextChars?: number;
  meta?: Record<string, unknown>;
  startedAt: string;
  updatedAt: string;
};

export type CliTranscriptTurn = {
  turnIndex: number;
  turnId?: string;
  clientMsgId?: string;
  providerMessageId?: string;
  trigger: "initial" | "steer" | "resume" | "queued" | "handoff";
  prompt: string;
  status: "running" | "needs_intervention" | "completed" | "failed" | "interrupted";
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  usage?: Record<string, unknown>;
  costUsd?: number;
  attachments?: CliAttachmentRef[];
  checkpoint?: CliTurnCheckpoint;
  blocks: CliTranscriptBlock[];
};

export type CliSessionSummary = {
  cliSessionId: string;
  engine: CliEngine;
  mode: CliRunMode;
  origin: "live" | "history";
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
  permissionMode?: CliPermissionMode;
  interactionMode?: CliInteractionMode;
  serviceTier?: CliServiceTier;
  createdAt: string;
  updatedAt: string;
  endedAt?: string;
  exitCode?: number;
  signal?: string;
  executionSettled: boolean;
  truncatedLog: boolean;
  latestSeq: number;
  turnCount: number;
  queuedCount?: number;
  queuePaused?: boolean;
  pendingInterventions: CliPendingIntervention[];
  lastAssistantText: string;
  lastActivitySummary: string;
  totalUsage?: Record<string, unknown>;
  contextUsage?: CliContextUsage;
  totalCostUsd?: number;
  lastError?: string;
  forkedFromSessionId?: string;
  handoffFromEngine?: CliEngine;
};

export type CliRailSessionSummary = Omit<CliSessionSummary, "lastAssistantText"> & {
  lastAssistantPreview: string;
};

export type CliSessionTranscript = {
  summary: CliSessionSummary;
  turns: CliTranscriptTurn[];
  hasOlderTurns?: boolean;
  oldestTurnIndex?: number;
  queue?: CliQueuedMessage[];
  events: CliTimelineEvent[];
  rawTail?: {
    stdout: string;
    stderr: string;
  };
};

export type CliTranscriptDelta =
  | { kind: "turn.upsert"; turn: CliTranscriptTurn; clientMsgId?: string }
  | { kind: "block.upsert"; turnIndex: number; block: CliTranscriptBlock }
  | { kind: "block.append"; turnIndex: number; blockId: string; delta: string; updatedAt: string }
  | {
      kind: "block.status";
      turnIndex: number;
      blockId: string;
      status: CliTranscriptBlockStatus;
      title?: string;
      meta?: Record<string, unknown>;
      updatedAt: string;
    }
  | { kind: "queue.set"; queue: CliQueuedMessage[]; paused: boolean }
  | { kind: "interventions.set"; items: CliPendingIntervention[] }
  | { kind: "checkpoint.updated"; turnIndex: number; checkpoint: CliTurnCheckpoint }
  | { kind: "session.status"; summary: CliRailSessionSummary };

export type CliPersistedSessionRecord = {
  cliSessionId: string;
  engine: CliEngine;
  mode: CliRunMode;
  status: CliSessionStatus;
  label?: string;
  executionWorkspace: string;
  cwdRelative: string;
  isWorktree: boolean;
  ownerSessionId?: string;
  ownerRunId?: string;
  ownerAgentId?: string;
  externalSessionId?: string;
  model?: string;
  reasoningEffort?: string;
  approvalPolicy?: string;
  permissionMode?: CliPermissionMode;
  interactionMode?: CliInteractionMode;
  serviceTier?: CliServiceTier;
  sandbox?: string;
  extraArgs?: string[];
  createdAt: string;
  updatedAt: string;
  endedAt?: string;
  exitCode?: number;
  signal?: string;
  lastAssistantText: string;
  lastActivitySummary: string;
  lastError?: string;
  totalUsage?: Record<string, unknown>;
  contextUsage?: CliContextUsage;
  totalCostUsd?: number;
  forkedFromSessionId?: string;
  handoffFromEngine?: CliEngine;
  turns: CliTranscriptTurn[];
};

export type CliNativeSessionEntry = {
  engine: CliEngine;
  externalSessionId: string;
  title: string;
  cwd?: string;
  updatedAt?: string;
  model?: string;
  preview?: string;
};

export type CliProviderCapabilityDescriptor = {
  command: string;
  displayName: string;
  transport: "codex_app_server" | "claude_agent_sdk" | "antigravity_ndjson" | "acp_universal";
  multiThreadPerProcess: boolean;
  midTurnSteer: boolean;
  softInterrupt: boolean;
  structuredApprovals: boolean;
  resume: boolean;
  nativeFork: boolean;
  nativeRollback: boolean;
  planMode: boolean;
  midSessionModelSwitch: boolean;
  supportsReasoningEffort: boolean;
  supportsFastMode: boolean;
  supportsImageAttachments: boolean;
  supportsNativeSessionList: boolean;
  permissionModes: readonly CliPermissionMode[];
  protocol: string;
};

export const ENGINE_CAPABILITIES: Record<CliEngine, CliProviderCapabilityDescriptor> = {
  codex: {
    command: "codex",
    displayName: "Codex CLI",
    transport: "codex_app_server",
    multiThreadPerProcess: true,
    midTurnSteer: true,
    softInterrupt: true,
    structuredApprovals: true,
    resume: true,
    nativeFork: true,
    nativeRollback: true,
    planMode: true,
    midSessionModelSwitch: true,
    supportsReasoningEffort: true,
    supportsFastMode: true,
    supportsImageAttachments: true,
    supportsNativeSessionList: true,
    permissionModes: ["supervised", "accept_edits", "auto", "full_access"],
    protocol: "codex.app-server.v2.jsonrpc"
  },
  claude: {
    command: "claude",
    displayName: "Claude Code",
    transport: "claude_agent_sdk",
    multiThreadPerProcess: false,
    midTurnSteer: true,
    softInterrupt: true,
    structuredApprovals: true,
    resume: true,
    nativeFork: true,
    nativeRollback: true,
    planMode: true,
    midSessionModelSwitch: true,
    supportsReasoningEffort: true,
    supportsFastMode: true,
    supportsImageAttachments: true,
    supportsNativeSessionList: false,
    permissionModes: ["supervised", "accept_edits", "auto", "full_access"],
    protocol: "claude.agent-sdk.v1"
  },
  antigravity: {
    command: "agy",
    displayName: "Antigravity CLI",
    transport: "antigravity_ndjson",
    multiThreadPerProcess: false,
    midTurnSteer: true,
    softInterrupt: false,
    structuredApprovals: false,
    resume: true,
    nativeFork: false,
    nativeRollback: false,
    planMode: true,
    midSessionModelSwitch: true,
    supportsReasoningEffort: false,
    supportsFastMode: false,
    supportsImageAttachments: true,
    supportsNativeSessionList: false,
    permissionModes: ["supervised", "accept_edits", "full_access"],
    protocol: "antigravity.stream-json.ndjson"
  },
  gemini: {
    command: "gemini",
    displayName: "Gemini CLI",
    transport: "acp_universal",
    multiThreadPerProcess: false,
    midTurnSteer: false,
    softInterrupt: true,
    structuredApprovals: true,
    resume: true,
    nativeFork: false,
    nativeRollback: false,
    planMode: false,
    midSessionModelSwitch: true,
    supportsReasoningEffort: false,
    supportsFastMode: false,
    supportsImageAttachments: true,
    supportsNativeSessionList: true,
    permissionModes: ["supervised", "accept_edits", "full_access"],
    protocol: "acp.v1-v2.jsonrpc"
  },
  opencode: {
    command: "opencode",
    displayName: "OpenCode (ACP)",
    transport: "acp_universal",
    multiThreadPerProcess: false,
    midTurnSteer: false,
    softInterrupt: true,
    structuredApprovals: true,
    resume: true,
    nativeFork: true,
    nativeRollback: false,
    planMode: true,
    midSessionModelSwitch: true,
    supportsReasoningEffort: true,
    supportsFastMode: false,
    supportsImageAttachments: true,
    supportsNativeSessionList: true,
    permissionModes: ["supervised", "accept_edits", "full_access"],
    protocol: "acp.v1-v2.jsonrpc"
  },
  qwen: {
    command: "qwen",
    displayName: "Qwen Code (ACP)",
    transport: "acp_universal",
    multiThreadPerProcess: false,
    midTurnSteer: false,
    softInterrupt: true,
    structuredApprovals: true,
    resume: true,
    nativeFork: false,
    nativeRollback: false,
    planMode: true,
    midSessionModelSwitch: true,
    supportsReasoningEffort: false,
    supportsFastMode: false,
    supportsImageAttachments: true,
    supportsNativeSessionList: true,
    permissionModes: ["supervised", "accept_edits", "full_access"],
    protocol: "acp.v1-v2.jsonrpc"
  },
  kiro: {
    command: "kiro-cli",
    displayName: "Kiro CLI (ACP)",
    transport: "acp_universal",
    multiThreadPerProcess: false,
    midTurnSteer: true,
    softInterrupt: true,
    structuredApprovals: true,
    resume: true,
    nativeFork: true,
    nativeRollback: false,
    planMode: true,
    midSessionModelSwitch: true,
    supportsReasoningEffort: false,
    supportsFastMode: false,
    supportsImageAttachments: true,
    supportsNativeSessionList: true,
    permissionModes: ["supervised", "accept_edits", "full_access"],
    protocol: "acp.v1-v2.jsonrpc"
  },
  goose: {
    command: "goose",
    displayName: "Goose (ACP)",
    transport: "acp_universal",
    multiThreadPerProcess: false,
    midTurnSteer: false,
    softInterrupt: true,
    structuredApprovals: true,
    resume: true,
    nativeFork: false,
    nativeRollback: false,
    planMode: false,
    midSessionModelSwitch: true,
    supportsReasoningEffort: false,
    supportsFastMode: false,
    supportsImageAttachments: false,
    supportsNativeSessionList: true,
    permissionModes: ["supervised", "accept_edits", "full_access"],
    protocol: "acp.v1-v2.jsonrpc"
  },
  acp: {
    command: "acp-agent",
    displayName: "Custom ACP",
    transport: "acp_universal",
    multiThreadPerProcess: false,
    midTurnSteer: false,
    softInterrupt: true,
    structuredApprovals: true,
    resume: true,
    nativeFork: true,
    nativeRollback: false,
    planMode: true,
    midSessionModelSwitch: true,
    supportsReasoningEffort: true,
    supportsFastMode: false,
    supportsImageAttachments: true,
    supportsNativeSessionList: true,
    permissionModes: ["supervised", "accept_edits", "full_access"],
    protocol: "acp.v1-v2.jsonrpc"
  }
};

export const PRIMARY_CLI_ENGINES: readonly CliEngine[] = ["codex", "claude", "antigravity", "gemini"];
export const ALL_CLI_ENGINES: readonly CliEngine[] = [
  "codex",
  "claude",
  "antigravity",
  "gemini",
  "opencode",
  "qwen",
  "kiro",
  "goose",
  "acp"
];
export const ALL_REASONING_EFFORTS: readonly CliReasoningEffort[] = ["low", "medium", "high", "xhigh", "max", "ultra"];

export const OPTIONAL_CUSTOM_CLI_EXECUTABLES = [
  { id: "aider", command: "aider", displayName: "Aider" },
  { id: "cline", command: "cline", displayName: "Cline CLI" },
  { id: "cursor-agent", command: "cursor-agent", displayName: "Cursor Agent" },
  { id: "copilot", command: "copilot", displayName: "GitHub Copilot CLI" },
  { id: "amp", command: "amp", displayName: "Amp CLI" },
  { id: "droid", command: "droid", displayName: "Factory Droid CLI" }
] as const;

export type CliUnsupportedCapabilityItem = {
  capability: string;
  alternative: string;
};

export type CliUnsupportedOptionNotice = {
  option: string;
  requested: string;
  unsupported: true;
  reason: string;
  alternative: string;
};

export function listUnsupportedCapabilities(engine: CliEngine): CliUnsupportedCapabilityItem[] {
  const cap = ENGINE_CAPABILITIES[engine];
  const out: CliUnsupportedCapabilityItem[] = [];
  if (!cap.midTurnSteer) {
    out.push({
      capability: "midTurnSteer",
      alternative: "steer automatically degrades to strategy='queue' during an active turn, or pass strategy='interrupt_and_resume'."
    });
  }
  if (!cap.softInterrupt) {
    out.push({
      capability: "softInterrupt",
      alternative: "stop(mode='interrupt') tries graceful stdin EOF; if unconfirmed, call stop(mode='kill') (conversation remains resumable)."
    });
  }
  if (!cap.structuredApprovals) {
    out.push({
      capability: "structuredApprovals",
      alternative: "Use respond with freeform 'text' or start with permissionMode='accept_edits' or 'full_access'."
    });
  }
  if (!cap.nativeFork) {
    out.push({
      capability: "nativeFork",
      alternative: "fork uses CoTree portable context handoff snapshot."
    });
  }
  if (!cap.nativeRollback) {
    out.push({
      capability: "nativeRollback",
      alternative: "undoTurn uses CoTree hidden Git checkpoints (requires forceRevertFiles=true outside worktrees)."
    });
  }
  if (!cap.planMode) {
    out.push({
      capability: "planMode",
      alternative: "Request a plan explicitly in the prompt text or handoff to codex/claude/opencode."
    });
  }
  if (!cap.supportsReasoningEffort) {
    out.push({
      capability: "reasoningEffort",
      alternative: "Omit reasoningEffort or switch to codex, claude, opencode, or acp."
    });
  }
  if (!cap.supportsFastMode) {
    out.push({
      capability: "fastMode",
      alternative: "Use serviceTier='default' or switch to codex/claude."
    });
  }
  if (!cap.supportsImageAttachments) {
    out.push({
      capability: "imageAttachments",
      alternative: "Reference file paths in prompt text or switch to an engine that supports attachments."
    });
  }
  if (!cap.supportsNativeSessionList) {
    out.push({
      capability: "nativeSessionList",
      alternative: "Use read() to inspect CoTree-managed sessions or importNative with an explicit externalSessionId."
    });
  }
  return out;
}

export function evaluateUnsupportedRequestOptions(
  engine: CliEngine,
  options: {
    reasoningEffort?: string;
    serviceTier?: CliServiceTier;
    interactionMode?: CliInteractionMode;
    attachments?: CliAttachmentRef[];
  }
): CliUnsupportedOptionNotice[] {
  const cap = ENGINE_CAPABILITIES[engine];
  const notices: CliUnsupportedOptionNotice[] = [];
  if (options.reasoningEffort && !cap.supportsReasoningEffort) {
    notices.push({
      option: "reasoningEffort",
      requested: options.reasoningEffort,
      unsupported: true,
      reason: `${cap.displayName} does not support reasoningEffort ('${options.reasoningEffort}').`,
      alternative: "Omit reasoningEffort or use codex, claude, opencode, or acp."
    });
  }
  if (options.serviceTier === "fast" && !cap.supportsFastMode) {
    notices.push({
      option: "serviceTier",
      requested: "fast",
      unsupported: true,
      reason: `${cap.displayName} does not support serviceTier='fast'.`,
      alternative: "Use serviceTier='default' or switch to codex/claude."
    });
  }
  if (options.interactionMode === "plan" && !cap.planMode) {
    notices.push({
      option: "interactionMode",
      requested: "plan",
      unsupported: true,
      reason: `${cap.displayName} does not support native plan interactionMode.`,
      alternative: "Ask for a plan in prompt text or handoff to codex, claude, opencode, qwen, kiro, or acp."
    });
  }
  if (options.attachments && options.attachments.length > 0 && !cap.supportsImageAttachments) {
    notices.push({
      option: "attachments",
      requested: `${options.attachments.length} attachment(s)`,
      unsupported: true,
      reason: `${cap.displayName} does not support image/file attachments directly.`,
      alternative: "Reference workspace file paths in the prompt text or switch engines."
    });
  }
  return notices;
}

const DECLARED_AGENT_EXECUTABLES: ReadonlyArray<{ id: string; command: string }> = [
  ...ALL_CLI_ENGINES.map((engine) => ({ id: engine, command: ENGINE_CAPABILITIES[engine].command })),
  ...OPTIONAL_CUSTOM_CLI_EXECUTABLES.map((item) => ({ id: item.id, command: item.command }))
];

export function resolveAcpCommandExecutable(
  requestedCommand: string | undefined,
  options: {
    customCliAllowlist?: readonly string[];
    acpCommandOverride?: string;
    preferenceCommand?: string;
  } = {}
): { executableId: string; command: string; viaOverride: boolean } {
  const raw = (requestedCommand ?? options.preferenceCommand ?? options.acpCommandOverride ?? "").trim();
  if (!raw) {
    return { executableId: "acp", command: ENGINE_CAPABILITIES.acp.command, viaOverride: false };
  }
  if (raw.includes("/") || raw.includes("\\") || raw.includes(":") || raw.includes("..") || /[\r\n\0]/.test(raw)) {
    throw new Error(
      `Arbitrary executable paths are not allowed ('${raw}'). Specify a declared executable ID or command name (no path separators); arbitrary absolute binaries require a reviewed host 'source: "user"' declaration.`
    );
  }
  const normalized = raw.toLowerCase();
  const match = DECLARED_AGENT_EXECUTABLES.find(
    (entry) => entry.id.toLowerCase() === normalized || entry.command.toLowerCase() === normalized
  );
  const allowlist = (options.customCliAllowlist ?? [])
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  if (allowlist.length > 0 && normalized !== "acp" && normalized !== "acp-agent") {
    const allowedBySettings = allowlist.some(
      (entry) =>
        entry === normalized ||
        (match && (entry === match.id.toLowerCase() || entry === match.command.toLowerCase()))
    );
    if (!allowedBySettings) {
      throw new Error(
        `Command '${raw}' is not permitted by settings.customCliAllowlist ([${allowlist.join(", ")}]). Add '${raw}' to settings.customCliAllowlist to allow it.`
      );
    }
  }

  if (!match) {
    const knownIds = DECLARED_AGENT_EXECUTABLES.map((e) => e.id).join(", ");
    throw new Error(
      `Command '${raw}' is not in the declared nativeExecutables allowlist (${knownIds}). Arbitrary binaries cannot be executed without a host-approved nativeExecutable declaration.`
    );
  }

  return {
    executableId: match.id,
    command: match.command,
    viaOverride: match.id !== "acp"
  };
}

export function sanitizeProcessEnvOverrides(raw: unknown): Record<string, string> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("env must be a flat object mapping environment variable names to string values.");
  }
  const entries = Object.entries(raw as Record<string, unknown>);
  if (entries.length === 0) return undefined;
  if (entries.length > 16) {
    throw new Error("env may contain at most 16 entries.");
  }
  const out: Record<string, string> = {};
  for (const [key, val] of entries) {
    if (!/^[A-Za-z_][A-Za-z0-9_]{0,127}$/.test(key)) {
      throw new Error(`Invalid environment variable name: ${key}`);
    }
    if (typeof val !== "string" || val.length > 4096 || /[\r\n\0]/.test(val)) {
      throw new Error(`Invalid environment variable value for ${key}: must be a single-line string (<= 4096 chars).`);
    }
    out[key] = val;
  }
  return out;
}

export const PLUGIN_SLASH_COMMANDS: readonly CliSlashCommandInfo[] = [
  { name: "plan", description: "切换规划模式 (Plan ↔ Default)", source: "plugin" },
  { name: "compact", description: "压缩当前会话上下文", source: "plugin" },
  { name: "fork", description: "从当前轮次分支出新会话", source: "plugin" },
  { name: "handoff", description: "将当前上下文无损交接给其他引擎（如 /handoff codex）", source: "plugin" },
  { name: "review", description: "打开 CoTree 原生 Review 差异面板", source: "plugin" },
  { name: "mode", description: "切换权限模式（supervised / accept_edits / auto / full_access）", source: "plugin" },
  { name: "model", description: "聚焦并切换模型", source: "plugin" },
  { name: "clear", description: "基于相同目录开启新会话", source: "plugin" }
];

export function isCliEngine(value: unknown): value is CliEngine {
  return (
    value === "codex" ||
    value === "claude" ||
    value === "antigravity" ||
    value === "gemini" ||
    value === "opencode" ||
    value === "qwen" ||
    value === "kiro" ||
    value === "goose" ||
    value === "acp"
  );
}

export function isAcpEngine(engine: CliEngine): boolean {
  return ENGINE_CAPABILITIES[engine].transport === "acp_universal";
}

export function isCliReasoningEffort(value: unknown): value is CliReasoningEffort {
  return (
    value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "xhigh" ||
    value === "max" ||
    value === "ultra"
  );
}

export function isCliPermissionMode(value: unknown): value is CliPermissionMode {
  return value === "supervised" || value === "accept_edits" || value === "auto" || value === "full_access";
}

export function isCliInteractionMode(value: unknown): value is CliInteractionMode {
  return value === "default" || value === "plan";
}

export function isCliServiceTier(value: unknown): value is CliServiceTier {
  return value === "default" || value === "fast";
}

export function mapApprovalPolicyToPermissionMode(policy?: string): CliPermissionMode {
  switch (policy) {
    case "never":
    case "bypassPermissions":
    case "always-proceed":
    case "full_access":
      return "full_access";
    case "acceptEdits":
    case "accept_edits":
      return "accept_edits";
    case "auto":
      return "auto";
    default:
      return "supervised";
  }
}

export function mapPermissionModeToCodexPolicy(mode: CliPermissionMode): {
  approvalPolicy: string;
  approvalsReviewer?: "user" | "auto_review";
  sandbox: string;
} {
  switch (mode) {
    case "full_access":
      return { approvalPolicy: "never", sandbox: "danger-full-access" };
    case "auto":
      return { approvalPolicy: "on-request", approvalsReviewer: "auto_review", sandbox: "workspace-write" };
    case "accept_edits":
      return { approvalPolicy: "on-failure", sandbox: "workspace-write" };
    case "supervised":
    default:
      return { approvalPolicy: "on-request", approvalsReviewer: "user", sandbox: "workspace-write" };
  }
}

export function mapPermissionModeToClaudeMode(
  mode: CliPermissionMode,
  interactionMode: CliInteractionMode
): "default" | "acceptEdits" | "plan" | "bypassPermissions" | "auto" {
  if (interactionMode === "plan") return "plan";
  switch (mode) {
    case "full_access":
      return "bypassPermissions";
    case "accept_edits":
      return "acceptEdits";
    case "auto":
      return "auto";
    case "supervised":
    default:
      return "default";
  }
}

export type CliAuthPreflight = {
  status: "ok" | "missing" | "unverified";
  reason: string;
  errorCode?: string;
  remediationCommand?: string;
};

export type ExternalCliRuntimeSettings = {
  allowedWorkspaceRoots: string[];
  extraEnvAllowlist: string[];
  defaultPermissionMode: CliPermissionMode;
  acpSilenceTimeoutMs: number;
  historyLimits: {
    maxSessions: number;
    maxTurnsPerSession: number;
  };
  acpCommandOverride: string;
  customCliAllowlist: string[];
};

export const DEFAULT_EXTERNAL_CLI_SETTINGS: ExternalCliRuntimeSettings = {
  allowedWorkspaceRoots: [],
  extraEnvAllowlist: [],
  defaultPermissionMode: "supervised",
  acpSilenceTimeoutMs: 900_000,
  historyLimits: {
    maxSessions: 48,
    maxTurnsPerSession: 64
  },
  acpCommandOverride: "",
  customCliAllowlist: []
};

export const PLUGIN_RESOURCE_QUOTAS = {
  memoryMb: 512,
  maxCapabilityRequests: 512,
  maxConcurrentCapabilities: 16,
  maxCapabilityOutputBytes: 8_388_608,
  maxStdoutBytes: 8_388_608,
  maxStorageBytes: 16_777_216,
  maxPendingCalls: 128,
  idleTimeoutMs: 1_800_000,
  maxEventBytes: 1_048_576
} as const;

export function parseExternalCliSettings(raw: unknown): ExternalCliRuntimeSettings {
  const rec = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const allowedWorkspaceRoots = Array.isArray(rec.allowedWorkspaceRoots)
    ? rec.allowedWorkspaceRoots
        .filter((v): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= 1024)
        .map((v) => v.trim())
        .slice(0, 32)
    : [];
  const extraEnvAllowlist = Array.isArray(rec.extraEnvAllowlist)
    ? rec.extraEnvAllowlist
        .filter((v): v is string => typeof v === "string" && /^[A-Za-z_][A-Za-z0-9_]{0,127}$/.test(v))
        .slice(0, 64)
    : [];
  const defaultPermissionMode = isCliPermissionMode(rec.defaultPermissionMode)
    ? rec.defaultPermissionMode
    : DEFAULT_EXTERNAL_CLI_SETTINGS.defaultPermissionMode;
  const acpSilenceTimeoutMs =
    typeof rec.acpSilenceTimeoutMs === "number" && Number.isFinite(rec.acpSilenceTimeoutMs)
      ? Math.max(60_000, Math.min(3_600_000, Math.floor(rec.acpSilenceTimeoutMs)))
      : DEFAULT_EXTERNAL_CLI_SETTINGS.acpSilenceTimeoutMs;
  const rawHist =
    rec.historyLimits && typeof rec.historyLimits === "object" && !Array.isArray(rec.historyLimits)
      ? (rec.historyLimits as Record<string, unknown>)
      : {};
  const maxSessions =
    typeof rawHist.maxSessions === "number" && Number.isFinite(rawHist.maxSessions)
      ? Math.max(1, Math.min(500, Math.floor(rawHist.maxSessions)))
      : DEFAULT_EXTERNAL_CLI_SETTINGS.historyLimits.maxSessions;
  const maxTurnsPerSession =
    typeof rawHist.maxTurnsPerSession === "number" && Number.isFinite(rawHist.maxTurnsPerSession)
      ? Math.max(1, Math.min(500, Math.floor(rawHist.maxTurnsPerSession)))
      : DEFAULT_EXTERNAL_CLI_SETTINGS.historyLimits.maxTurnsPerSession;
  const acpCommandOverride =
    typeof rec.acpCommandOverride === "string" ? rec.acpCommandOverride.trim().slice(0, 128) : "";
  const customCliAllowlist = Array.isArray(rec.customCliAllowlist)
    ? rec.customCliAllowlist
        .filter((v): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= 128)
        .map((v) => v.trim())
        .slice(0, 32)
    : [];
  return {
    allowedWorkspaceRoots,
    extraEnvAllowlist,
    defaultPermissionMode,
    acpSilenceTimeoutMs,
    historyLimits: {
      maxSessions,
      maxTurnsPerSession
    },
    acpCommandOverride,
    customCliAllowlist
  };
}

function normalizeComparableAbsolutePath(rawPath: string): string {
  const slashes = rawPath.trim().replace(/\\/g, "/").replace(/\/+$/, "");
  const isWindowsDrive = /^[A-Za-z]:/.test(slashes);
  return isWindowsDrive ? `${slashes[0]!.toLowerCase()}${slashes.slice(1).toLowerCase()}` : slashes;
}

export function normalizeRelativeCwd(raw: unknown, allowedWorkspaceRoots: readonly string[] = []): string {
  if (raw === undefined || raw === null || raw === "") return ".";
  if (typeof raw !== "string") {
    throw new Error("cwd must be a workspace-relative string path.");
  }
  const trimmed = raw.trim().replace(/\\/g, "/");
  if (!trimmed || trimmed === ".") return ".";
  const rawParts = trimmed.split("/").filter(Boolean);
  if (rawParts.some((part) => part === "..")) {
    throw new Error("cwd must not traverse outside the caller workspace.");
  }
  const isAbsolutePath = trimmed.startsWith("/") || /^[A-Za-z]:/.test(trimmed);
  if (isAbsolutePath) {
    if (allowedWorkspaceRoots.length === 0) {
      throw new Error("cwd must be relative to the caller workspace.");
    }
    const normalizedTarget = normalizeComparableAbsolutePath(trimmed);
    const matched = allowedWorkspaceRoots.some((root) => {
      const rootTrim = root.trim().replace(/\\/g, "/");
      if (!rootTrim || (!rootTrim.startsWith("/") && !/^[A-Za-z]:/.test(rootTrim))) return false;
      if (rootTrim.split("/").includes("..")) return false;
      const normalizedRoot = normalizeComparableAbsolutePath(rootTrim);
      return normalizedTarget === normalizedRoot || normalizedTarget.startsWith(`${normalizedRoot}/`);
    });
    if (!matched) {
      throw new Error(
        "cwd is outside the caller workspace and settings.allowedWorkspaceRoots. Add the directory root to plugin settings.allowedWorkspaceRoots to allow it."
      );
    }
    return trimmed;
  }
  return rawParts.join("/") || ".";
}

export function sanitizeExtraArgs(raw: unknown): string[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw) || raw.length > 32) {
    throw new Error("extraArgs must be an array of at most 32 strings.");
  }
  const args: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string" || item.length === 0 || item.length > 2048 || /[\r\n\0]/.test(item)) {
      throw new Error("Each entry in extraArgs must be a non-empty single-line string.");
    }
    args.push(item);
  }
  return args;
}

export function truncateText(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(0, maxChars - 16))}\n...[truncated]`;
}

/**
 * Strip ANSI CSI/OSC/ESC terminal escape sequences and non-printing C0 control bytes
 * (preserving tab, LF, CR) in a single linear pass with no regex backtracking.
 */
export function stripAnsi(text: string): string {
  if (!text) return text;
  let hasControl = false;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if ((code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) || code === 0x7f || code === 0x9b) {
      hasControl = true;
      break;
    }
  }
  if (!hasControl) return text;

  let out = "";
  let i = 0;
  const len = text.length;
  while (i < len) {
    const code = text.charCodeAt(i);
    if (code === 0x1b) {
      const next = i + 1 < len ? text.charCodeAt(i + 1) : -1;
      if (next === 0x5b) {
        i += 2;
        while (i < len && text.charCodeAt(i) >= 0x30 && text.charCodeAt(i) <= 0x3f) i += 1;
        while (i < len && text.charCodeAt(i) >= 0x20 && text.charCodeAt(i) <= 0x2f) i += 1;
        if (i < len && text.charCodeAt(i) >= 0x40 && text.charCodeAt(i) <= 0x7e) i += 1;
        continue;
      }
      if (next === 0x5d || next === 0x50 || next === 0x5f || next === 0x5e) {
        i += 2;
        while (i < len) {
          const c = text.charCodeAt(i);
          if (c === 0x07) {
            i += 1;
            break;
          }
          if (c === 0x1b && i + 1 < len && text.charCodeAt(i + 1) === 0x5c) {
            i += 2;
            break;
          }
          i += 1;
        }
        continue;
      }
      if (next >= 0x20 && next <= 0x7e) {
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }
    if (code === 0x9b) {
      i += 1;
      while (i < len && text.charCodeAt(i) >= 0x30 && text.charCodeAt(i) <= 0x3f) i += 1;
      while (i < len && text.charCodeAt(i) >= 0x20 && text.charCodeAt(i) <= 0x2f) i += 1;
      if (i < len && text.charCodeAt(i) >= 0x40 && text.charCodeAt(i) <= 0x7e) i += 1;
      continue;
    }
    if ((code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) || code === 0x7f) {
      i += 1;
      continue;
    }
    out += text[i]!;
    i += 1;
  }
  return out;
}

export function isDiagnosticTracingStderrLine(line: string): boolean {
  const cleaned = stripAnsi(line).trim();
  if (!cleaned) return true;
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?\s+(?:TRACE|DEBUG|INFO|WARN|WARNING|ERROR)\b/.test(cleaned);
}

export function isTerminalCliStatus(status: CliSessionStatus): boolean {
  return status === "stopped" || status === "exited" || status === "failed";
}

export function parseUnifiedDiffFileStats(diffText: string): CliChangedFileStat[] {
  if (!diffText) return [];
  const files = new Map<string, CliChangedFileStat>();
  let currentPath: string | undefined;
  const lines = diffText.replace(/\r\n/g, "\n").split("\n");
  for (const line of lines) {
    if (line.startsWith("--- ")) {
      const candidate = line.slice(4).trim().replace(/^a\//, "");
      if (candidate && candidate !== "/dev/null") {
        currentPath = candidate;
        if (!files.has(candidate)) {
          files.set(candidate, { path: candidate, additions: 0, deletions: 0, status: "modified" });
        }
      }
      continue;
    }
    if (line.startsWith("+++ ")) {
      const candidate = line.slice(4).trim().replace(/^b\//, "");
      if (candidate && candidate !== "/dev/null") {
        currentPath = candidate;
        const existing = files.get(candidate);
        if (!existing) {
          files.set(candidate, { path: candidate, additions: 0, deletions: 0, status: "added" });
        }
      } else if (candidate === "/dev/null" && currentPath) {
        const existing = files.get(currentPath);
        if (existing) existing.status = "deleted";
      }
      continue;
    }
    if (!currentPath) continue;
    const entry = files.get(currentPath);
    if (!entry) continue;
    if (line.startsWith("+") && !line.startsWith("+++")) entry.additions += 1;
    else if (line.startsWith("-") && !line.startsWith("---")) entry.deletions += 1;
  }
  return [...files.values()];
}

export type ToolSemanticCategory = "read" | "search" | "edit" | "command" | "browser" | "other";

export function classifyToolSemanticCategory(block: Pick<CliTranscriptBlock, "kind" | "title">): ToolSemanticCategory {
  if (block.kind === "command") return "command";
  if (block.kind === "file_change") return "edit";
  const lower = block.title.toLowerCase();
  if (/(read|view_file|cat|open_file|get_file|list_dir|ls)/.test(lower)) return "read";
  if (/(grep|glob|find|search|ripgrep|web_search|websearch)/.test(lower)) return "search";
  if (/(write|edit|patch|replace|multi_replace|create_file|delete_file|apply_patch)/.test(lower)) return "edit";
  if (/(browser|fetch|curl|http|navigate|click|screenshot)/.test(lower)) return "browser";
  if (/(bash|shell|exec|terminal|run_command|powershell)/.test(lower)) return "command";
  return "other";
}

export function estimateModelContextWindow(engine: CliEngine, model?: string): { contextWindow: number; autoCompactAt?: number } {
  const lower = (model ?? "").toLowerCase();
  if (engine === "claude" || lower.includes("claude")) {
    const contextWindow = lower.includes("1m") ? 1_000_000 : 200_000;
    return { contextWindow, autoCompactAt: Math.max(32_000, contextWindow - 33_000) };
  }
  if (lower.includes("gemini")) {
    return { contextWindow: 1_000_000 };
  }
  if (engine === "qwen" || lower.includes("qwen")) {
    const contextWindow = lower.includes("1m") ? 1_000_000 : 256_000;
    return { contextWindow, autoCompactAt: Math.floor(contextWindow * 0.88) };
  }
  if (engine === "codex" || lower.includes("gpt-")) {
    const contextWindow = lower.includes("gpt-6") || lower.includes("gpt-5") ? 272_000 : 200_000;
    return { contextWindow, autoCompactAt: Math.floor(contextWindow * 0.9) };
  }
  return { contextWindow: 200_000 };
}

export const TRANSIENT_READ_RETRY_BACKOFF_MS: readonly number[] = [300, 900, 2_000];
export const SILENCE_INDICATOR_THRESHOLD_MS = 120_000;

export function isFatalProcessReadError(error: unknown): boolean {
  if (error && typeof error === "object" && "name" in error && (error as { name?: unknown }).name === "AbortError") {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /not found|no such process|exited|settled|terminated|aborted|cancelled|canceled|stopped|closed|disposed|EPIPE|ESRCH/i.test(
    message
  );
}

export function waitForRetryBackoff(ms: number, signal?: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve(false);
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      resolve(false);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve(true);
    }, Math.max(0, ms));
    timer.unref?.();
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export function formatSilenceDuration(updatedAtIso?: string, nowMs = Date.now()): string | undefined {
  if (!updatedAtIso) return undefined;
  const parsed = Date.parse(updatedAtIso);
  if (!Number.isFinite(parsed)) return undefined;
  const elapsedMs = nowMs - parsed;
  if (elapsedMs < SILENCE_INDICATOR_THRESHOLD_MS) return undefined;
  const totalMinutes = Math.floor(elapsedMs / 60_000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function isAgentOwnedSession(
  summary?: Pick<CliSessionSummary, "ownerAgentId" | "ownerSessionId"> | null
): boolean {
  return Boolean(summary && (summary.ownerAgentId || summary.ownerSessionId));
}

export function formatWorkspaceLabel(workspacePath?: string): string {
  if (!workspacePath) return "";
  const trimmed = workspacePath.replace(/[\\/]+$/, "");
  const parts = trimmed.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] || trimmed;
}
