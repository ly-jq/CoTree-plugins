import { buildPluginToolName } from "@cotree/plugin-sdk";
import { PLUGIN_ID, PLUGIN_VERSION, SERVICE_ID } from "./shared.js";

const str = { type: "string", minLength: 1, maxLength: 16_000 };
const shortStr = { type: "string", minLength: 1, maxLength: 256 };
const schema = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false
});

const engineProp = {
  type: "string",
  enum: ["codex", "claude", "antigravity", "gemini", "opencode", "qwen", "kiro", "goose", "acp"],
  description: "External agent CLI engine to launch (codex, claude, antigravity, gemini, opencode, qwen, kiro, goose, or custom acp)."
};

const permissionModeProp = {
  type: "string",
  enum: ["supervised", "accept_edits", "auto", "full_access"],
  description: "Unified permission mode across engines (supervised, accept_edits, auto, full_access)."
};

const interactionModeProp = {
  type: "string",
  enum: ["default", "plan"],
  description: "Interaction mode: 'default' (execute) or 'plan' (propose plan before edits)."
};

const serviceTierProp = {
  type: "string",
  enum: ["default", "fast"],
  description: "Optional service tier (e.g. 'fast' for Codex fast mode)."
};

const reasoningEffortProp = {
  type: "string",
  enum: ["low", "medium", "high", "xhigh", "max", "ultra"],
  description: "Optional reasoning/thinking effort level for engines that support separate effort settings (e.g. codex, claude)."
};

const cwdProp = {
  type: "string",
  minLength: 1,
  maxLength: 1024,
  description: "Workspace-relative directory where the CLI will run (defaults to '.'), or an absolute path inside settings.allowedWorkspaceRoots when explicitly configured. In Group worktree sessions, '.' resolves to the member's isolated worktree."
};

const attachmentsProp = {
  type: "array",
  maxItems: 12,
  description: "Optional file/image attachment references passed to the external CLI (max 12).",
  items: {
    type: "object",
    properties: {
      attachmentId: { ...shortStr, description: "Unique attachment identifier." },
      path: { type: "string", minLength: 1, maxLength: 2048, description: "Path to the attachment file." },
      fileName: { ...shortStr, description: "Display file name of the attachment." },
      mimeType: { ...shortStr, description: "Optional MIME type (defaults to application/octet-stream)." },
      bytes: { type: "integer", minimum: 0, description: "Optional file size in bytes." }
    },
    required: ["attachmentId", "path", "fileName"],
    additionalProperties: false
  }
};

const serviceBinding = { id: SERVICE_ID, method: "tool" };

const tool = (
  name: string,
  description: string,
  inputSchema: unknown,
  options: {
    riskLevel: "low" | "medium" | "high";
    idempotent: boolean;
    timeoutMs?: number;
    permissions?: Array<{ name: string }>;
  }
) => ({
  name,
  description,
  service: serviceBinding,
  inputSchema,
  permissions: options.permissions ?? [],
  riskLevel: options.riskLevel,
  idempotent: options.idempotent,
  requiresApproval: false,
  timeoutMs: options.timeoutMs ?? 60_000,
  resultBudget: { maxInlineBytes: 65_536, overflow: "artifact" }
});

const makeWorkerPrompt = (
  workerName: string,
  engineLabel: string,
  engineInstruction: string
): string => {
  const tInspect = buildPluginToolName(PLUGIN_ID, "inspect");
  const tStart = buildPluginToolName(PLUGIN_ID, "start");
  const tWait = buildPluginToolName(PLUGIN_ID, "wait");
  const tSteer = buildPluginToolName(PLUGIN_ID, "steer");
  const tRespond = buildPluginToolName(PLUGIN_ID, "respond");
  const tStop = buildPluginToolName(PLUGIN_ID, "stop");
  const tRead = buildPluginToolName(PLUGIN_ID, "read");
  const tQueue = buildPluginToolName(PLUGIN_ID, "queue");
  const tFork = buildPluginToolName(PLUGIN_ID, "fork");
  const tHandoff = buildPluginToolName(PLUGIN_ID, "handoff");
  const tUndo = buildPluginToolName(PLUGIN_ID, "undoTurn");
  return (
    `You are the CoTree External CLI Worker (${PLUGIN_ID}.${workerName}) for ${engineLabel}. ` +
    `Load skill ${PLUGIN_ID}.external-cli. ` +
    `Follow the complete managed lifecycle: ${tInspect} -> ${tStart} -> ${tWait} (prefer mode='subscribe' for long-running tasks so host session.wake wakes you on cli.session.updated with zero polling timeout) -> ${tSteer} / ${tQueue} -> ${tRespond} -> ${tStop} / ${tRead} (plus ${tFork}, ${tHandoff}, ${tUndo} when appropriate). ` +
    `${engineInstruction} ` +
    `Never fabricate or silently assume unsupported engine capabilities: check ${tInspect} capabilities, unsupported, and authStatus first; if a tool reports unsupported=true or degradedReason, report it honestly and use the stated alternative. ` +
    `Never auto-approve destructive or out-of-scope interventions; escalate them clearly. ` +
    `Verify real workspace files and test outcomes independently before claiming completion, stop long-lived CLI processes when finished unless asked to keep them alive, and report cliSessionId, observed evidence, and any open gaps honestly.`
  );
};

export function createManifest() {
  return {
    manifestVersion: 4,
    sdk: {
      apiVersion: 1,
      requiredCapabilities: [
        "process.inspect",
        "process.execute",
        "process.spawn",
        "process.read",
        "process.write",
        "process.end",
        "process.stop",
        "services.call",
        "services.state"
      ]
    },
    id: PLUGIN_ID,
    name: "外部 Agent CLI 管理器",
    version: PLUGIN_VERSION,
    description:
      "托管 Codex CLI、Claude Code CLI、Antigravity CLI (agy)、Gemini CLI、OpenCode CLI、Qwen Code CLI 及通用 ACP Agent 的完整生命周期（启动、等待、运行中插话、排队、Plan 规划、审批干预、跨引擎交接与 Turn 级检查点），提供右侧 Sidecar 监控栏与主画布多引擎会话内容展示页，原生支持单会话与 Group Session worktree 协作。",
    minKernelVersion: "0.1.0",
    entry: "dist/index.mjs",
    presentation: {
      icon: "assets/icon.svg",
      readme: "README.md"
    },
    publisher: {
      id: "cotree",
      displayName: "CoTree"
    },
    execution: {
      runtime: "node",
      abi: "cotree.plugin.tool.v2",
      isolation: "brokered-process",
      resources: {
        memoryMb: 512,
        maxCapabilityRequests: 512,
        maxConcurrentCapabilities: 16,
        maxCapabilityOutputBytes: 8_388_608,
        maxStdoutBytes: 8_388_608,
        maxStorageBytes: 16_777_216
      }
    },
    capabilities: {
      tools: true,
      services: true,
      skills: true,
      agents: true,
      ui: true,
      evals: true
    },
    permissions: {
      filesystem: {
        read: [".", "**"]
      },
      shell: "none",
      browser: "none",
      nativeExecutables: [
        "codex",
        "claude",
        "antigravity",
        "gemini",
        "opencode",
        "qwen",
        "kiro",
        "goose",
        "acp",
        "aider",
        "cline",
        "cursor-agent",
        "copilot",
        "amp",
        "droid",
        "git"
      ],
      processEnvironment: [
        "HTTP_PROXY",
        "HTTPS_PROXY",
        "ALL_PROXY",
        "NO_PROXY",
        "CLAUDE_CODE_GIT_BASH_PATH",
        "CODEX_HOME",
        "AGY_ADC_AUTH",
        "NO_COLOR",
        "CLICOLOR",
        "MISE_OFFLINE",
        "CLAUDE_CODE_AUTO_CONNECT_IDE",
        "ENABLE_CLAUDEAI_MCP_SERVERS",
        "CLAUDE_CODE_ENTRYPOINT"
      ],
      processEnvironmentInherit: [
        "ANTHROPIC_AUTH_TOKEN",
        "ANTHROPIC_BASE_URL",
        "ANTHROPIC_MODEL",
        "ANTHROPIC_API_KEY",
        "OPENAI_API_KEY",
        "OPENAI_BASE_URL",
        "OPENAI_MODEL",
        "GEMINI_API_KEY",
        "GOOGLE_API_KEY",
        "GOOGLE_APPLICATION_CREDENTIALS",
        "DASHSCOPE_API_KEY",
        "QWEN_API_KEY",
        "QWEN_MODEL",
        "OPENROUTER_API_KEY",
        "DEEPSEEK_API_KEY",
        "ZHIPU_API_KEY",
        "GROQ_API_KEY",
        "XAI_API_KEY",
        "OPENCODE_API_KEY",
        "OPENCODE_CONFIG",
        "OPENCODE_CONFIG_DIR",
        "OPENCODE_MODEL",
        "AGY_ADC_AUTH",
        "HTTP_PROXY",
        "HTTPS_PROXY",
        "ALL_PROXY",
        "NO_PROXY",
        "SSL_CERT_FILE",
        "NODE_EXTRA_CA_CERTS",
        "CLAUDE_CODE_GIT_BASH_PATH",
        "CODEX_HOME"
      ],
      services: [SERVICE_ID],
      hostCapabilities: ["tool.capability", "session.wake"],
      settings: ["read"],
      ui: {
        customViews: true
      },
      storage: {
        maxBytes: 16_777_216
      },
      tools: [
        "SessionQuery",
        "SessionDelegate",
        "SessionMessage",
        "SessionControl",
        "SessionWorktree"
      ]
    },
    settings: {
      scopes: ["user", "workspace"],
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          allowedWorkspaceRoots: {
            type: "array",
            maxItems: 32,
            items: { type: "string", minLength: 1, maxLength: 1024 },
            description: "Additional host-verified absolute workspace root directories permitted for CLI cwd (default empty: caller workspace only)."
          },
          extraEnvAllowlist: {
            type: "array",
            maxItems: 64,
            items: { type: "string", pattern: "^[A-Za-z_][A-Za-z0-9_]{0,127}$" },
            description: "Extra host environment variable names inherited directly into spawned CLIs (values never enter plugin JS or logs)."
          },
          defaultPermissionMode: {
            type: "string",
            enum: ["supervised", "accept_edits", "auto", "full_access"],
            description: "Default permission mode for new CLI sessions (defaults to 'supervised'; 'auto'/'full_access' must be explicitly chosen)."
          },
          acpSilenceTimeoutMs: {
            type: "integer",
            minimum: 60_000,
            maximum: 3_600_000,
            description: "Activity-renewed silence timeout in ms for ACP session/prompt turns (default 900000, range 60000..3600000)."
          },
          historyLimits: {
            type: "object",
            additionalProperties: false,
            properties: {
              maxSessions: { type: "integer", minimum: 1, maximum: 500 },
              maxTurnsPerSession: { type: "integer", minimum: 1, maximum: 500 }
            },
            description: "Persisted session & turn history retention limits (default 48 sessions / 64 turns, max 500 / 500)."
          },
          acpCommandOverride: {
            type: "string",
            maxLength: 128,
            description: "Optional default command override for engine='acp' (must match declared nativeExecutables)."
          },
          customCliAllowlist: {
            type: "array",
            maxItems: 32,
            items: { type: "string", minLength: 1, maxLength: 128 },
            description: "Optional allowlist of executable IDs/commands permitted for engine='acp' command override."
          }
        }
      },
      defaults: {
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
      }
    },
    nativeExecutables: [
      {
        id: "codex",
        source: "system",
        command: "codex",
        searchPaths: [
          "${LOCALAPPDATA}/Microsoft/WinGet/Links/codex",
          "${USERPROFILE}/AppData/Roaming/npm/codex",
          "${USERPROFILE}/.local/bin/codex",
          "${HOME}/.local/bin/codex",
          "${HOME}/.npm-global/bin/codex",
          "/usr/local/bin/codex",
          "/opt/homebrew/bin/codex"
        ],
        argumentPolicy: { mode: "any" }
      },
      {
        id: "claude",
        source: "system",
        command: "claude",
        searchPaths: [
          "${USERPROFILE}/AppData/Roaming/npm/claude",
          "${USERPROFILE}/.local/bin/claude",
          "${HOME}/.local/bin/claude",
          "${HOME}/.npm-global/bin/claude",
          "/usr/local/bin/claude",
          "/opt/homebrew/bin/claude"
        ],
        argumentPolicy: { mode: "any" }
      },
      {
        id: "antigravity",
        source: "system",
        command: "agy",
        searchPaths: [
          "${LOCALAPPDATA}/agy/bin/agy",
          "${USERPROFILE}/.local/bin/agy",
          "${HOME}/.local/bin/agy",
          "/usr/local/bin/agy",
          "/opt/homebrew/bin/agy"
        ],
        argumentPolicy: { mode: "any" }
      },
      {
        id: "gemini",
        source: "system",
        command: "gemini",
        searchPaths: [
          "${USERPROFILE}/AppData/Roaming/npm/gemini",
          "${USERPROFILE}/.local/bin/gemini",
          "${HOME}/.local/bin/gemini",
          "/usr/local/bin/gemini",
          "/opt/homebrew/bin/gemini"
        ],
        argumentPolicy: { mode: "any" }
      },
      {
        id: "opencode",
        source: "system",
        command: "opencode",
        searchPaths: [
          "${USERPROFILE}/.opencode/bin/opencode",
          "${USERPROFILE}/AppData/Roaming/npm/opencode",
          "${USERPROFILE}/.local/bin/opencode",
          "${HOME}/.opencode/bin/opencode",
          "${HOME}/.local/bin/opencode",
          "/usr/local/bin/opencode",
          "/opt/homebrew/bin/opencode"
        ],
        argumentPolicy: { mode: "any" }
      },
      {
        id: "qwen",
        source: "system",
        command: "qwen",
        searchPaths: [
          "${USERPROFILE}/AppData/Roaming/npm/qwen",
          "${LOCALAPPDATA}/Microsoft/WinGet/Links/qwen",
          "${USERPROFILE}/.local/bin/qwen",
          "${HOME}/.local/bin/qwen",
          "${HOME}/.npm-global/bin/qwen",
          "/usr/local/bin/qwen",
          "/opt/homebrew/bin/qwen"
        ],
        argumentPolicy: { mode: "any" }
      },
      {
        id: "kiro",
        source: "system",
        command: "kiro-cli",
        searchPaths: [
          "${USERPROFILE}/.local/bin/kiro-cli",
          "${HOME}/.local/bin/kiro-cli",
          "/usr/local/bin/kiro-cli",
          "/opt/homebrew/bin/kiro-cli"
        ],
        argumentPolicy: { mode: "any" }
      },
      {
        id: "goose",
        source: "system",
        command: "goose",
        searchPaths: [
          "${USERPROFILE}/.local/bin/goose",
          "${HOME}/.local/bin/goose",
          "/usr/local/bin/goose",
          "/opt/homebrew/bin/goose"
        ],
        argumentPolicy: { mode: "any" }
      },
      {
        id: "acp",
        source: "system",
        command: "acp-agent",
        searchPaths: [
          "${USERPROFILE}/.local/bin/acp-agent",
          "${HOME}/.local/bin/acp-agent",
          "/usr/local/bin/acp-agent",
          "/opt/homebrew/bin/acp-agent"
        ],
        argumentPolicy: { mode: "any" }
      },
      {
        id: "aider",
        source: "system",
        command: "aider",
        argumentPolicy: { mode: "any" }
      },
      {
        id: "cline",
        source: "system",
        command: "cline",
        argumentPolicy: { mode: "any" }
      },
      {
        id: "cursor-agent",
        source: "system",
        command: "cursor-agent",
        argumentPolicy: { mode: "any" }
      },
      {
        id: "copilot",
        source: "system",
        command: "copilot",
        argumentPolicy: { mode: "any" }
      },
      {
        id: "amp",
        source: "system",
        command: "amp",
        argumentPolicy: { mode: "any" }
      },
      {
        id: "droid",
        source: "system",
        command: "droid",
        argumentPolicy: { mode: "any" }
      },
      {
        id: "git",
        source: "system",
        command: "git",
        searchPaths: [
          "C:/Program Files/Git/cmd/git.exe",
          "C:/Program Files/Git/bin/git.exe",
          "/usr/bin/git",
          "/usr/local/bin/git",
          "/opt/homebrew/bin/git"
        ],
        argumentPolicy: { mode: "any" }
      }
    ],
    services: [
      {
        id: SERVICE_ID,
        entry: "dist/service.mjs",
        runtime: "node",
        protocol: "cotree.plugin.service.v1",
        workspaceScope: "control",
        activationEvents: [
          `onView:${PLUGIN_ID}.panel`,
          `onView:${PLUGIN_ID}.transcript`
        ],
        idleTimeoutMs: 1_800_000,
        hostCapabilities: ["tool.capability", "session.wake"],
        resources: {
          memoryMb: 512,
          maxPendingCalls: 128,
          maxEventBytes: 1_048_576
        }
      }
    ],
    tools: [
      tool(
        "inspect",
        "Inspect locally installed external agent CLIs across all 9 engines (codex, claude, antigravity, gemini, opencode, qwen, kiro, goose, acp), their binary/version/auth preflight status, interactive capabilities & unsupported lists, dynamically discovered per-CLI model catalogs, saved preferences, resource quotas, and all CoTree-managed CLI sessions in this workspace control plane. For single-session tasks, call this and PluginCoTreeExternalCliStart directly from the main session via ToolSearch instead of spawning a wrapper child agent.",
        schema({
          includeHistory: {
            type: "boolean",
            description: "Include persisted historical CoTree-managed sessions from checkpoints (default true)."
          },
          includeModels: {
            type: "boolean",
            description: "Include per-CLI available model catalogs and reasoning effort options (default true; cached with 5-minute TTL)."
          },
          refreshModels: {
            type: "boolean",
            description: "Bypass the model catalog cache and re-probe live CLI models."
          },
          engine: engineProp
        }),
        { riskLevel: "low", idempotent: true, timeoutMs: 45_000 }
      ),
      tool(
        "start",
        "Start a managed external agent CLI session across all 9 supported engines (codex, claude, antigravity, gemini, opencode, qwen, kiro, goose, acp) directly from the current session or Group worktree. Returns cliSessionId and initial status immediately; each CLI uses its own configured tools/web search/defaults natively so you do not need to probe `--help` via Bash first. Call inspect first when choosing a non-default model ID or checking engine availability.",
        schema(
          {
            engine: engineProp,
            prompt: { ...str, description: "Initial task or prompt to send to the external agent CLI." },
            cwd: cwdProp,
            mode: {
              type: "string",
              enum: ["interactive", "oneshot"],
              description: "Execution mode: 'interactive' (default, keeps persistent session for steer/interrupt/approvals) or 'oneshot'."
            },
            model: {
              ...shortStr,
              description: "Optional model identifier for the target CLI (call inspect first to discover valid model IDs for each CLI)."
            },
            reasoningEffort: reasoningEffortProp,
            permissionMode: permissionModeProp,
            interactionMode: interactionModeProp,
            serviceTier: serviceTierProp,
            approvalPolicy: {
              type: "string",
              enum: [
                "on-request",
                "untrusted",
                "on-failure",
                "never",
                "default",
                "acceptEdits",
                "accept-edits",
                "bypassPermissions",
                "auto",
                "plan",
                "dontAsk"
              ],
              description: "Approval or permission mode for the external CLI."
            },
            sandbox: {
              type: "string",
              enum: ["workspace-write", "read-only", "danger-full-access"],
              description: "Sandbox policy for codex threads (or enables --sandbox on antigravity when not danger-full-access)."
            },
            resumeSessionId: {
              ...shortStr,
              description: "Optional external threadId (codex), session_id (claude), or conversation_id (antigravity) to resume."
            },
            label: {
              ...shortStr,
              description: "Human-friendly label displayed in session lists, Sidecar, and Transcript view."
            },
            attachments: attachmentsProp,
            command: {
              ...shortStr,
              description: "Optional executable ID or command override for engine='acp' (must match settings.customCliAllowlist and declared nativeExecutables such as acp-agent, aider, cline, cursor-agent, copilot, amp, droid; arbitrary absolute paths are rejected)."
            },
            args: {
              type: "array",
              maxItems: 32,
              items: { type: "string", minLength: 1, maxLength: 2048 },
              description: "Optional CLI arguments for engine='acp' command mode (merged ahead of extraArgs)."
            },
            env: {
              type: "object",
              maxProperties: 16,
              additionalProperties: { type: "string", maxLength: 4096 },
              description: "Optional explicit process environment overrides allowed by manifest permissions.processEnvironment."
            },
            extraArgs: {
              type: "array",
              maxItems: 32,
              items: { type: "string", minLength: 1, maxLength: 2048 },
              description: "Optional extra CLI flags passed to the declared executable."
            },
            waitMs: {
              type: "integer",
              minimum: 0,
              maximum: 30_000,
              description: "Optional initial wait budget in ms before returning (defaults to 0)."
            }
          },
          ["engine", "prompt"]
        ),
        {
          riskLevel: "high",
          idempotent: false,
          timeoutMs: 90_000,
          permissions: [{ name: "file.read" }, { name: "process.exec" }]
        }
      ),
      tool(
        "wait",
        "Wait for a managed external CLI session to complete its current turn, request an approval/input intervention, exit, or emit new progress events. Prefer mode='subscribe' for long-running tasks: it returns immediately with a subscriptionId and pushes cli.session.updated via host session.wake with no 9/15-minute polling cap. Omitting mode defaults to 'block' (compatibility fallback bounded to 870s). Aborting or steering a wait does NOT kill the underlying external CLI process.",
        schema(
          {
            cliSessionId: { ...shortStr, description: "Managed CLI session ID returned by start." },
            until: {
              type: "string",
              enum: ["turn_or_intervention", "change", "settled"],
              description: "Wait condition: 'turn_or_intervention' (default), 'change' (any new event after afterSeq), or 'settled' (process exited)."
            },
            afterSeq: {
              type: "integer",
              minimum: 0,
              description: "Return events strictly after this sequence number."
            },
            mode: {
              type: "string",
              enum: ["block", "subscribe"],
              description: "Wait mode: 'subscribe' (recommended for long tasks; returns pending subscriptionId immediately and wakes the caller via push event) or 'block' (default compatibility fallback, bounded to 870s)."
            },
            timeoutMs: {
              type: "integer",
              minimum: 100,
              maximum: 870_000,
              description: "Bounded wait timeout in ms for mode='block' compatibility fallback (defaults to 60000, max 870000; ignored by mode='subscribe')."
            },
            eventLimit: {
              type: "integer",
              minimum: 1,
              maximum: 200,
              description: "Max timeline events to include in the response or push notification (defaults to 50)."
            }
          },
          ["cliSessionId"]
        ),
        { riskLevel: "low", idempotent: true, timeoutMs: 890_000 }
      ),
      tool(
        "steer",
        "Steer or send a follow-up instruction to a managed external CLI session mid-run or between turns, optionally switching model or reasoningEffort for the next turn. Codex switches model/effort live on turn/start; Antigravity and Claude seamlessly resume with --conversation/--resume when model changes.",
        schema(
          {
            cliSessionId: { ...shortStr, description: "Managed CLI session ID." },
            message: { ...str, description: "Steering or follow-up instruction." },
            strategy: {
              type: "string",
              enum: ["auto", "in_turn", "next_turn", "interrupt_and_resume", "queue"],
              description: "Delivery strategy (defaults to 'auto'; use 'queue' to enqueue behind an active turn)."
            },
            model: {
              ...shortStr,
              description: "Optional new model ID to switch to for this follow-up turn and subsequent turns."
            },
            reasoningEffort: reasoningEffortProp,
            permissionMode: permissionModeProp,
            interactionMode: interactionModeProp,
            serviceTier: serviceTierProp,
            attachments: attachmentsProp
          },
          ["cliSessionId", "message"]
        ),
        {
          riskLevel: "high",
          idempotent: false,
          timeoutMs: 60_000,
          permissions: [{ name: "process.exec" }]
        }
      ),
      tool(
        "respond",
        "Respond to a pending approval request or user-input intervention on a managed external CLI session.",
        schema(
          {
            cliSessionId: { ...shortStr, description: "Managed CLI session ID." },
            interventionId: {
              ...shortStr,
              description: "Specific pending intervention ID; defaults to the oldest pending intervention."
            },
            decision: {
              type: "string",
              enum: ["accept", "accept_for_session", "decline", "cancel"],
              description: "Decision for approval interventions."
            },
            answers: {
              type: "object",
              additionalProperties: {
                oneOf: [
                  { type: "string", maxLength: 8000 },
                  { type: "array", maxItems: 16, items: { type: "string", maxLength: 4000 } }
                ]
              },
              description: "Structured answers keyed by question id for user-input interventions."
            },
            text: {
              type: "string",
              maxLength: 8000,
              description: "Freeform response text for single-question or raw stdin interventions."
            }
          },
          ["cliSessionId"]
        ),
        {
          riskLevel: "high",
          idempotent: false,
          timeoutMs: 30_000,
          permissions: [{ name: "process.exec" }]
        }
      ),
      tool(
        "stop",
        "Interrupt the active turn (mode='interrupt', keeping the CLI session reusable where supported) or kill the managed CLI process group (mode='kill', confirming executionSettled=true).",
        schema(
          {
            cliSessionId: { ...shortStr, description: "Managed CLI session ID." },
            mode: {
              type: "string",
              enum: ["interrupt", "kill"],
              description: "Stop mode: 'interrupt' (soft turn interrupt, default) or 'kill' (terminate OS process tree)."
            },
            forceAfterMs: {
              type: "integer",
              minimum: 500,
              maximum: 30_000,
              description: "Optional grace period for soft interrupt observation in ms (defaults to 5000)."
            }
          },
          ["cliSessionId"]
        ),
        {
          riskLevel: "high",
          idempotent: false,
          timeoutMs: 45_000,
          permissions: [{ name: "process.exec" }]
        }
      ),
      tool(
        "read",
        "Read the current snapshot, structured transcript turns/blocks, paginated timeline events, pending interventions, and optional raw stdout/stderr tail of a managed CLI session, or list all managed sessions when cliSessionId is omitted.",
        schema({
          cliSessionId: {
            ...shortStr,
            description: "Managed CLI session ID. Omit to list all live & historical managed sessions."
          },
          afterSeq: {
            type: "integer",
            minimum: 0,
            description: "Return timeline events strictly after this sequence number."
          },
          limit: {
            type: "integer",
            minimum: 1,
            maximum: 200,
            description: "Maximum number of events to return (defaults to 50)."
          },
          includeTranscript: {
            type: "boolean",
            description: "Include full structured transcript turns and blocks."
          },
          includeRawTail: {
            type: "boolean",
            description: "Include bounded raw stdout/stderr tail snippets."
          }
        }),
        { riskLevel: "low", idempotent: true, timeoutMs: 30_000 }
      ),
      tool(
        "handoff",
        "Hand off a managed external CLI session's structured turn context to another engine (e.g., claude -> codex or codex -> opencode). Uses native Codex thread/inject_items where supported or structured portable context prefix otherwise.",
        schema(
          {
            cliSessionId: { ...shortStr, description: "Source managed CLI session ID." },
            targetEngine: engineProp,
            targetModel: { ...shortStr, description: "Optional model ID for the target engine." },
            reasoningEffort: reasoningEffortProp,
            prompt: { ...str, description: "Optional initial prompt to run immediately on the handed-off session." },
            label: { ...shortStr, description: "Optional label for the new handed-off session." }
          },
          ["cliSessionId", "targetEngine"]
        ),
        {
          riskLevel: "high",
          idempotent: false,
          timeoutMs: 120_000,
          permissions: [{ name: "file.read" }, { name: "process.exec" }]
        }
      ),
      tool(
        "fork",
        "Fork a managed external CLI session at a specific turn index (defaults to latest turn), using native engine fork where supported or portable context snapshot otherwise.",
        schema(
          {
            cliSessionId: { ...shortStr, description: "Source managed CLI session ID." },
            atTurnIndex: {
              type: "integer",
              minimum: 0,
              description: "Optional turn index to fork from (defaults to the latest turn)."
            },
            label: { ...shortStr, description: "Optional label for the forked session." }
          },
          ["cliSessionId"]
        ),
        {
          riskLevel: "high",
          idempotent: false,
          timeoutMs: 120_000,
          permissions: [{ name: "file.read" }, { name: "process.exec" }]
        }
      ),
      tool(
        "compact",
        "Trigger native context compaction on a managed external CLI session (Codex thread/compact/start or Claude /compact). Returns explicit unsupported + alternatives when the engine has no native compaction.",
        schema(
          {
            cliSessionId: { ...shortStr, description: "Managed CLI session ID." }
          },
          ["cliSessionId"]
        ),
        {
          riskLevel: "medium",
          idempotent: false,
          timeoutMs: 60_000,
          permissions: [{ name: "process.exec" }]
        }
      ),
      tool(
        "undoTurn",
        "Undo a managed external CLI turn and optionally restore files from CoTree's hidden Git checkpoint. Outside an isolated worktree, revertFiles=true requires forceRevertFiles=true to guard against overwriting main workspace files.",
        schema(
          {
            cliSessionId: { ...shortStr, description: "Managed CLI session ID." },
            turnIndex: {
              type: "integer",
              minimum: 1,
              description: "Optional 1-based turn index to undo from (defaults to latest turn)."
            },
            revertFiles: {
              type: "boolean",
              description: "Also restore workspace files to the turn's captured hidden Git checkpoint (default false)."
            },
            forceRevertFiles: {
              type: "boolean",
              description: "Explicit confirmation required to revert files when the session runs in the main workspace rather than an isolated worktree."
            }
          },
          ["cliSessionId"]
        ),
        {
          riskLevel: "high",
          idempotent: false,
          timeoutMs: 120_000,
          permissions: [{ name: "file.read" }, { name: "process.exec" }]
        }
      ),
      tool(
        "queue",
        "Manage the follow-up message queue of a managed external CLI session: add, edit, remove, clear, resume draining, or promote a queued item to execute immediately.",
        schema(
          {
            cliSessionId: { ...shortStr, description: "Managed CLI session ID." },
            action: {
              type: "string",
              enum: ["add", "edit", "remove", "clear", "resume", "promote"],
              description: "Queue operation to perform."
            },
            message: { ...str, description: "Message text (required for action='add' and action='edit')." },
            queueId: { ...shortStr, description: "Queued item ID (required for 'edit'/'remove', optional for 'promote')." },
            model: { ...shortStr, description: "Optional model override for action='add'." },
            reasoningEffort: reasoningEffortProp,
            permissionMode: permissionModeProp,
            interactionMode: interactionModeProp,
            serviceTier: serviceTierProp,
            attachments: attachmentsProp
          },
          ["cliSessionId", "action"]
        ),
        {
          riskLevel: "medium",
          idempotent: false,
          timeoutMs: 30_000,
          permissions: [{ name: "process.exec" }]
        }
      ),
      tool(
        "listNativeSessions",
        "List native provider sessions discovered from local CLI engines (e.g., Codex threads or active ACP sessions) that can be imported via importNative.",
        schema({
          engine: engineProp,
          limit: {
            type: "integer",
            minimum: 1,
            maximum: 100,
            description: "Maximum number of native sessions to list per engine (defaults to 25)."
          }
        }),
        { riskLevel: "low", idempotent: true, timeoutMs: 45_000 }
      ),
      tool(
        "importNative",
        "Import an existing external CLI native session ID into CoTree's managed session control plane, optionally auto-resuming it.",
        schema(
          {
            engine: engineProp,
            externalSessionId: { ...shortStr, description: "Native thread/session ID reported by the CLI or listNativeSessions." },
            title: { ...shortStr, description: "Optional display label for the imported managed session." },
            model: { ...shortStr, description: "Optional model override when resuming." },
            autoResume: {
              type: "boolean",
              description: "Whether to immediately resume the imported session (default true; false imports as history record)."
            }
          },
          ["engine", "externalSessionId"]
        ),
        {
          riskLevel: "medium",
          idempotent: false,
          timeoutMs: 60_000,
          permissions: [{ name: "file.read" }, { name: "process.exec" }]
        }
      )
    ],
    skills: [
      {
        name: `${PLUGIN_ID}.external-cli`,
        description:
          "直接托管并控制外部 Agent CLI（Codex CLI、Claude Code CLI、Antigravity CLI / agy、Gemini CLI、OpenCode CLI、Qwen Code CLI 及通用 ACP Agent）的完整生命周期：主会话默认直接调用插件工具启动、等待、插话、审批干预与终止（无需额外套子 Agent），同时支持多任务并行与 Group worktree 委派。",
        path: "skills/external-cli/SKILL.md",
        disableModelInvocation: false,
        retrievalHints: [
          "codex",
          "codex cli",
          "派遣 codex",
          "用 codex",
          "claude cli",
          "用 claude",
          "antigravity cli",
          "agy",
          "gemini cli",
          "opencode",
          "opencode cli",
          "qwen",
          "qwen cli",
          "qwen code",
          "通义千问 cli",
          "kiro",
          "goose",
          "acp",
          "外部 cli",
          "external agent cli",
          "插话",
          "steer cli",
          "handoff",
          "fork",
          "undoTurn",
          "compact",
          "queue"
        ],
        tags: ["external-cli", "codex", "claude", "antigravity", "gemini", "opencode", "qwen", "kiro", "goose", "acp", "group-session"]
      }
    ],
    agents: [
      {
        name: `${PLUGIN_ID}.codex-worker`,
        family: "execution",
        templateRole: "implementer",
        description: "【并行/隔离 worktree 专用】在独立 worktree 或 Group Session 中并行运行 Codex CLI（app-server）子任务。普通单会话直接给 Codex 下命令时，请由主会话通过 ToolSearch 直接调用 PluginCoTreeExternalCliStart / Wait / Steer，无需先派子 Agent。",
        toolMode: "all",
        recommendedSkills: [`${PLUGIN_ID}.external-cli`],
        systemPrompt: makeWorkerPrompt(
          "codex-worker",
          "Codex CLI (codex app-server)",
          `Run with engine='codex' in your assigned workspace or Group worktree (cwd '.'). Call ${buildPluginToolName(PLUGIN_ID, "inspect")} before picking a non-default model or reasoningEffort, prefer interactive mode, use ${buildPluginToolName(PLUGIN_ID, "wait")}(mode='subscribe') for long runs, and use ${buildPluginToolName(PLUGIN_ID, "steer")} for mid-turn guidance or live model/effort switches.`
        )
      },
      {
        name: `${PLUGIN_ID}.claude-worker`,
        family: "execution",
        templateRole: "implementer",
        description: "【并行/隔离 worktree 专用】在独立 worktree 或 Group Session 中并行运行 Claude Code CLI（Agent SDK / stream-json）子任务。普通单会话请由主会话通过 ToolSearch 直接调用 PluginCoTreeExternalCliStart，无需先派子 Agent。",
        toolMode: "all",
        recommendedSkills: [`${PLUGIN_ID}.external-cli`],
        systemPrompt: makeWorkerPrompt(
          "claude-worker",
          "Claude Code CLI (Agent SDK)",
          `Run with engine='claude' in your assigned workspace or Group worktree (cwd '.'). Check ${buildPluginToolName(PLUGIN_ID, "inspect")} for Claude authStatus and models before specifying model or reasoningEffort; leave model empty for Claude's default. Forward mid-run guidance via ${buildPluginToolName(PLUGIN_ID, "steer")} and handle ExitPlanMode / permission interventions honestly via ${buildPluginToolName(PLUGIN_ID, "respond")}.`
        )
      },
      {
        name: `${PLUGIN_ID}.antigravity-worker`,
        family: "execution",
        templateRole: "implementer",
        description: "【并行/隔离 worktree 专用】在独立 worktree 或 Group Session 中并行运行 Antigravity CLI（agy stream-json）子任务。普通单会话请由主会话通过 ToolSearch 直接调用 PluginCoTreeExternalCliStart，无需先派子 Agent。",
        toolMode: "all",
        recommendedSkills: [`${PLUGIN_ID}.external-cli`],
        systemPrompt: makeWorkerPrompt(
          "antigravity-worker",
          "Antigravity CLI (agy stream-json)",
          `Run with engine='antigravity' in your assigned workspace or Group worktree (cwd '.'). Check ${buildPluginToolName(PLUGIN_ID, "inspect")} for live 'agy models'. Note that Antigravity lacks structured JSON-RPC approvals and reasoningEffort/fast mode: use freeform text with ${buildPluginToolName(PLUGIN_ID, "respond")} when prompted, and use ${buildPluginToolName(PLUGIN_ID, "stop")}(mode='kill') if soft interrupt is unconfirmed (resumable via --conversation).`
        )
      },
      {
        name: `${PLUGIN_ID}.opencode-worker`,
        family: "execution",
        templateRole: "implementer",
        description: "【并行/隔离 worktree 专用】在独立 worktree 或 Group Session 中并行运行 OpenCode CLI（ACP）子任务。",
        toolMode: "all",
        recommendedSkills: [`${PLUGIN_ID}.external-cli`],
        systemPrompt: makeWorkerPrompt(
          "opencode-worker",
          "OpenCode CLI (ACP)",
          `Run with engine='opencode' in your assigned workspace or Group worktree (cwd '.'). OpenCode does not support mid-turn steering (midTurnSteer=false); during an active turn ${buildPluginToolName(PLUGIN_ID, "steer")} automatically degrades to 'queue' (or pass strategy='interrupt_and_resume' to cancel immediately). OpenCode supports ACP reasoningEffort and native fork.`
        )
      },
      {
        name: `${PLUGIN_ID}.qwen-worker`,
        family: "execution",
        templateRole: "implementer",
        description: "【并行/隔离 worktree 专用】在独立 worktree 或 Group Session 中并行运行 Qwen Code CLI（ACP / stream-json）子任务。",
        toolMode: "all",
        recommendedSkills: [`${PLUGIN_ID}.external-cli`],
        systemPrompt: makeWorkerPrompt(
          "qwen-worker",
          "Qwen Code CLI (ACP)",
          `Run with engine='qwen' in your assigned workspace or Group worktree (cwd '.'). Qwen does not support mid-turn steering, reasoningEffort, or fast mode; rely on automatic 'queue' degradation (or strategy='interrupt_and_resume') and CoTree hidden Git checkpoints for ${buildPluginToolName(PLUGIN_ID, "undoTurn")}.`
        )
      },
      {
        name: `${PLUGIN_ID}.gemini-worker`,
        family: "execution",
        templateRole: "implementer",
        description: "【并行/隔离 worktree 专用】在独立 worktree 或 Group Session 中并行运行 Gemini CLI（ACP / stream-json）子任务。",
        toolMode: "all",
        recommendedSkills: [`${PLUGIN_ID}.external-cli`],
        systemPrompt: makeWorkerPrompt(
          "gemini-worker",
          "Gemini CLI (ACP)",
          `Run with engine='gemini' in your assigned workspace or Group worktree (cwd '.'). Gemini does not support mid-turn steering, native plan mode, reasoningEffort, or fast mode; rely on automatic queue degradation and honest unsupported reporting.`
        )
      },
      {
        name: `${PLUGIN_ID}.kiro-worker`,
        family: "execution",
        templateRole: "implementer",
        description: "【并行/隔离 worktree 专用】在独立 worktree 或 Group Session 中并行运行 Kiro CLI（ACP）子任务。",
        toolMode: "all",
        recommendedSkills: [`${PLUGIN_ID}.external-cli`],
        systemPrompt: makeWorkerPrompt(
          "kiro-worker",
          "Kiro CLI (ACP)",
          `Run with engine='kiro' in your assigned workspace or Group worktree (cwd '.'). Verify 'kiro-cli' availability and authStatus via ${buildPluginToolName(PLUGIN_ID, "inspect")} first; Kiro supports ACP structured approvals, softInterrupt, midTurnSteer, and native fork, while rollback uses CoTree hidden Git checkpoints.`
        )
      },
      {
        name: `${PLUGIN_ID}.goose-worker`,
        family: "execution",
        templateRole: "implementer",
        description: "【并行/隔离 worktree 专用】在独立 worktree 或 Group Session 中并行运行 Goose CLI（ACP）子任务。",
        toolMode: "all",
        recommendedSkills: [`${PLUGIN_ID}.external-cli`],
        systemPrompt: makeWorkerPrompt(
          "goose-worker",
          "Goose CLI (ACP)",
          `Run with engine='goose' in your assigned workspace or Group worktree (cwd '.'). Goose does not support mid-turn steering, plan mode, image attachments, reasoningEffort, or fast mode; reference workspace files by path in text and report unsupported capabilities honestly.`
        )
      },
      {
        name: `${PLUGIN_ID}.acp-worker`,
        family: "execution",
        templateRole: "implementer",
        description: "【并行/隔离 worktree 专用】运行自定义 ACP Agent（或 settings/nativeExecutables 白名单内的外部 CLI 命令覆盖）子任务。",
        toolMode: "all",
        recommendedSkills: [`${PLUGIN_ID}.external-cli`],
        systemPrompt: makeWorkerPrompt(
          "acp-worker",
          "Custom ACP Agent (engine='acp')",
          `Run with engine='acp' (and optional whitelisted 'command'/'args' from the task brief) in your assigned workspace or Group worktree (cwd '.'). Check ${buildPluginToolName(PLUGIN_ID, "inspect")} optionalExecutables and effectiveSettings.customCliAllowlist before invoking an override command; never attempt unapproved absolute executable paths.`
        )
      },
      {
        name: `${PLUGIN_ID}.cli-worker`,
        family: "execution",
        templateRole: "implementer",
        description: "【通用外部 CLI Worker】根据任务 brief 指定的 engine（codex / claude / antigravity / gemini / opencode / qwen / kiro / goose / acp）执行隔离或并行外部 CLI 任务。",
        toolMode: "all",
        recommendedSkills: [`${PLUGIN_ID}.external-cli`],
        systemPrompt: makeWorkerPrompt(
          "cli-worker",
          "any supported External Agent CLI (engine parameter from task brief)",
          `Read the requested 'engine' (one of codex, claude, antigravity, gemini, opencode, qwen, kiro, goose, acp) and optional 'command'/'model' from the task brief. Call ${buildPluginToolName(PLUGIN_ID, "inspect")} first to confirm the target engine is installed and authenticated before calling ${buildPluginToolName(PLUGIN_ID, "start")}; if unavailable, report the exact missing binary/auth remediation instead of substituting silently.`
        )
      },
      {
        name: `${PLUGIN_ID}.coordinator`,
        family: "coordination",
        templateRole: "planner",
        description: "【Group 多引擎协作】先 inspect 检测本机全部 9 个外部 CLI（codex / claude / antigravity / gemini / opencode / qwen / kiro / goose / acp）可用性与鉴权状态，再按能力拆分并行任务委派给对应 worker（含通用 cli-worker），灵活运用 handoff 与 fork 协作交付。",
        toolMode: "all",
        recommendedSkills: [`${PLUGIN_ID}.external-cli`],
        systemPrompt:
          `You are the CoTree External CLI Coordinator (${PLUGIN_ID}.coordinator). ` +
          `Load skill ${PLUGIN_ID}.external-cli. ` +
          `First call ${buildPluginToolName(PLUGIN_ID, "inspect")} to inspect all 9 engines (codex, claude, antigravity, gemini, opencode, qwen, kiro, goose, acp), their binary availability, version, authStatus, capabilities, unsupported list, model catalogs, and optionalExecutables. ` +
          `In a Group Session, decompose independent tasks and delegate only to verified available engines via SessionDelegate using ${PLUGIN_ID}.codex-worker, ${PLUGIN_ID}.claude-worker, ${PLUGIN_ID}.antigravity-worker, ${PLUGIN_ID}.opencode-worker, ${PLUGIN_ID}.qwen-worker, ${PLUGIN_ID}.gemini-worker, ${PLUGIN_ID}.kiro-worker, ${PLUGIN_ID}.goose-worker, ${PLUGIN_ID}.acp-worker, or generic ${PLUGIN_ID}.cli-worker (passing engine in the task brief) with workspaceIsolation='worktree' where appropriate. ` +
          `Prefer ${buildPluginToolName(PLUGIN_ID, "wait")}(mode='subscribe') for long-running CLI tasks so push wake notifies you without polling timeouts. ` +
          `Use ${buildPluginToolName(PLUGIN_ID, "handoff")} when transferring accumulated context across engines (for example, handing off a plan or partial investigation from Claude/Antigravity to Codex, or switching off an engine missing a needed capability). ` +
          `Use ${buildPluginToolName(PLUGIN_ID, "fork")} when exploring alternative implementation paths from a specific turn without mutating the primary session trajectory. ` +
          `Use SessionMessage / SessionControl to steer workers mid-run, monitor shared status with ${buildPluginToolName(PLUGIN_ID, "inspect")} / ${buildPluginToolName(PLUGIN_ID, "read")}, never fabricate unsupported capabilities, and verify real integrated files and tests before reporting completion.`
      }
    ],
    contributes: {
      commands: [
        {
          id: `${PLUGIN_ID}.open`,
          title: "外部 CLI 侧栏",
          action: {
            kind: "view.open",
            viewId: `${PLUGIN_ID}.panel`
          }
        },
        {
          id: `${PLUGIN_ID}.open-transcript`,
          title: "外部 CLI 会话详情",
          action: {
            kind: "view.open",
            viewId: `${PLUGIN_ID}.transcript`
          }
        },
        {
          id: `${PLUGIN_ID}.open-file`,
          title: "在 CoTree 文件面板打开",
          action: {
            kind: "file.open"
          }
        },
        {
          id: `${PLUGIN_ID}.open-review`,
          title: "在 CoTree 审阅面板查看差异",
          action: {
            kind: "review.open"
          }
        },
        {
          id: `${PLUGIN_ID}.notify`,
          title: "发送外部 CLI 桌面通知",
          action: {
            kind: "notification.show"
          }
        }
      ],
      placements: [
        {
          command: `${PLUGIN_ID}.open`,
          location: "desktop.sidebar.secondary",
          group: "tools",
          order: 40
        },
        {
          command: `${PLUGIN_ID}.open-transcript`,
          location: "desktop.surface.primary",
          group: "tools",
          order: 41
        }
      ]
    },
    ui: {
      designSystem: "cotree.plugin-ui.v1",
      views: [
        {
          id: `${PLUGIN_ID}.panel`,
          title: "外部 CLI 侧栏",
          entry: "ui/index.html",
          location: "desktop.sidebar.secondary"
        },
        {
          id: `${PLUGIN_ID}.transcript`,
          title: "外部 CLI 会话详情",
          entry: "ui/transcript.html",
          location: "desktop.surface.primary"
        }
      ]
    },
    evals: ["evals/smoke.json"],
    integrity: {
      algorithm: "sha256",
      digest: "0".repeat(64)
    }
  };
}
