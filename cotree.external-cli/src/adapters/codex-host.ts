import { randomUUID } from "node:crypto";
import type { PluginServiceContext } from "@cotree/plugin-sdk/service";
import {
  PLUGIN_ID,
  PLUGIN_VERSION,
  TRANSIENT_READ_RETRY_BACKOFF_MS,
  isFatalProcessReadError,
  stripAnsi,
  waitForRetryBackoff,
  type CliAttachmentRef,
  type CliInteractionMode,
  type CliModelOption,
  type CliNativeSessionEntry,
  type CliPermissionMode,
  type CliServiceTier,
  mapPermissionModeToCodexPolicy
} from "../shared.js";
import {
  buildCodexRpcNotification,
  buildCodexRpcRequest,
  buildCodexRpcResponse,
  extractCodexThreadIdFromObject,
  parseCodexModelListResult,
  parseCodexStdoutLine,
  type ParsedProtocolAction
} from "../protocols.js";

const CODEX_ROLLING_WINDOW_BYTES = 16 * 1024 * 1024;
const CODEX_READ_PAGE_BYTES = 1_048_576;
const CODEX_NO_COLOR_ENV: Record<string, string> = {
  NO_COLOR: "1",
  CLICOLOR: "0",
  MISE_OFFLINE: "1"
};

type PendingRpc = {
  method: string;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

export type CodexThreadCallbacks = {
  onActions: (actions: ParsedProtocolAction[], rawLine: string) => void;
  onStderr: (chunk: string) => void;
  onHostRetired: (reason: string, exitCode?: number, signal?: string) => void;
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function isUnsupportedExcludeTurnsError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("excludeturns") ||
    lower.includes("exclude_turns") ||
    lower.includes("unknown field") ||
    lower.includes("invalid params") ||
    lower.includes("-32602")
  );
}

/**
 * Single shared `codex app-server` process multiplexing multiple concurrent Codex threads
 * by `threadId` (per workspace + extraArgs signature), with automatic crash/hang retirement.
 */
export class CodexSharedHost {
  readonly hostKey: string;
  readonly cwdRelative: string;
  readonly extraArgs: string[];

  processId = "";
  retired = false;
  initialized = false;

  private nextRpcId = 1;
  private pendingRpc = new Map<string | number, PendingRpc>();
  private writeChain: Promise<void> = Promise.resolve();
  private initPromise: Promise<void> | undefined;
  private stdoutLineBuffer = "";
  private stderrLineBuffer = "";
  private threadCallbacks = new Map<string, CodexThreadCallbacks>();
  private threadClosings = new Map<string, Array<() => void>>();
  private lastBoundThreadId: string | undefined;

  private readonly readRetryBackoffMs: readonly number[];

  constructor(
    private readonly getLifecycleContext: () => PluginServiceContext | undefined,
    hostKey: string,
    cwdRelative: string,
    extraArgs: string[],
    options: { readRetryBackoffMs?: readonly number[] } = {}
  ) {
    this.hostKey = hostKey;
    this.cwdRelative = cwdRelative;
    this.extraArgs = [...extraArgs];
    this.readRetryBackoffMs = options.readRetryBackoffMs ?? TRANSIENT_READ_RETRY_BACKOFF_MS;
  }

  get activeThreadCount(): number {
    return this.threadCallbacks.size;
  }

  hasThread(threadId: string): boolean {
    return this.threadCallbacks.has(threadId);
  }

  attachThread(threadId: string, callbacks: CodexThreadCallbacks): void {
    this.threadCallbacks.set(threadId, callbacks);
    this.lastBoundThreadId = threadId;
  }

  detachThread(threadId: string): void {
    this.threadCallbacks.delete(threadId);
    if (this.lastBoundThreadId === threadId) {
      const remaining = [...this.threadCallbacks.keys()];
      this.lastBoundThreadId = remaining[remaining.length - 1];
    }
  }

  async ensureReady(callContext: PluginServiceContext): Promise<void> {
    if (this.retired) {
      throw new Error("Codex shared host has already retired.");
    }
    if (this.initialized && this.processId) return;
    if (this.initPromise) {
      await this.initPromise;
      return;
    }

    const startPromise = (async () => {
      const args = ["app-server", "--listen", "stdio://", ...this.extraArgs];
      const spawned = await callContext.process.spawn("codex", args, {
        requestKey: `codex-shared-${randomUUID().slice(0, 10)}`,
        cwd: { kind: "workspace-directory", path: this.cwdRelative },
        env: { ...CODEX_NO_COLOR_ENV },
        maxOutputBytes: CODEX_ROLLING_WINDOW_BYTES,
        outputPolicy: "rolling"
      });
      this.processId = spawned.processId;
      this.stdoutLineBuffer = "";
      this.stderrLineBuffer = "";
      this.startReader(spawned.processId);

      try {
        await this.sendRpc(
          callContext.process,
          "initialize",
          {
            clientInfo: {
              name: PLUGIN_ID,
              version: PLUGIN_VERSION,
              title: "CoTree External CLI Plugin"
            },
            capabilities: {
              experimentalApi: true,
              optOutNotificationMethods: ["turn/diff/updated"]
            }
          },
          { timeoutMs: 25_000, signal: callContext.signal }
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!/already initialized/i.test(msg)) {
          await this.retire(`Codex initialize failed: ${msg}`, callContext.process);
          throw err;
        }
      }

      await this.writeStdin(callContext.process, buildCodexRpcNotification("initialized", {}));
      this.initialized = true;
    })();

    this.initPromise = startPromise;
    try {
      await startPromise;
    } finally {
      if (this.initPromise === startPromise) {
        this.initPromise = undefined;
      }
    }
  }

  writeStdin(processClient: PluginServiceContext["process"], data: string): Promise<void> {
    if (this.retired || !this.processId) {
      return Promise.reject(new Error("Codex shared host is not running."));
    }
    const targetPid = this.processId;
    const run = this.writeChain
      .catch(() => undefined)
      .then(async () => {
        await processClient.write(targetPid, data);
      });
    this.writeChain = run;
    return run;
  }

  sendRpc(
    processClient: PluginServiceContext["process"],
    method: string,
    params?: Record<string, unknown>,
    options: { timeoutMs?: number; signal?: AbortSignal } = {}
  ): Promise<unknown> {
    if (this.retired || !this.processId) {
      return Promise.reject(new Error(`Codex RPC '${method}' failed: shared host not running.`));
    }
    const id = this.nextRpcId++;
    const timeoutMs = options.timeoutMs ?? 30_000;
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (err?: Error, value?: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        options.signal?.removeEventListener("abort", onAbort);
        this.pendingRpc.delete(id);
        if (err) reject(err);
        else resolve(value);
      };
      const onAbort = () => finish(new Error(`Codex RPC '${method}' aborted by caller.`));
      const timer = setTimeout(() => {
        finish(new Error(`Codex RPC '${method}' timed out after ${timeoutMs}ms.`));
      }, timeoutMs);
      timer.unref?.();
      if (options.signal?.aborted) {
        onAbort();
        return;
      }
      options.signal?.addEventListener("abort", onAbort, { once: true });
      this.pendingRpc.set(id, {
        method,
        resolve: (value) => finish(undefined, value),
        reject: (error) => finish(error),
        timer
      });
      const frame = buildCodexRpcRequest(id, method, params);
      void this.writeStdin(processClient, frame).catch((error) => {
        finish(error instanceof Error ? error : new Error(String(error)));
      });
    });
  }

  async sendResponse(
    processClient: PluginServiceContext["process"],
    requestId: string | number,
    result: Record<string, unknown>
  ): Promise<void> {
    await this.writeStdin(processClient, buildCodexRpcResponse(requestId, result));
  }

  async startOrResumeThread(
    callContext: PluginServiceContext,
    input: {
      resolvedCwd: string;
      permissionMode: CliPermissionMode;
      approvalPolicyOverride?: string;
      sandboxOverride?: string;
      model?: string;
      resumeSessionId?: string;
    }
  ): Promise<{ threadId: string; model?: string; reasoningEffort?: string }> {
    await this.ensureReady(callContext);
    const mapped = mapPermissionModeToCodexPolicy(input.permissionMode);
    const approvalPolicy =
      input.approvalPolicyOverride &&
      ["on-request", "untrusted", "on-failure", "never"].includes(input.approvalPolicyOverride)
        ? input.approvalPolicyOverride
        : mapped.approvalPolicy;
    const sandbox = input.sandboxOverride ?? mapped.sandbox;

    const baseParams: Record<string, unknown> = {
      cwd: input.resolvedCwd,
      approvalPolicy,
      sandbox,
      ...(mapped.approvalsReviewer ? { approvalsReviewer: mapped.approvalsReviewer } : {}),
      ...(input.model ? { model: input.model } : {}),
      ...(input.resumeSessionId ? { threadId: input.resumeSessionId } : {})
    };

    let rawResult: unknown;
    if (input.resumeSessionId) {
      rawResult = await this.resumeThreadWithRecovery(callContext, input.resumeSessionId, baseParams);
    } else {
      rawResult = await this.sendRpc(callContext.process, "thread/start", baseParams, {
        timeoutMs: 45_000,
        signal: callContext.signal
      });
    }

    const resObj = asObject(rawResult);
    const threadObj = asObject(resObj.thread);
    const threadId = asNonEmptyString(threadObj.id) ?? input.resumeSessionId;
    if (!threadId) {
      throw new Error("Codex app-server did not return a thread.id.");
    }
    const model = asNonEmptyString(resObj.model) ?? asNonEmptyString(threadObj.model);
    const reasoningEffort = asNonEmptyString(resObj.reasoningEffort);
    return {
      threadId,
      ...(model ? { model } : {}),
      ...(reasoningEffort ? { reasoningEffort } : {})
    };
  }

  private async resumeThreadWithRecovery(
    callContext: PluginServiceContext,
    threadId: string,
    baseParams: Record<string, unknown>
  ): Promise<unknown> {
    const attemptResume = async (withExcludeTurns: boolean): Promise<unknown> => {
      const params = withExcludeTurns ? { ...baseParams, excludeTurns: true } : baseParams;
      return this.sendRpc(callContext.process, "thread/resume", params, {
        timeoutMs: 45_000,
        signal: callContext.signal
      });
    };

    let useExcludeTurns = true;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await attemptResume(useExcludeTurns);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (useExcludeTurns && isUnsupportedExcludeTurnsError(msg)) {
          useExcludeTurns = false;
          continue;
        }
        if (/\bsession\s+\S+\s+is\s+archived\b/i.test(msg) || /archived/i.test(msg)) {
          await this.sendRpc(callContext.process, "thread/unarchive", { threadId }, {
            timeoutMs: 15_000,
            signal: callContext.signal
          }).catch(() => undefined);
          continue;
        }
        if (/\bthread\s+\S+\s+is\s+closing\b/i.test(msg)) {
          await this.waitForThreadClose(threadId, 6_000);
          continue;
        }
        throw error;
      }
    }
    return attemptResume(useExcludeTurns);
  }

  async startTurn(
    callContext: PluginServiceContext,
    input: {
      threadId: string;
      text: string;
      resolvedCwd: string;
      permissionMode: CliPermissionMode;
      interactionMode: CliInteractionMode;
      approvalPolicyOverride?: string;
      model?: string;
      reasoningEffort?: string;
      serviceTier?: CliServiceTier;
      attachments?: CliAttachmentRef[];
    }
  ): Promise<{ turnId?: string }> {
    await this.ensureReady(callContext);
    const mapped = mapPermissionModeToCodexPolicy(input.permissionMode);
    const approvalPolicy =
      input.approvalPolicyOverride &&
      ["on-request", "untrusted", "on-failure", "never"].includes(input.approvalPolicyOverride)
        ? input.approvalPolicyOverride
        : mapped.approvalPolicy;

    const inputItems: Array<Record<string, unknown>> = [];
    const extraFileNotes: string[] = [];
    for (const att of input.attachments ?? []) {
      if (att.mimeType.startsWith("image/")) {
        inputItems.push({ type: "localImage", path: att.path });
      } else {
        extraFileNotes.push(`[Attached file: ${att.fileName} -> ${att.path}]`);
      }
    }
    const finalText = extraFileNotes.length > 0 ? `${extraFileNotes.join("\n")}\n\n${input.text}` : input.text;
    inputItems.push({ type: "text", text: finalText });

    const params: Record<string, unknown> = {
      threadId: input.threadId,
      input: inputItems,
      cwd: input.resolvedCwd,
      approvalPolicy,
      ...(mapped.approvalsReviewer ? { approvalsReviewer: mapped.approvalsReviewer } : {}),
      ...(input.model ? { model: input.model } : {}),
      ...(input.reasoningEffort ? { effort: input.reasoningEffort } : {}),
      ...(input.serviceTier === "fast" ? { serviceTier: "fast" } : {})
    };
    if (input.interactionMode === "plan") {
      params.collaborationMode = {
        mode: "plan",
        settings: {
          ...(input.model ? { model: input.model } : {}),
          ...(input.reasoningEffort ? { reasoning_effort: input.reasoningEffort } : {})
        }
      };
    }

    const res = asObject(
      await this.sendRpc(callContext.process, "turn/start", params, {
        timeoutMs: 30_000,
        signal: callContext.signal
      })
    );
    const turnObj = asObject(res.turn);
    const turnId = asNonEmptyString(turnObj.id);
    return { ...(turnId ? { turnId } : {}) };
  }

  async steerTurn(
    callContext: PluginServiceContext,
    input: {
      threadId: string;
      expectedTurnId: string;
      text: string;
      serviceTier?: CliServiceTier;
      attachments?: CliAttachmentRef[];
    }
  ): Promise<{ turnId: string }> {
    await this.ensureReady(callContext);
    if (input.serviceTier) {
      await this.updateThreadSettings(callContext, input.threadId, { serviceTier: input.serviceTier }).catch(() => undefined);
    }
    const inputItems: Array<Record<string, unknown>> = [];
    for (const att of input.attachments ?? []) {
      if (att.mimeType.startsWith("image/")) {
        inputItems.push({ type: "localImage", path: att.path });
      }
    }
    inputItems.push({ type: "text", text: input.text });
    const res = asObject(
      await this.sendRpc(
        callContext.process,
        "turn/steer",
        {
          threadId: input.threadId,
          expectedTurnId: input.expectedTurnId,
          input: inputItems
        },
        { timeoutMs: 15_000, signal: callContext.signal }
      )
    );
    return { turnId: asNonEmptyString(res.turnId) ?? input.expectedTurnId };
  }

  async interruptTurn(callContext: PluginServiceContext, threadId: string, turnId: string): Promise<void> {
    await this.ensureReady(callContext);
    await this.sendRpc(callContext.process, "turn/interrupt", { threadId, turnId }, {
      timeoutMs: 15_000,
      signal: callContext.signal
    });
  }

  async updateThreadSettings(
    callContext: PluginServiceContext,
    threadId: string,
    settings: { serviceTier?: CliServiceTier; model?: string; reasoningEffort?: string }
  ): Promise<void> {
    await this.ensureReady(callContext);
    await this.sendRpc(
      callContext.process,
      "thread/settings/update",
      {
        threadId,
        ...(settings.serviceTier ? { serviceTier: settings.serviceTier } : {}),
        ...(settings.model ? { model: settings.model } : {}),
        ...(settings.reasoningEffort ? { reasoningEffort: settings.reasoningEffort } : {})
      },
      { timeoutMs: 10_000, signal: callContext.signal }
    );
  }

  async compactThread(callContext: PluginServiceContext, threadId: string): Promise<void> {
    await this.ensureReady(callContext);
    await this.sendRpc(callContext.process, "thread/compact/start", { threadId }, {
      timeoutMs: 25_000,
      signal: callContext.signal
    });
  }

  async forkThread(
    callContext: PluginServiceContext,
    input: { threadId: string; resolvedCwd: string; lastTurnId?: string; model?: string }
  ): Promise<{ threadId: string }> {
    await this.ensureReady(callContext);
    const params: Record<string, unknown> = {
      threadId: input.threadId,
      cwd: input.resolvedCwd,
      ...(input.lastTurnId ? { lastTurnId: input.lastTurnId } : {}),
      ...(input.model ? { model: input.model } : {})
    };
    let raw: unknown;
    try {
      raw = await this.sendRpc(callContext.process, "thread/fork", params, {
        timeoutMs: 30_000,
        signal: callContext.signal
      });
    } catch {
      raw = await this.sendRpc(
        callContext.process,
        "thread/fork",
        { threadId: input.threadId, cwd: input.resolvedCwd },
        { timeoutMs: 30_000, signal: callContext.signal }
      );
    }
    const obj = asObject(raw);
    const forkedId = asNonEmptyString(asObject(obj.thread).id) ?? asNonEmptyString(obj.threadId);
    if (!forkedId) throw new Error("Codex thread/fork did not return a new thread.id.");
    return { threadId: forkedId };
  }

  async revertThread(
    callContext: PluginServiceContext,
    threadId: string,
    beforeTurnId: string
  ): Promise<boolean> {
    await this.ensureReady(callContext);
    try {
      await this.sendRpc(callContext.process, "thread/revert", { threadId, beforeTurnId }, {
        timeoutMs: 20_000,
        signal: callContext.signal
      });
      return true;
    } catch {
      return false;
    }
  }

  async injectItems(
    callContext: PluginServiceContext,
    threadId: string,
    items: Array<Record<string, unknown>>
  ): Promise<boolean> {
    if (items.length === 0) return true;
    await this.ensureReady(callContext);
    try {
      await this.sendRpc(callContext.process, "thread/inject_items", { threadId, items }, {
        timeoutMs: 20_000,
        signal: callContext.signal
      });
      return true;
    } catch {
      return false;
    }
  }

  async listModels(callContext: PluginServiceContext): Promise<CliModelOption[]> {
    await this.ensureReady(callContext);
    const raw = await this.sendRpc(callContext.process, "model/list", {}, {
      timeoutMs: 8_000,
      signal: callContext.signal
    });
    return parseCodexModelListResult(raw);
  }

  async listNativeThreads(callContext: PluginServiceContext, limit = 30): Promise<CliNativeSessionEntry[]> {
    await this.ensureReady(callContext);
    const raw = asObject(
      await this.sendRpc(callContext.process, "thread/list", { limit }, {
        timeoutMs: 12_000,
        signal: callContext.signal
      })
    );
    const rows = Array.isArray(raw.data) ? raw.data : Array.isArray(raw.threads) ? raw.threads : [];
    const entries: CliNativeSessionEntry[] = [];
    for (const item of rows) {
      const rec = asObject(item);
      const id = asNonEmptyString(rec.id) ?? asNonEmptyString(rec.threadId);
      if (!id) continue;
      const title =
        asNonEmptyString(rec.title) ??
        asNonEmptyString(rec.preview) ??
        asNonEmptyString(rec.name) ??
        `Codex ${id.slice(0, 8)}`;
      const cwd = asNonEmptyString(rec.cwd);
      const model = asNonEmptyString(rec.model);
      const updatedAt =
        asNonEmptyString(rec.updatedAt) ??
        (typeof rec.updatedAt === "number" ? new Date(rec.updatedAt * 1000).toISOString() : undefined);
      entries.push({
        engine: "codex",
        externalSessionId: id,
        title: title.slice(0, 120),
        ...(cwd ? { cwd } : {}),
        ...(model ? { model } : {}),
        ...(updatedAt ? { updatedAt } : {}),
        ...(asNonEmptyString(rec.preview) ? { preview: asNonEmptyString(rec.preview)!.slice(0, 200) } : {})
      });
    }
    return entries;
  }

  async unsubscribeThread(callContext: PluginServiceContext, threadId: string): Promise<void> {
    this.detachThread(threadId);
    if (this.retired || !this.processId || !this.initialized) return;
    // If no other threads remain on this shared host, caller will immediately stop the process.
    if (this.threadCallbacks.size === 0) return;
    try {
      const waitClose = this.waitForThreadClose(threadId, 400);
      await this.sendRpc(callContext.process, "thread/unsubscribe", { threadId }, {
        timeoutMs: 1_200,
        signal: callContext.signal
      });
      await waitClose;
    } catch {
      // Best-effort unsubscribe; older Codex versions may not implement it.
    }
  }

  private waitForThreadClose(threadId: string, timeoutMs: number): Promise<void> {
    return new Promise<void>((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        const list = this.threadClosings.get(threadId);
        if (list) {
          const next = list.filter((fn) => fn !== finish);
          if (next.length > 0) this.threadClosings.set(threadId, next);
          else this.threadClosings.delete(threadId);
        }
        resolve();
      };
      const timer = setTimeout(finish, timeoutMs);
      timer.unref?.();
      const existing = this.threadClosings.get(threadId) ?? [];
      existing.push(finish);
      this.threadClosings.set(threadId, existing);
    });
  }

  async retire(
    reason: string,
    processClient?: PluginServiceContext["process"],
    exitCode?: number,
    signal?: string
  ): Promise<void> {
    if (this.retired) return;
    this.retired = true;
    this.initialized = false;
    const pid = this.processId;
    for (const [id, pending] of [...this.pendingRpc.entries()]) {
      clearTimeout(pending.timer);
      this.pendingRpc.delete(id);
      pending.reject(new Error(`Codex RPC '${pending.method}' failed: ${reason}`));
    }
    for (const waiters of this.threadClosings.values()) {
      for (const wake of waiters) wake();
    }
    this.threadClosings.clear();
    const callbacks = [...this.threadCallbacks.values()];
    this.threadCallbacks.clear();
    if (pid && processClient) {
      await processClient.stop(pid).catch(() => undefined);
    }
    for (const cb of callbacks) {
      try {
        cb.onHostRetired(reason, exitCode, signal);
      } catch {
        // Isolate subscriber errors.
      }
    }
  }

  private startReader(boundProcessId: string): void {
    const ctx = this.getLifecycleContext();
    if (!ctx) return;
    void (async () => {
      let cursor = { stdoutOffset: 0, stderrOffset: 0 };
      let prevHadMore = false;
      let consecutiveReadErrors = 0;
      try {
        while (!ctx.signal.aborted && !this.retired && this.processId === boundProcessId) {
          const prevCursor = cursor;
          let page;
          try {
            page = await ctx.process.read(boundProcessId, {
              cursor,
              maxBytes: CODEX_READ_PAGE_BYTES,
              timeoutMs: prevHadMore ? 0 : 250
            });
            consecutiveReadErrors = 0;
          } catch (readError) {
            if (
              ctx.signal.aborted ||
              this.retired ||
              this.processId !== boundProcessId ||
              isFatalProcessReadError(readError) ||
              consecutiveReadErrors >= this.readRetryBackoffMs.length
            ) {
              throw readError;
            }
            const delayMs = this.readRetryBackoffMs[consecutiveReadErrors] ?? 2_000;
            consecutiveReadErrors += 1;
            const waited = await waitForRetryBackoff(delayMs, ctx.signal);
            if (!waited || this.retired || this.processId !== boundProcessId) return;
            continue;
          }
          cursor = page.cursor;
          prevHadMore = Boolean(page.more);

          const stdoutBytes = page.stdout ? Buffer.byteLength(page.stdout, "utf8") : 0;
          const stderrBytes = page.stderr ? Buffer.byteLength(page.stderr, "utf8") : 0;
          const stdoutDropped = cursor.stdoutOffset > prevCursor.stdoutOffset + stdoutBytes + 4;
          const stderrDropped = cursor.stderrOffset > prevCursor.stderrOffset + stderrBytes + 4;

          let stdoutChunk = page.stdout ?? "";
          let stderrChunk = page.stderr ?? "";
          if (stdoutDropped) {
            this.stdoutLineBuffer = "";
            const nl = stdoutChunk.indexOf("\n");
            stdoutChunk = nl >= 0 ? stdoutChunk.slice(nl + 1) : "";
          }
          if (stderrDropped) {
            this.stderrLineBuffer = "";
            const nl = stderrChunk.indexOf("\n");
            stderrChunk = nl >= 0 ? stderrChunk.slice(nl + 1) : "";
          }
          if (stdoutChunk) this.handleStdout(stdoutChunk, false);
          if (stderrChunk) this.handleStderr(stderrChunk);

          if (page.exited || page.executionSettled) {
            if (page.more) continue;
            this.handleStdout("", true);
            await this.retire(
              `Codex shared process exited (state=${page.state}, exitCode=${page.exitCode ?? "none"})`,
              undefined,
              page.exitCode,
              page.signal
            );
            break;
          }
        }
      } catch (error) {
        if (!ctx.signal.aborted && !this.retired && this.processId === boundProcessId) {
          const msg = error instanceof Error ? error.message : String(error);
          await this.retire(`Codex shared reader failed: ${msg}`);
        }
      }
    })();
  }

  private handleStdout(chunk: string, flushPartial: boolean): void {
    if (chunk) this.stdoutLineBuffer += chunk;
    const parts = this.stdoutLineBuffer.split(/\r?\n/);
    this.stdoutLineBuffer = flushPartial ? "" : (parts.pop() ?? "");
    const makeInterventionId = () => `int_${randomUUID().slice(0, 12)}`;
    for (const line of parts) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let parsedObj: Record<string, unknown> | undefined;
      try {
        const raw = JSON.parse(trimmed);
        if (raw && typeof raw === "object" && !Array.isArray(raw)) {
          parsedObj = raw as Record<string, unknown>;
        }
      } catch {
        // Handled below via parseCodexStdoutLine.
      }
      if (parsedObj) {
        const hasId = typeof parsedObj.id === "string" || typeof parsedObj.id === "number";
        const method = asNonEmptyString(parsedObj.method);
        if (hasId && !method) {
          const pending = this.pendingRpc.get(parsedObj.id as string | number);
          if (pending) {
            const errObj = asObject(parsedObj.error);
            if (parsedObj.error) {
              pending.reject(
                new Error(
                  asNonEmptyString(errObj.message) ??
                    `JSON-RPC error (${typeof errObj.code === "number" ? errObj.code : -1})`
                )
              );
            } else {
              pending.resolve(parsedObj.result);
            }
          }
          continue;
        }
      }

      const nowIso = new Date().toISOString();
      const actions = parseCodexStdoutLine(line, nowIso, makeInterventionId);
      if (actions.length === 0) continue;

      for (const action of actions) {
        if (action.kind === "thread_closed") {
          const waiters = this.threadClosings.get(action.threadId);
          if (waiters) {
            for (const wake of waiters) wake();
          }
        }
      }

      const targetThreadId = parsedObj ? extractCodexThreadIdFromObject(parsedObj) : undefined;
      const targetCb =
        (targetThreadId ? this.threadCallbacks.get(targetThreadId) : undefined) ??
        (this.threadCallbacks.size === 1 ? [...this.threadCallbacks.values()][0] : undefined) ??
        (this.lastBoundThreadId ? this.threadCallbacks.get(this.lastBoundThreadId) : undefined);
      if (targetCb) {
        targetCb.onActions(actions, line);
      }
    }
  }

  private handleStderr(chunk: string): void {
    const cleaned = stripAnsi(chunk);
    if (!cleaned) return;
    this.stderrLineBuffer += cleaned;
    const targetCb =
      (this.lastBoundThreadId ? this.threadCallbacks.get(this.lastBoundThreadId) : undefined) ??
      [...this.threadCallbacks.values()][0];
    if (targetCb) {
      targetCb.onStderr(cleaned);
    }
  }
}

export class CodexSharedHostPool {
  private readonly hosts = new Map<string, CodexSharedHost>();

  constructor(private readonly getLifecycleContext: () => PluginServiceContext | undefined) {}

  private makeKey(executionWorkspace: string, cwdRelative: string, extraArgs: string[]): string {
    const ws = process.platform === "win32" ? executionWorkspace.toLowerCase() : executionWorkspace;
    return JSON.stringify([ws, cwdRelative, extraArgs]);
  }

  getOrCreate(executionWorkspace: string, cwdRelative: string, extraArgs: string[]): CodexSharedHost {
    const key = this.makeKey(executionWorkspace, cwdRelative, extraArgs);
    const existing = this.hosts.get(key);
    if (existing && !existing.retired) return existing;
    const host = new CodexSharedHost(this.getLifecycleContext, key, cwdRelative, extraArgs);
    this.hosts.set(key, host);
    return host;
  }

  findWarmHost(executionWorkspace?: string): CodexSharedHost | undefined {
    for (const host of this.hosts.values()) {
      if (host.retired || !host.initialized) continue;
      if (!executionWorkspace) return host;
      const ws = process.platform === "win32" ? executionWorkspace.toLowerCase() : executionWorkspace;
      if (host.hostKey.startsWith(JSON.stringify([ws]).slice(0, -1))) return host;
    }
    return undefined;
  }

  async stopHostIfIdle(host: CodexSharedHost, processClient: PluginServiceContext["process"]): Promise<void> {
    if (host.activeThreadCount > 0) return;
    await host.retire("all threads stopped", processClient);
    if (this.hosts.get(host.hostKey) === host) {
      this.hosts.delete(host.hostKey);
    }
  }

  async stopAll(processClient: PluginServiceContext["process"]): Promise<void> {
    const all = [...this.hosts.values()];
    this.hosts.clear();
    await Promise.all(all.map((host) => host.retire("service stopping", processClient)));
  }
}
