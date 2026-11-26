import { randomUUID } from "node:crypto";
import type { PluginServiceContext } from "@cotree/plugin-sdk/service";
import {
  PLUGIN_ID,
  PLUGIN_VERSION,
  TRANSIENT_READ_RETRY_BACKOFF_MS,
  isFatalProcessReadError,
  stripAnsi,
  truncateText,
  waitForRetryBackoff,
  type CliApprovalDecision,
  type CliAttachmentRef,
  type CliEngine,
  type CliModelOption,
  type CliNativeSessionEntry,
  type CliPendingIntervention,
  type CliPermissionMode,
  type CliSlashCommandInfo
} from "../shared.js";
import { normalizeUserInputQuestions, type ParsedProtocolAction } from "../protocols.js";

const ACP_ROLLING_WINDOW_BYTES = 16 * 1024 * 1024;
const ACP_READ_PAGE_BYTES = 1_048_576;
const DEFAULT_ACP_PROMPT_IDLE_TIMEOUT_MS = 900_000;
const ACP_ENV: Record<string, string> = {
  NO_COLOR: "1",
  CLICOLOR: "0",
  MISE_OFFLINE: "1"
};

type PendingAcpRpc = {
  method: string;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  clearTimer: () => void;
  renewOnActivity: boolean;
  resetTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
};

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

export function buildAcpSpawnArgs(
  engine: CliEngine,
  extraArgs: string[] = [],
  options: {
    resolvedCwd?: string;
    model?: string;
    permissionMode?: CliPermissionMode;
    acpFlagOverride?: string;
  } = {}
): string[] {
  switch (engine) {
    case "gemini":
      return [options.acpFlagOverride ?? "--experimental-acp", ...extraArgs];
    case "qwen": {
      const args = [options.acpFlagOverride ?? "--acp"];
      if (options.model) args.push("-m", options.model);
      if (options.permissionMode === "full_access") args.push("--yolo");
      else if (options.permissionMode === "accept_edits") args.push("--approval-mode", "auto-edit");
      args.push(...extraArgs);
      return args;
    }
    case "opencode": {
      const args = ["acp"];
      if (options.resolvedCwd) args.push("--cwd", options.resolvedCwd);
      args.push(...extraArgs);
      return args;
    }
    case "kiro":
    case "goose":
      return ["acp", ...extraArgs];
    case "acp":
    default:
      return [...extraArgs];
  }
}

export type AcpSessionCallbacks = {
  onActions: (actions: ParsedProtocolAction[], rawLine?: string) => void;
  onStderr: (chunk: string) => void;
  onConfigUpdated?: (info: { models?: CliModelOption[]; slashCommands?: CliSlashCommandInfo[] }) => void;
  onExit: (exitCode?: number, signal?: string) => void;
};

/**
 * Universal ACP v1 / v2 dual-version JSON-RPC adapter (inspired by t3code `packages/effect-acp`
 * and `packages/provider-acp`). One adapter unlocks Gemini CLI interactive mode, OpenCode,
 * Kiro, Goose, and custom ACP-compliant coding agents.
 */
export class UniversalAcpSession {
  processId = "";
  acpSessionId = "";
  protocolVersion: 1 | 2 = 1;
  closed = false;

  private nextRpcId = 1;
  private pendingRpc = new Map<string | number, PendingAcpRpc>();
  private pendingInterventionIds = new Set<string | number>();
  private writeChain: Promise<void> = Promise.resolve();
  private stdoutLineBuffer = "";
  private permissionMode: CliPermissionMode;
  private readonly sessionAllowedTools = new Set<string>();
  private readonly promptIdleTimeoutMs: number;
  private readonly readRetryBackoffMs: readonly number[];

  constructor(
    private readonly engine: CliEngine,
    private readonly getLifecycleContext: () => PluginServiceContext | undefined,
    private readonly callbacks: AcpSessionCallbacks,
    private readonly config: {
      cwdRelative: string;
      resolvedCwd: string;
      executableId?: string;
      customEnv?: Record<string, string>;
      model?: string;
      reasoningEffort?: string;
      permissionMode: CliPermissionMode;
      extraArgs?: string[];
      promptIdleTimeoutMs?: number;
      readRetryBackoffMs?: readonly number[];
    }
  ) {
    this.permissionMode = config.permissionMode;
    this.promptIdleTimeoutMs = config.promptIdleTimeoutMs ?? DEFAULT_ACP_PROMPT_IDLE_TIMEOUT_MS;
    this.readRetryBackoffMs = config.readRetryBackoffMs ?? TRANSIENT_READ_RETRY_BACKOFF_MS;
  }

  setPermissionMode(mode: CliPermissionMode): void {
    this.permissionMode = mode;
  }

  async start(
    callContext: PluginServiceContext,
    options: { resumeSessionId?: string; forkFromSessionId?: string; acpFlagOverride?: string } = {}
  ): Promise<{ externalSessionId: string; models?: CliModelOption[] }> {
    const args = buildAcpSpawnArgs(this.engine, this.config.extraArgs ?? [], {
      resolvedCwd: this.config.resolvedCwd,
      ...(this.config.model ? { model: this.config.model } : {}),
      permissionMode: this.permissionMode,
      ...(options.acpFlagOverride ? { acpFlagOverride: options.acpFlagOverride } : {})
    });
    const targetExecutable = this.config.executableId ?? this.engine;
    const spawned = await callContext.process.spawn(targetExecutable, args, {
      requestKey: `acp-${targetExecutable}-${randomUUID().slice(0, 10)}`,
      cwd: { kind: "workspace-directory", path: this.config.cwdRelative },
      env: { ...ACP_ENV, ...(this.config.customEnv ?? {}) },
      maxOutputBytes: ACP_ROLLING_WINDOW_BYTES,
      outputPolicy: "rolling"
    });
    this.processId = spawned.processId;
    this.startReader(spawned.processId);

    // Negotiate ACP v2 preview and ACP v1 in a single initialize handshake.
    const initRes = asRecord(
      await this.sendRpc(
        callContext.process,
        "initialize",
        {
          protocolVersion: 2,
          info: { name: PLUGIN_ID, version: PLUGIN_VERSION, title: "CoTree External CLI Plugin" },
          capabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false },
          clientInfo: { name: PLUGIN_ID, version: PLUGIN_VERSION },
          clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false }
        },
        { timeoutMs: 25_000, signal: callContext.signal }
      )
    );
    this.protocolVersion = initRes && ("info" in initRes || initRes.protocolVersion === 2) ? 2 : 1;

    let sessionRes: Record<string, unknown> | undefined;
    if (options.forkFromSessionId) {
      try {
        sessionRes = asRecord(
          await this.sendRpc(
            callContext.process,
            "session/fork",
            { sessionId: options.forkFromSessionId, cwd: this.config.resolvedCwd },
            { timeoutMs: 25_000, signal: callContext.signal }
          )
        );
      } catch {
        sessionRes = undefined;
      }
    }

    if (!sessionRes && options.resumeSessionId) {
      const resumeMethod = this.protocolVersion === 2 ? "session/resume" : "session/load";
      try {
        sessionRes = asRecord(
          await this.sendRpc(
            callContext.process,
            resumeMethod,
            { sessionId: options.resumeSessionId, cwd: this.config.resolvedCwd, mcpServers: [] },
            { timeoutMs: 30_000, signal: callContext.signal }
          )
        );
      } catch {
        // Fallback to session/load if session/resume is unsupported on v2 server.
        if (resumeMethod !== "session/load") {
          sessionRes = asRecord(
            await this.sendRpc(
              callContext.process,
              "session/load",
              { sessionId: options.resumeSessionId, cwd: this.config.resolvedCwd, mcpServers: [] },
              { timeoutMs: 30_000, signal: callContext.signal }
            )
          );
        } else {
          throw new Error(`ACP session/load failed for ${options.resumeSessionId}`);
        }
      }
    }

    if (!sessionRes) {
      sessionRes = asRecord(
        await this.sendRpc(
          callContext.process,
          "session/new",
          { cwd: this.config.resolvedCwd, mcpServers: [] },
          { timeoutMs: 25_000, signal: callContext.signal }
        )
      );
    }

    this.acpSessionId =
      asString(sessionRes?.sessionId) ??
      asString(asRecord(sessionRes?.session)?.id) ??
      options.resumeSessionId ??
      `acp_${randomUUID().slice(0, 8)}`;

    const models = this.extractModelsFromSessionConfig(sessionRes);
    if (this.config.model) {
      await this.setModel(callContext, this.config.model).catch(() => undefined);
    }
    if (this.config.reasoningEffort) {
      await this.setReasoningEffort(callContext, this.config.reasoningEffort).catch(() => undefined);
    }

    this.callbacks.onActions([
      {
        kind: "session_id",
        externalSessionId: this.acpSessionId,
        summary: `ACP v${this.protocolVersion} session ready (${this.acpSessionId})`
      }
    ]);

    return { externalSessionId: this.acpSessionId, ...(models.length > 0 ? { models } : {}) };
  }

  async sendPrompt(
    callContext: PluginServiceContext,
    text: string,
    attachments?: CliAttachmentRef[]
  ): Promise<void> {
    const promptBlocks: Array<Record<string, unknown>> = [];
    const notes: string[] = [];
    for (const att of attachments ?? []) {
      notes.push(`[Attached file: ${att.fileName} -> ${att.path}]`);
    }
    const finalText = notes.length > 0 ? `${notes.join("\n")}\n\n${text}` : text;
    promptBlocks.push({ type: "text", text: finalText });

    // `session/prompt` runs asynchronously until the turn completes; use an activity-renewed
    // idle timeout (paused during human approval/input) instead of a fixed wall-clock cap so
    // long multi-minute coding turns never time out while making progress.
    void this.sendRpc(
      callContext.process,
      "session/prompt",
      {
        sessionId: this.acpSessionId,
        prompt: promptBlocks
      },
      { timeoutMs: this.promptIdleTimeoutMs, renewOnActivity: true }
    )
      .then((res) => {
        const rec = asRecord(res);
        const stopReason = asString(rec?.stopReason);
        const usage = asRecord(rec?.usage);
        this.callbacks.onActions([
          {
            kind: "turn_completed",
            status: stopReason === "cancelled" ? "interrupted" : "completed",
            ...(usage ? { usage } : {}),
            data: { ...(stopReason ? { stopReason } : {}) }
          }
        ]);
      })
      .catch((err) => {
        if (this.closed) return;
        const msg = stripAnsi(err instanceof Error ? err.message : String(err));
        this.callbacks.onActions([
          {
            kind: "turn_completed",
            status: /cancel/i.test(msg) ? "interrupted" : "failed",
            errorMessage: msg
          }
        ]);
      });
  }

  async cancelTurn(callContext: PluginServiceContext): Promise<void> {
    if (this.closed || !this.processId || !this.acpSessionId) return;
    if (this.pendingInterventionIds.size > 0) {
      this.pendingInterventionIds.clear();
      this.resumeActivityTimers();
    }
    await this.writeNotification(callContext.process, "session/cancel", { sessionId: this.acpSessionId }).catch(() => undefined);
  }

  async setModel(callContext: PluginServiceContext, model: string): Promise<void> {
    if (this.closed || !this.processId || !this.acpSessionId) return;
    if (this.protocolVersion === 2) {
      await this.sendRpc(
        callContext.process,
        "session/set_config_option",
        { sessionId: this.acpSessionId, configId: "model", value: model },
        { timeoutMs: 10_000, signal: callContext.signal }
      ).catch(async () => {
        await this.sendRpc(
          callContext.process,
          "session/set_model",
          { sessionId: this.acpSessionId, modelId: model },
          { timeoutMs: 10_000, signal: callContext.signal }
        );
      });
      return;
    }
    await this.sendRpc(
      callContext.process,
      "session/set_model",
      { sessionId: this.acpSessionId, modelId: model },
      { timeoutMs: 10_000, signal: callContext.signal }
    );
  }

  async setMode(callContext: PluginServiceContext, modeId: string): Promise<void> {
    if (this.closed || !this.processId || !this.acpSessionId) return;
    await this.sendRpc(
      callContext.process,
      "session/set_mode",
      { sessionId: this.acpSessionId, modeId },
      { timeoutMs: 10_000, signal: callContext.signal }
    ).catch(() => undefined);
  }

  async setReasoningEffort(callContext: PluginServiceContext, effort: string): Promise<boolean> {
    if (this.closed || !this.processId || !this.acpSessionId) return false;
    try {
      await this.sendRpc(
        callContext.process,
        "session/set_config_option",
        { sessionId: this.acpSessionId, configId: "reasoning_effort", value: effort },
        { timeoutMs: 10_000, signal: callContext.signal }
      );
      return true;
    } catch {
      try {
        await this.sendRpc(
          callContext.process,
          "session/set_config_option",
          { sessionId: this.acpSessionId, configId: "effort", value: effort },
          { timeoutMs: 10_000, signal: callContext.signal }
        );
        return true;
      } catch {
        return false;
      }
    }
  }

  async listSessions(callContext: PluginServiceContext): Promise<CliNativeSessionEntry[]> {
    try {
      const raw = asRecord(
        await this.sendRpc(callContext.process, "session/list", { cwd: this.config.resolvedCwd }, {
          timeoutMs: 10_000,
          signal: callContext.signal
        })
      );
      const list = Array.isArray(raw?.sessions) ? raw!.sessions : [];
      return list
        .map((item) => {
          const rec = asRecord(item);
          const id = asString(rec?.sessionId) ?? asString(rec?.id);
          if (!id) return undefined;
          return {
            engine: this.engine,
            externalSessionId: id,
            title: asString(rec?.title) ?? `${this.engine} ${id.slice(0, 8)}`,
            ...(asString(rec?.cwd) ? { cwd: asString(rec?.cwd) } : {}),
            ...(asString(rec?.updatedAt) ? { updatedAt: asString(rec?.updatedAt) } : {})
          };
        })
        .filter((x): x is CliNativeSessionEntry => Boolean(x));
    } catch {
      return [];
    }
  }

  async respondToIntervention(
    callContext: PluginServiceContext,
    intervention: CliPendingIntervention,
    input: { decision?: CliApprovalDecision; optionId?: string; answers?: Record<string, string | string[]>; text?: string }
  ): Promise<void> {
    this.pendingInterventionIds.delete(intervention.requestId);
    if (this.pendingInterventionIds.size === 0) {
      this.resumeActivityTimers();
    }
    if (intervention.kind === "user_input") {
      await this.writeResponse(callContext.process, intervention.requestId, {
        action: "accept",
        content: input.answers ?? (input.text !== undefined ? { text: input.text } : {})
      });
      return;
    }

    const decision = input.decision ?? "decline";
    if (decision === "accept_for_session") {
      const tool = asString(intervention.details.toolName);
      if (tool) this.sessionAllowedTools.add(tool);
    }
    if (decision === "cancel" || decision === "decline") {
      const rejectOpt = intervention.nativeOptions?.find((o) =>
        /reject|deny|cancel/i.test(o.kind ?? o.id ?? o.label)
      );
      await this.writeResponse(callContext.process, intervention.requestId, {
        outcome: rejectOpt ? { outcome: "selected", optionId: rejectOpt.id } : { outcome: "cancelled" }
      });
      return;
    }

    const chosenOptionId =
      input.optionId ??
      intervention.nativeOptions?.find((o) =>
        decision === "accept_for_session"
          ? /always|session/i.test(o.kind ?? o.id ?? o.label)
          : /allow_once|allow/i.test(o.kind ?? o.id ?? o.label)
      )?.id ??
      intervention.nativeOptions?.[0]?.id;

    await this.writeResponse(callContext.process, intervention.requestId, {
      outcome: chosenOptionId ? { outcome: "selected", optionId: chosenOptionId } : { outcome: "cancelled" }
    });
  }

  async stop(processClient?: PluginServiceContext["process"]): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    this.pendingInterventionIds.clear();
    for (const [id, pending] of [...this.pendingRpc.entries()]) {
      pending.clearTimer();
      this.pendingRpc.delete(id);
      pending.reject(new Error(`ACP RPC '${pending.method}' aborted: session stopped.`));
    }
    const client = processClient ?? this.getLifecycleContext()?.process;
    if (this.processId && client) {
      await client.stop(this.processId).catch(() => undefined);
    }
  }

  private touchActivity(): void {
    if (this.pendingInterventionIds.size > 0) return;
    for (const pending of this.pendingRpc.values()) {
      if (pending.renewOnActivity) pending.resetTimer();
    }
  }

  private pauseActivityTimers(): void {
    for (const pending of this.pendingRpc.values()) {
      if (pending.renewOnActivity) pending.pauseTimer();
    }
  }

  private resumeActivityTimers(): void {
    for (const pending of this.pendingRpc.values()) {
      if (pending.renewOnActivity) pending.resumeTimer();
    }
  }

  private writeStdin(processClient: PluginServiceContext["process"], frame: string): Promise<void> {
    if (this.closed || !this.processId) return Promise.reject(new Error("ACP process is not running."));
    const pid = this.processId;
    const next = this.writeChain
      .catch(() => undefined)
      .then(() => processClient.write(pid, frame));
    this.writeChain = next;
    return next;
  }

  private writeNotification(processClient: PluginServiceContext["process"], method: string, params?: Record<string, unknown>): Promise<void> {
    return this.writeStdin(processClient, `${JSON.stringify({ jsonrpc: "2.0", method, ...(params ? { params } : {}) })}\n`);
  }

  private writeResponse(processClient: PluginServiceContext["process"], id: string | number, result: Record<string, unknown>): Promise<void> {
    return this.writeStdin(processClient, `${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`);
  }

  private sendRpc(
    processClient: PluginServiceContext["process"],
    method: string,
    params?: Record<string, unknown>,
    options: { timeoutMs?: number; signal?: AbortSignal; renewOnActivity?: boolean } = {}
  ): Promise<unknown> {
    const id = this.nextRpcId++;
    const timeoutMs = options.timeoutMs ?? 25_000;
    const renewOnActivity = Boolean(options.renewOnActivity);
    return new Promise((resolve, reject) => {
      let settled = false;
      let paused = renewOnActivity && this.pendingInterventionIds.size > 0;
      let timer: ReturnType<typeof setTimeout> | undefined;

      const clearTimer = () => {
        if (timer !== undefined) {
          clearTimeout(timer);
          timer = undefined;
        }
      };

      const finish = (err?: Error, val?: unknown) => {
        if (settled) return;
        settled = true;
        clearTimer();
        options.signal?.removeEventListener("abort", onAbort);
        this.pendingRpc.delete(id);
        if (err) reject(err);
        else resolve(val);
      };

      const armTimer = () => {
        clearTimer();
        if (settled || paused || !Number.isFinite(timeoutMs) || timeoutMs <= 0) return;
        timer = setTimeout(() => {
          finish(
            new Error(
              renewOnActivity
                ? `ACP RPC '${method}' idle timed out after ${timeoutMs}ms without upstream activity.`
                : `ACP RPC '${method}' timed out after ${timeoutMs}ms.`
            )
          );
        }, timeoutMs);
        timer.unref?.();
      };

      const onAbort = () => finish(new Error(`ACP RPC '${method}' aborted by caller.`));
      if (options.signal?.aborted) {
        onAbort();
        return;
      }
      options.signal?.addEventListener("abort", onAbort, { once: true });
      armTimer();

      this.pendingRpc.set(id, {
        method,
        resolve: (v) => finish(undefined, v),
        reject: (e) => finish(e),
        clearTimer,
        renewOnActivity,
        resetTimer: () => {
          if (!paused) armTimer();
        },
        pauseTimer: () => {
          paused = true;
          clearTimer();
        },
        resumeTimer: () => {
          paused = false;
          armTimer();
        }
      });
      const line = `${JSON.stringify({ jsonrpc: "2.0", id, method, ...(params ? { params } : {}) })}\n`;
      void this.writeStdin(processClient, line).catch((err) => finish(err instanceof Error ? err : new Error(String(err))));
    });
  }

  private extractModelsFromSessionConfig(sessionRes: Record<string, unknown> | undefined): CliModelOption[] {
    if (!sessionRes) return [];
    const options: CliModelOption[] = [];
    const modelsObj = asRecord(sessionRes.models);
    const available = Array.isArray(modelsObj?.availableModels)
      ? modelsObj!.availableModels
      : Array.isArray(sessionRes.configOptions)
        ? (sessionRes.configOptions.find((c) => asString(asRecord(c)?.id) === "model") as Record<string, unknown> | undefined)?.options
        : [];
    const currentModel = asString(modelsObj?.currentModelId);
    if (Array.isArray(available)) {
      for (const raw of available) {
        const rec = asRecord(raw);
        const id = asString(rec?.modelId) ?? asString(rec?.value) ?? asString(rec?.id);
        if (!id) continue;
        options.push({
          id,
          displayName: asString(rec?.name) ?? asString(rec?.label) ?? id,
          ...(asString(rec?.description) ? { description: asString(rec?.description) } : {}),
          ...(currentModel === id ? { isDefault: true } : {})
        });
      }
    }
    return options;
  }

  private startReader(boundProcessId: string): void {
    const ctx = this.getLifecycleContext();
    if (!ctx) return;
    void (async () => {
      let cursor = { stdoutOffset: 0, stderrOffset: 0 };
      let prevHadMore = false;
      let consecutiveReadErrors = 0;
      try {
        while (!ctx.signal.aborted && !this.closed && this.processId === boundProcessId) {
          let page;
          try {
            page = await ctx.process.read(boundProcessId, {
              cursor,
              maxBytes: ACP_READ_PAGE_BYTES,
              timeoutMs: prevHadMore ? 0 : 250
            });
            consecutiveReadErrors = 0;
          } catch (readError) {
            if (
              ctx.signal.aborted ||
              this.closed ||
              this.processId !== boundProcessId ||
              isFatalProcessReadError(readError) ||
              consecutiveReadErrors >= this.readRetryBackoffMs.length
            ) {
              throw readError;
            }
            const delayMs = this.readRetryBackoffMs[consecutiveReadErrors] ?? 2_000;
            consecutiveReadErrors += 1;
            const waited = await waitForRetryBackoff(delayMs, ctx.signal);
            if (!waited || this.closed || this.processId !== boundProcessId) return;
            continue;
          }
          cursor = page.cursor;
          prevHadMore = Boolean(page.more);
          if (page.stdout) this.processStdout(page.stdout, false);
          if (page.stderr) {
            this.touchActivity();
            this.callbacks.onStderr(stripAnsi(page.stderr));
          }
          if (page.exited || page.executionSettled) {
            if (page.more) continue;
            this.processStdout("", true);
            this.closed = true;
            this.pendingInterventionIds.clear();
            for (const [id, pending] of [...this.pendingRpc.entries()]) {
              pending.clearTimer();
              this.pendingRpc.delete(id);
              pending.reject(new Error(`ACP process exited (${page.exitCode ?? "none"})`));
            }
            this.callbacks.onExit(page.exitCode, page.signal);
            break;
          }
        }
      } catch (err) {
        if (!this.closed) {
          this.closed = true;
          this.pendingInterventionIds.clear();
          const msg = stripAnsi(err instanceof Error ? err.message : String(err));
          for (const [id, pending] of [...this.pendingRpc.entries()]) {
            pending.clearTimer();
            this.pendingRpc.delete(id);
            pending.reject(new Error(`ACP reader failed: ${msg}`));
          }
          this.callbacks.onStderr(msg);
          this.callbacks.onExit(1, undefined);
        }
      }
    })();
  }

  private processStdout(chunk: string, flush: boolean): void {
    if (chunk) this.stdoutLineBuffer += chunk;
    const lines = this.stdoutLineBuffer.split(/\r?\n/);
    this.stdoutLineBuffer = flush ? "" : (lines.pop() ?? "");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let obj: Record<string, unknown> | undefined;
      try {
        obj = asRecord(JSON.parse(trimmed));
      } catch {
        continue;
      }
      if (!obj) continue;
      const hasId = typeof obj.id === "string" || typeof obj.id === "number";
      const method = asString(obj.method);

      if (hasId && !method) {
        const pending = this.pendingRpc.get(obj.id as string | number);
        if (pending) {
          const err = asRecord(obj.error);
          if (obj.error) {
            pending.reject(new Error(asString(err?.message) ?? `ACP JSON-RPC error (${asNumber(err?.code) ?? -1})`));
          } else {
            pending.resolve(obj.result);
          }
        }
        continue;
      }

      if (hasId && method) {
        this.handleServerRequest(obj.id as string | number, method, asRecord(obj.params) ?? {});
        continue;
      }

      if (method === "session/update") {
        this.touchActivity();
        const actions = this.parseSessionUpdate(asRecord(obj.params) ?? {});
        if (actions.length > 0) this.callbacks.onActions(actions, line);
      }
    }
  }

  private handleServerRequest(requestId: string | number, method: string, params: Record<string, unknown>): void {
    this.touchActivity();
    const ctx = this.getLifecycleContext();
    if (method === "session/request_permission" || method === "requestPermission") {
      const toolCall = asRecord(params.toolCall);
      const toolName = asString(toolCall?.title) ?? asString(toolCall?.kind) ?? "tool";
      const kind = asString(toolCall?.kind) ?? "";
      const rawOptions = Array.isArray(params.options) ? params.options : [];
      const nativeOptions = rawOptions
        .map((o) => {
          const rec = asRecord(o);
          const id = asString(rec?.optionId) ?? asString(rec?.id);
          if (!id) return undefined;
          return {
            id,
            label: asString(rec?.name) ?? asString(rec?.label) ?? id,
            ...(asString(rec?.kind) ? { kind: asString(rec?.kind) } : {})
          };
        })
        .filter((x): x is NonNullable<typeof x> => Boolean(x));

      const shouldAutoAllow =
        this.permissionMode === "full_access" ||
        this.sessionAllowedTools.has(toolName) ||
        kind === "read" ||
        kind === "search" ||
        (this.permissionMode === "accept_edits" && kind === "edit");

      if (shouldAutoAllow && ctx && nativeOptions.length > 0) {
        const allowOpt = nativeOptions.find((o) => /allow/i.test(o.kind ?? o.id)) ?? nativeOptions[0]!;
        void this.writeResponse(ctx.process, requestId, {
          outcome: { outcome: "selected", optionId: allowOpt.id }
        }).catch(() => undefined);
        return;
      }

      const intervention: CliPendingIntervention = {
        id: `int_${randomUUID().slice(0, 12)}`,
        requestId,
        kind: kind === "execute" ? "command_approval" : kind === "edit" ? "file_change_approval" : "control_request",
        method,
        title: `${this.engine} 请求授权: ${toolName}`,
        details: { toolName, kind, ...params },
        nativeOptions,
        createdAt: new Date().toISOString()
      };
      this.pendingInterventionIds.add(requestId);
      this.pauseActivityTimers();
      this.callbacks.onActions([{ kind: "intervention", intervention }]);
      return;
    }

    if (method === "elicitation" || method === "session/elicitation") {
      const questions = normalizeUserInputQuestions(params.questions);
      const intervention: CliPendingIntervention = {
        id: `int_${randomUUID().slice(0, 12)}`,
        requestId,
        kind: "user_input",
        method,
        title: asString(params.message) ?? `${this.engine} 等待输入`,
        details: params,
        ...(questions ? { questions } : {}),
        createdAt: new Date().toISOString()
      };
      this.pendingInterventionIds.add(requestId);
      this.pauseActivityTimers();
      this.callbacks.onActions([{ kind: "intervention", intervention }]);
      return;
    }

    // Politely decline unsupported client callbacks (e.g., terminal/fs not enabled).
    if (ctx) {
      void this.writeStdin(
        ctx.process,
        `${JSON.stringify({ jsonrpc: "2.0", id: requestId, error: { code: -32601, message: `Method not implemented: ${method}` } })}\n`
      ).catch(() => undefined);
    }
  }

  private parseSessionUpdate(params: Record<string, unknown>): ParsedProtocolAction[] {
    const update = asRecord(params.update) ?? params;
    const kind = asString(update.sessionUpdate) ?? asString(update.type) ?? "";
    switch (kind) {
      case "agent_message_chunk": {
        const content = asRecord(update.content);
        const text = asString(content?.text) ?? asString(update.text) ?? "";
        return text ? [{ kind: "assistant_delta", text }] : [];
      }
      case "agent_thought_chunk": {
        const content = asRecord(update.content);
        const text = asString(content?.text) ?? asString(update.text) ?? "";
        return text ? [{ kind: "reasoning_delta", text }] : [];
      }
      case "tool_call": {
        const id = asString(update.toolCallId) ?? randomUUID().slice(0, 8);
        const title = asString(update.title) ?? asString(update.kind) ?? "tool";
        const toolKind = asString(update.kind);
        if (toolKind === "execute") {
          return [{ kind: "command_started", blockKey: `acp:${id}`, command: title }];
        }
        return [{ kind: "tool_started", blockKey: `acp:${id}`, toolName: title, ...(asRecord(update.rawInput) ? { parameters: asRecord(update.rawInput) } : {}) }];
      }
      case "tool_call_update": {
        const id = asString(update.toolCallId) ?? "tool";
        const status = asString(update.status);
        const title = asString(update.title);
        const content = Array.isArray(update.content)
          ? update.content
              .map((c) => asString(asRecord(asRecord(c)?.content)?.text) ?? asString(asRecord(c)?.text) ?? "")
              .filter(Boolean)
              .join("\n")
          : asString(update.rawOutput);
        if (status === "completed" || status === "failed") {
          return [{
            kind: "tool_completed",
            blockKey: `acp:${id}`,
            ...(title ? { toolName: title } : {}),
            ...(content ? { output: truncateText(stripAnsi(content), 24_000) } : {}),
            status: status === "failed" ? "failed" : "completed"
          }];
        }
        return content ? [{ kind: "command_delta", blockKey: `acp:${id}`, text: content }] : [];
      }
      case "plan":
      case "plan_update": {
        const entries = Array.isArray(update.entries) ? update.entries : [];
        const lines = entries
          .map((e) => {
            const rec = asRecord(e);
            const content = asString(rec?.content);
            if (!content) return "";
            const st = asString(rec?.status) ?? "pending";
            return `- [${st === "completed" ? "x" : st === "in_progress" ? "~" : " "}] ${content}`;
          })
          .filter(Boolean);
        return lines.length > 0 ? [{ kind: "plan_completed", blockKey: "acp:plan", title: "ACP 执行计划", text: lines.join("\n") }] : [];
      }
      case "available_commands_update": {
        const cmds = Array.isArray(update.availableCommands) ? update.availableCommands : [];
        const mapped: CliSlashCommandInfo[] = [];
        for (const c of cmds) {
          const rec = asRecord(c);
          const name = asString(rec?.name);
          if (name) {
            mapped.push({
              name: name.replace(/^\//, ""),
              description: asString(rec?.description) ?? "ACP 命令",
              source: "provider"
            });
          }
        }
        if (mapped.length > 0) this.callbacks.onConfigUpdated?.({ slashCommands: mapped });
        return [];
      }
      case "config_option_update": {
        const opts = Array.isArray(update.configOptions) ? update.configOptions : [];
        const modelOpt = opts.find((o) => asString(asRecord(o)?.id) === "model") as Record<string, unknown> | undefined;
        if (modelOpt && Array.isArray(modelOpt.options)) {
          const models = this.extractModelsFromSessionConfig({ configOptions: opts });
          if (models.length > 0) this.callbacks.onConfigUpdated?.({ models });
        }
        return [];
      }
      case "usage_update": {
        const usage = asRecord(update.usage) ?? update;
        return [{ kind: "usage_updated", usage }];
      }
      default:
        return [];
    }
  }
}
