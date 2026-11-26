import { EventEmitter } from "node:events";
import { PassThrough, Writable } from "node:stream";
import { randomUUID } from "node:crypto";
import {
  query as claudeSdkQuery,
  type Query as ClaudeSdkQuery,
  type SDKMessage,
  type SDKUserMessage,
  type SpawnOptions,
  type SpawnedProcess,
  type PermissionResult
} from "@anthropic-ai/claude-agent-sdk";
import type { PluginServiceContext } from "@cotree/plugin-sdk/service";
import {
  TRANSIENT_READ_RETRY_BACKOFF_MS,
  isFatalProcessReadError,
  mapPermissionModeToClaudeMode,
  stripAnsi,
  truncateText,
  waitForRetryBackoff,
  type CliApprovalDecision,
  type CliAttachmentRef,
  type CliInteractionMode,
  type CliPendingIntervention,
  type CliPermissionMode,
  type CliSlashCommandInfo
} from "../shared.js";
import { normalizeUserInputQuestions, type ParsedProtocolAction } from "../protocols.js";

const CLAUDE_ROLLING_WINDOW_BYTES = 16 * 1024 * 1024;
const CLAUDE_READ_PAGE_BYTES = 1_048_576;

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

class AsyncMessageQueue<T> implements AsyncIterable<T> {
  private readonly items: T[] = [];
  private readonly waiters: Array<(res: IteratorResult<T>) => void> = [];
  private closed = false;

  push(item: T): void {
    if (this.closed) return;
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter({ value: item, done: false });
    } else {
      this.items.push(item);
    }
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    while (this.waiters.length > 0) {
      this.waiters.shift()?.({ value: undefined as unknown as T, done: true });
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: () => {
        if (this.items.length > 0) {
          return Promise.resolve({ value: this.items.shift()!, done: false });
        }
        if (this.closed) {
          return Promise.resolve({ value: undefined as unknown as T, done: true });
        }
        return new Promise<IteratorResult<T>>((resolve) => {
          this.waiters.push(resolve);
        });
      }
    };
  }
}

/**
 * Bridges `@anthropic-ai/claude-agent-sdk`'s `spawnClaudeCodeProcess` hook directly onto
 * CoTree's brokered `context.process.spawn("claude", ...)` so Claude Code executes inside
 * CoTree's ManagedProcessManager job-object isolation & `--permission` sandbox.
 */
class BrokeredClaudeProcess extends EventEmitter implements SpawnedProcess {
  readonly stdin: Writable;
  readonly stdout: PassThrough;
  killed = false;
  exitCode: number | null = null;
  signalCode: NodeJS.Signals | null = null;
  processId = "";

  private writeChain: Promise<void> = Promise.resolve();
  private exitedEmitted = false;
  private readonly spawnReady: Promise<string>;

  constructor(
    private readonly spawnContext: PluginServiceContext,
    private readonly getLifecycleContext: () => PluginServiceContext | undefined,
    private readonly cwdRelative: string,
    spawnOptions: SpawnOptions,
    private readonly onSpawned: (processId: string) => void,
    private readonly onStderr: (chunk: string) => void
  ) {
    super();
    this.stdout = new PassThrough();

    // Only forward manifest-declared non-secret env vars; ANTHROPIC_* secrets are inherited by the host broker.
    const brokerEnv: Record<string, string> = {
      NO_COLOR: "1",
      CLICOLOR: "0",
      MISE_OFFLINE: "1",
      CLAUDE_CODE_AUTO_CONNECT_IDE: "0",
      CLAUDE_CODE_ENTRYPOINT: spawnOptions.env.CLAUDE_CODE_ENTRYPOINT || "sdk-ts"
    };
    if (spawnOptions.env.ENABLE_CLAUDEAI_MCP_SERVERS) {
      brokerEnv.ENABLE_CLAUDEAI_MCP_SERVERS = spawnOptions.env.ENABLE_CLAUDEAI_MCP_SERVERS;
    }

    this.spawnReady = (async () => {
      const spawned = await this.spawnContext.process.spawn("claude", spawnOptions.args, {
        requestKey: `claude-sdk-${randomUUID().slice(0, 10)}`,
        cwd: { kind: "workspace-directory", path: this.cwdRelative },
        env: brokerEnv,
        maxOutputBytes: CLAUDE_ROLLING_WINDOW_BYTES,
        outputPolicy: "rolling"
      });
      this.processId = spawned.processId;
      this.onSpawned(spawned.processId);
      this.startReaderLoop(spawned.processId);
      return spawned.processId;
    })();

    this.spawnReady.catch((err) => {
      const error = err instanceof Error ? err : new Error(String(err));
      this.emit("error", error);
      this.finishExit(1, null);
    });

    this.stdin = new Writable({
      write: (chunk, encoding, callback) => {
        const text = Buffer.isBuffer(chunk) ? chunk.toString("utf8") : Buffer.from(chunk, encoding).toString("utf8");
        this.writeChain = this.writeChain
          .catch(() => undefined)
          .then(async () => {
            const pid = await this.spawnReady;
            const procClient = this.getLifecycleContext()?.process ?? this.spawnContext.process;
            await procClient.write(pid, text);
          });
        this.writeChain.then(() => callback(), (err) => callback(err instanceof Error ? err : new Error(String(err))));
      },
      final: (callback) => {
        this.writeChain = this.writeChain
          .catch(() => undefined)
          .then(async () => {
            const pid = await this.spawnReady;
            const procClient = this.getLifecycleContext()?.process ?? this.spawnContext.process;
            await procClient.end(pid).catch(() => undefined);
          });
        this.writeChain.then(() => callback(), () => callback());
      }
    });

    if (spawnOptions.signal) {
      const onAbort = () => {
        this.kill("SIGTERM");
      };
      if (spawnOptions.signal.aborted) onAbort();
      else spawnOptions.signal.addEventListener("abort", onAbort, { once: true });
    }
  }

  kill(signal: NodeJS.Signals = "SIGTERM"): boolean {
    if (this.killed) return false;
    this.killed = true;
    this.signalCode = signal;
    void this.spawnReady
      .then(async (pid) => {
        const procClient = this.getLifecycleContext()?.process ?? this.spawnContext.process;
        await procClient.stop(pid).catch(() => undefined);
      })
      .catch(() => undefined)
      .finally(() => {
        this.finishExit(this.exitCode, signal);
      });
    return true;
  }

  private finishExit(code: number | null, signal: NodeJS.Signals | null): void {
    if (this.exitedEmitted) return;
    this.exitedEmitted = true;
    this.exitCode = code;
    this.signalCode = signal;
    this.stdout.end();
    this.emit("exit", code, signal);
  }

  private startReaderLoop(boundProcessId: string): void {
    const ctx = this.getLifecycleContext() ?? this.spawnContext;
    void (async () => {
      let cursor = { stdoutOffset: 0, stderrOffset: 0 };
      let prevHadMore = false;
      let consecutiveReadErrors = 0;
      try {
        while (!ctx.signal.aborted && !this.exitedEmitted) {
          let page;
          try {
            page = await ctx.process.read(boundProcessId, {
              cursor,
              maxBytes: CLAUDE_READ_PAGE_BYTES,
              timeoutMs: prevHadMore ? 0 : 250
            });
            consecutiveReadErrors = 0;
          } catch (readError) {
            if (
              ctx.signal.aborted ||
              this.exitedEmitted ||
              isFatalProcessReadError(readError) ||
              consecutiveReadErrors >= TRANSIENT_READ_RETRY_BACKOFF_MS.length
            ) {
              throw readError;
            }
            const delayMs = TRANSIENT_READ_RETRY_BACKOFF_MS[consecutiveReadErrors] ?? 2_000;
            consecutiveReadErrors += 1;
            const waited = await waitForRetryBackoff(delayMs, ctx.signal);
            if (!waited || this.exitedEmitted) return;
            continue;
          }
          cursor = page.cursor;
          prevHadMore = Boolean(page.more);

          if (page.stdout) {
            this.stdout.write(page.stdout);
          }
          if (page.stderr) {
            this.onStderr(stripAnsi(page.stderr));
          }
          if (page.exited || page.executionSettled) {
            if (page.more) continue;
            const sig = typeof page.signal === "string" ? (page.signal as NodeJS.Signals) : null;
            this.finishExit(typeof page.exitCode === "number" ? page.exitCode : sig ? null : 0, sig);
            break;
          }
        }
      } catch (err) {
        if (!this.exitedEmitted) {
          this.onStderr(stripAnsi(err instanceof Error ? err.message : String(err)));
          this.finishExit(1, null);
        }
      }
    })();
  }
}

export type PendingClaudeApprovalResolver = {
  intervention: CliPendingIntervention;
  resolve: (result: PermissionResult) => void;
};

export type ClaudeSdkSessionCallbacks = {
  onProcessId: (processId: string) => void;
  onActions: (actions: ParsedProtocolAction[]) => void;
  onStderr: (chunk: string) => void;
  onSlashCommands?: (commands: CliSlashCommandInfo[]) => void;
  onExit: (exitCode?: number, signal?: string) => void;
};

export class ClaudeSdkSession {
  private readonly inputQueue = new AsyncMessageQueue<SDKUserMessage>();
  private readonly abortController = new AbortController();
  private queryHandle: ClaudeSdkQuery | undefined;
  private brokeredProcess: BrokeredClaudeProcess | undefined;
  private readonly pendingPermissions = new Map<string, PendingClaudeApprovalResolver>();
  private readonly sessionAllowedTools = new Set<string>();
  private closed = false;
  private permissionMode: CliPermissionMode;
  private interactionMode: CliInteractionMode;
  private sessionId: string;
  private model?: string;

  constructor(
    private readonly getLifecycleContext: () => PluginServiceContext | undefined,
    private readonly callbacks: ClaudeSdkSessionCallbacks,
    private readonly config: {
      cwdRelative: string;
      resolvedCwd: string;
      model?: string;
      reasoningEffort?: string;
      permissionMode: CliPermissionMode;
      interactionMode: CliInteractionMode;
      resumeSessionId?: string;
      resumeSessionAt?: string;
      forkSession?: boolean;
      extraArgs?: string[];
    }
  ) {
    this.permissionMode = config.permissionMode;
    this.interactionMode = config.interactionMode;
    this.sessionId = config.resumeSessionId ?? "";
    this.model = config.model;
  }

  get processId(): string {
    return this.brokeredProcess?.processId ?? "";
  }

  start(callContext: PluginServiceContext): void {
    const sdkPermMode = mapPermissionModeToClaudeMode(this.permissionMode, this.interactionMode);
    const extraArgsRecord: Record<string, string | null> = {};
    for (let i = 0; i < (this.config.extraArgs?.length ?? 0); i += 1) {
      const arg = this.config.extraArgs![i]!;
      if (arg.startsWith("--")) {
        const key = arg.slice(2);
        const next = this.config.extraArgs![i + 1];
        if (next && !next.startsWith("--")) {
          extraArgsRecord[key] = next;
          i += 1;
        } else {
          extraArgsRecord[key] = null;
        }
      }
    }

    const q = claudeSdkQuery({
      prompt: this.inputQueue,
      options: {
        abortController: this.abortController,
        cwd: this.config.resolvedCwd,
        pathToClaudeCodeExecutable: "claude",
        includePartialMessages: true,
        ...(this.config.model ? { model: this.config.model } : {}),
        ...(this.config.reasoningEffort &&
        ["low", "medium", "high", "xhigh", "max"].includes(this.config.reasoningEffort)
          ? { effort: this.config.reasoningEffort as "low" | "medium" | "high" | "xhigh" | "max" }
          : {}),
        permissionMode: sdkPermMode,
        allowDangerouslySkipPermissions: true,
        ...(this.config.resumeSessionId ? { resume: this.config.resumeSessionId } : {}),
        ...(this.config.resumeSessionAt ? { resumeSessionAt: this.config.resumeSessionAt } : {}),
        ...(this.config.forkSession ? { forkSession: true } : {}),
        ...(Object.keys(extraArgsRecord).length > 0 ? { extraArgs: extraArgsRecord } : {}),
        spawnClaudeCodeProcess: (spawnOptions) => {
          const proc = new BrokeredClaudeProcess(
            callContext,
            this.getLifecycleContext,
            this.config.cwdRelative,
            spawnOptions,
            (pid) => this.callbacks.onProcessId(pid),
            (chunk) => this.callbacks.onStderr(chunk)
          );
          this.brokeredProcess = proc;
          return proc;
        },
        canUseTool: async (toolName, toolInput, options) => {
          return this.handleCanUseTool(toolName, toolInput, options.signal, options.toolUseID);
        }
      }
    });

    this.queryHandle = q;

    // Discover slash commands non-blockingly once SDK handshake completes.
    void q
      .initializationResult()
      .then((init) => {
        if (Array.isArray(init.commands) && init.commands.length > 0 && this.callbacks.onSlashCommands) {
          this.callbacks.onSlashCommands(
            init.commands.map((cmd) => ({
              name: cmd.name.replace(/^\//, ""),
              description: cmd.description || "Claude CLI 命令",
              source: "provider" as const
            }))
          );
        }
      })
      .catch(() => undefined);

    void this.consumeStream(q);
  }

  sendUserMessage(
    text: string,
    options: { priority?: "next" | "now" | "later"; attachments?: CliAttachmentRef[] } = {}
  ): void {
    const fileNotes: string[] = [];
    for (const att of options.attachments ?? []) {
      fileNotes.push(`[Attached file: ${att.fileName} -> ${att.path}]`);
    }
    const finalText = fileNotes.length > 0 ? `${fileNotes.join("\n")}\n\n${text}` : text;

    const msg: SDKUserMessage = {
      type: "user",
      message: {
        role: "user",
        content: [{ type: "text", text: finalText }]
      },
      parent_tool_use_id: null,
      session_id: this.sessionId,
      ...(options.priority ? { priority: options.priority } : {})
    };
    this.inputQueue.push(msg);
  }

  async setLiveModes(input: {
    model?: string;
    reasoningEffort?: string;
    permissionMode?: CliPermissionMode;
    interactionMode?: CliInteractionMode;
  }): Promise<{ appliedLive: boolean }> {
    if (input.permissionMode) this.permissionMode = input.permissionMode;
    if (input.interactionMode) this.interactionMode = input.interactionMode;
    if (!this.queryHandle || this.closed) return { appliedLive: false };
    try {
      if (input.model && input.model !== this.model) {
        await this.queryHandle.setModel(input.model);
        this.model = input.model;
      }
      if (input.permissionMode || input.interactionMode) {
        const sdkMode = mapPermissionModeToClaudeMode(this.permissionMode, this.interactionMode);
        await this.queryHandle.setPermissionMode(sdkMode);
      }
      if (input.reasoningEffort && ["low", "medium", "high", "xhigh", "max"].includes(input.reasoningEffort)) {
        await this.queryHandle.applyFlagSettings({
          effortLevel: input.reasoningEffort as "low" | "medium" | "high" | "xhigh" | "max"
        });
      }
      return { appliedLive: true };
    } catch {
      return { appliedLive: false };
    }
  }

  async interrupt(): Promise<void> {
    if (!this.queryHandle || this.closed) return;
    await this.queryHandle.interrupt().catch(() => undefined);
  }

  resolveIntervention(
    interventionId: string,
    input: { decision?: CliApprovalDecision; answers?: Record<string, string | string[]>; text?: string }
  ): boolean {
    const pending = this.pendingPermissions.get(interventionId);
    if (!pending) return false;
    this.pendingPermissions.delete(interventionId);
    const { intervention, resolve } = pending;

    if (intervention.kind === "user_input") {
      const toolInput = asRecord(intervention.details.input) ?? {};
      const normalizedAnswers: Record<string, string> = {};
      if (input.answers) {
        for (const [k, v] of Object.entries(input.answers)) {
          normalizedAnswers[k] = Array.isArray(v) ? v.join(", ") : v;
        }
      } else if (input.text !== undefined) {
        const firstKey = intervention.questions?.[0]?.question ?? intervention.questions?.[0]?.id ?? "answer";
        normalizedAnswers[firstKey] = input.text;
      }
      resolve({
        behavior: "allow",
        updatedInput: { ...toolInput, answers: normalizedAnswers }
      });
      return true;
    }

    const decision = input.decision ?? "decline";
    if (decision === "accept" || decision === "accept_for_session") {
      if (decision === "accept_for_session") {
        const toolName = asString(intervention.details.toolName);
        if (toolName) this.sessionAllowedTools.add(toolName);
      }
      resolve({
        behavior: "allow",
        updatedInput: asRecord(intervention.details.input) ?? {}
      });
    } else {
      resolve({
        behavior: "deny",
        message: input.text || (decision === "cancel" ? "Cancelled by user." : "Declined by user."),
        interrupt: decision === "cancel"
      });
    }
    return true;
  }

  async stop(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    this.inputQueue.close();
    for (const [id, pending] of [...this.pendingPermissions.entries()]) {
      this.pendingPermissions.delete(id);
      pending.resolve({ behavior: "deny", message: "Session stopped.", interrupt: true });
    }
    this.abortController.abort();
    this.queryHandle?.close();
    this.brokeredProcess?.kill("SIGTERM");
  }

  private handleCanUseTool(
    toolName: string,
    toolInput: Record<string, unknown>,
    signal: AbortSignal,
    toolUseID: string
  ): Promise<PermissionResult> {
    if (toolName === "ExitPlanMode") {
      const planMarkdown =
        asString(toolInput.plan) ??
        asString(toolInput.markdown) ??
        asString(toolInput.summary) ??
        "Claude 已提出实施方案，请确认实施或继续修改。";
      this.callbacks.onActions([
        {
          kind: "plan_completed",
          blockKey: `plan:${toolUseID || randomUUID().slice(0, 8)}`,
          title: "Claude 实施方案",
          text: planMarkdown
        }
      ]);
      return Promise.resolve({
        behavior: "deny",
        message: "Proposed plan displayed to user for approval. Pause and wait for user to implement or revise the plan."
      });
    }

    if (toolName === "AskUserQuestion") {
      const questions = normalizeUserInputQuestions(toolInput.questions);
      const id = `int_${randomUUID().slice(0, 12)}`;
      const intervention: CliPendingIntervention = {
        id,
        requestId: toolUseID || id,
        kind: "user_input",
        method: "AskUserQuestion",
        title: "Claude 等待回答问题",
        details: { toolName, input: toolInput },
        ...(questions ? { questions } : {}),
        createdAt: new Date().toISOString()
      };
      return this.awaitUserPermission(intervention, signal);
    }

    if (this.permissionMode === "full_access" || this.sessionAllowedTools.has(toolName)) {
      return Promise.resolve({ behavior: "allow", updatedInput: toolInput });
    }
    if (
      this.permissionMode === "accept_edits" &&
      ["Edit", "Write", "MultiEdit", "NotebookEdit"].includes(toolName)
    ) {
      return Promise.resolve({ behavior: "allow", updatedInput: toolInput });
    }
    if (["Read", "Glob", "Grep", "LS", "WebSearch", "WebFetch"].includes(toolName)) {
      return Promise.resolve({ behavior: "allow", updatedInput: toolInput });
    }

    const id = `int_${randomUUID().slice(0, 12)}`;
    const intervention: CliPendingIntervention = {
      id,
      requestId: toolUseID || id,
      kind: toolName === "Bash" ? "command_approval" : "control_request",
      method: `canUseTool:${toolName}`,
      title: `Claude 请求调用工具: ${toolName}`,
      details: { toolName, input: toolInput, ...(asString(toolInput.command) ? { command: asString(toolInput.command) } : {}) },
      createdAt: new Date().toISOString()
    };
    return this.awaitUserPermission(intervention, signal);
  }

  private awaitUserPermission(intervention: CliPendingIntervention, signal: AbortSignal): Promise<PermissionResult> {
    return new Promise<PermissionResult>((resolve) => {
      let settled = false;
      const finish = (result: PermissionResult) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener("abort", onAbort);
        this.pendingPermissions.delete(intervention.id);
        resolve(result);
      };
      const onAbort = () => finish({ behavior: "deny", message: "Permission request aborted.", interrupt: true });
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
      this.pendingPermissions.set(intervention.id, { intervention, resolve: finish });
      this.callbacks.onActions([{ kind: "intervention", intervention }]);
    });
  }

  private async consumeStream(q: ClaudeSdkQuery): Promise<void> {
    try {
      for await (const msg of q) {
        const actions = this.translateSdkMessage(msg);
        if (actions.length > 0) {
          this.callbacks.onActions(actions);
        }
      }
    } catch (err) {
      if (!this.closed) {
        const message = stripAnsi(err instanceof Error ? err.message : String(err));
        this.callbacks.onStderr(message);
      }
    } finally {
      this.closed = true;
      this.callbacks.onExit(
        this.brokeredProcess?.exitCode ?? undefined,
        this.brokeredProcess?.signalCode ?? undefined
      );
    }
  }

  private translateSdkMessage(raw: SDKMessage): ParsedProtocolAction[] {
    const obj = asRecord(raw);
    if (!obj) return [];
    const type = asString(obj.type);
    const actions: ParsedProtocolAction[] = [];

    const sid = asString(obj.session_id);
    if (sid && sid !== this.sessionId) {
      this.sessionId = sid;
      const model = asString(obj.model);
      if (model) this.model = model;
      actions.push({
        kind: "session_id",
        externalSessionId: sid,
        ...(model ? { model } : {}),
        summary: `Claude SDK 会话就绪 (${sid})`
      });
    }

    if (type === "stream_event") {
      const ev = asRecord(obj.event);
      const delta = asRecord(ev?.delta);
      const deltaType = asString(delta?.type);
      if (deltaType === "text_delta" && typeof delta?.text === "string" && delta.text.length > 0) {
        actions.push({ kind: "assistant_delta", text: delta.text });
      } else if (deltaType === "thinking_delta" && typeof delta?.thinking === "string" && delta.thinking.length > 0) {
        actions.push({ kind: "reasoning_delta", text: delta.thinking });
      }
      return actions;
    }

    if (type === "assistant") {
      const msg = asRecord(obj.message);
      const uuid = asString(obj.uuid);
      const content = Array.isArray(msg?.content) ? msg!.content : [];
      const texts: string[] = [];
      for (const part of content) {
        const rec = asRecord(part);
        const pType = asString(rec?.type);
        if (pType === "text" && typeof rec?.text === "string") {
          texts.push(rec.text);
        } else if (pType === "thinking" && typeof rec?.thinking === "string") {
          actions.push({ kind: "reasoning_delta", text: rec.thinking });
        } else if (pType === "tool_use") {
          const toolId = asString(rec?.id) ?? randomUUID().slice(0, 8);
          const name = asString(rec?.name) ?? "tool";
          const input = asRecord(rec?.input);
          if (name === "Bash" && asString(input?.command)) {
            actions.push({ kind: "command_started", blockKey: `tool:${toolId}`, command: asString(input?.command)! });
          } else {
            actions.push({ kind: "tool_started", blockKey: `tool:${toolId}`, toolName: name, ...(input ? { parameters: input } : {}) });
          }
        }
      }
      const joined = texts.join("\n").trim();
      if (joined) {
        actions.push({
          kind: "assistant_message",
          text: joined,
          ...(uuid ? { providerMessageId: uuid } : {})
        });
      }
      const usage = asRecord(msg?.usage);
      if (usage) {
        actions.push({ kind: "usage_updated", usage });
      }
      return actions;
    }

    if (type === "user") {
      const msg = asRecord(obj.message);
      const content = Array.isArray(msg?.content) ? msg!.content : [];
      for (const part of content) {
        const rec = asRecord(part);
        if (asString(rec?.type) === "tool_result") {
          const toolUseId = asString(rec?.tool_use_id) ?? "tool";
          const isError = rec?.is_error === true;
          const outText =
            typeof rec?.content === "string"
              ? rec.content
              : Array.isArray(rec?.content)
                ? rec.content
                    .map((c) => asString(asRecord(c)?.text) ?? "")
                    .filter(Boolean)
                    .join("\n")
                : "";
          actions.push({
            kind: "tool_completed",
            blockKey: `tool:${toolUseId}`,
            ...(outText ? { output: truncateText(stripAnsi(outText), 24_000) } : {}),
            status: isError ? "failed" : "completed"
          });
        }
      }
      return actions;
    }

    if (type === "result") {
      const isError = obj.is_error === true;
      const subtype = asString(obj.subtype);
      const finalText = asString(obj.result);
      const durationMs = asNumber(obj.duration_ms);
      const costUsd = asNumber(obj.total_cost_usd);
      const usage = asRecord(obj.usage);
      actions.push({
        kind: "turn_completed",
        status: subtype === "interrupted" ? "interrupted" : isError ? "failed" : "completed",
        ...(finalText ? { finalText } : {}),
        ...(isError ? { errorMessage: finalText ?? "Claude SDK turn failed." } : {}),
        ...(durationMs !== undefined ? { durationMs } : {}),
        ...(costUsd !== undefined ? { costUsd } : {}),
        ...(usage ? { usage } : {}),
        data: { ...(subtype ? { subtype } : {}) }
      });
      return actions;
    }

    return actions;
  }
}
