import {
  type CliApprovalDecision,
  type CliInterventionKind,
  type CliModelOption,
  type CliPendingIntervention,
  type CliPermissionMode,
  type CliUserInputQuestion,
  stripAnsi,
  truncateText
} from "./shared.js";

export type ParsedProtocolAction =
  | { kind: "rpc_response"; id: string | number; result?: unknown; error?: { code?: number; message?: string; data?: unknown } }
  | { kind: "session_id"; externalSessionId: string; model?: string; summary?: string }
  | { kind: "turn_started"; turnId?: string; summary: string }
  | { kind: "reasoning_delta"; text: string; blockKey?: string; turnId?: string }
  | { kind: "assistant_delta"; text: string; blockKey?: string; turnId?: string }
  | { kind: "assistant_message"; text: string; blockKey?: string; turnId?: string; providerMessageId?: string }
  | { kind: "plan_delta"; text: string; blockKey?: string; title?: string; turnId?: string }
  | { kind: "plan_completed"; text: string; blockKey?: string; title?: string; turnId?: string }
  | { kind: "image_generated"; blockKey: string; savedPath?: string; revisedPrompt?: string; status: "streaming" | "completed" | "failed"; turnId?: string }
  | { kind: "command_started"; blockKey: string; command: string; cwd?: string; turnId?: string }
  | { kind: "command_delta"; blockKey: string; text: string; turnId?: string }
  | { kind: "command_completed"; blockKey: string; command?: string; output?: string; exitCode?: number; status: "completed" | "failed"; turnId?: string }
  | { kind: "file_change_started"; blockKey: string; title: string; details?: Record<string, unknown>; turnId?: string }
  | { kind: "file_change_delta"; blockKey: string; text: string; turnId?: string }
  | { kind: "file_change_completed"; blockKey: string; title?: string; diff?: string; status: "completed" | "failed"; details?: Record<string, unknown>; turnId?: string }
  | { kind: "tool_started"; blockKey: string; toolName: string; parameters?: Record<string, unknown>; turnId?: string }
  | { kind: "tool_completed"; blockKey: string; toolName?: string; output?: string; status: "completed" | "failed"; durationMs?: number; parameters?: Record<string, unknown>; turnId?: string }
  | { kind: "usage_updated"; usage: Record<string, unknown>; contextWindow?: number; costUsd?: number; turnId?: string }
  | { kind: "thread_closed"; threadId: string }
  | {
      kind: "turn_completed";
      turnId?: string;
      status: "completed" | "failed" | "interrupted";
      finalText?: string;
      errorMessage?: string;
      durationMs?: number;
      usage?: Record<string, unknown>;
      costUsd?: number;
      providerMessageId?: string;
      data?: Record<string, unknown>;
    }
  | { kind: "intervention"; intervention: CliPendingIntervention }
  | { kind: "notice"; summary: string; data?: Record<string, unknown> };

export function normalizeUserInputQuestions(raw: unknown): CliUserInputQuestion[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: CliUserInputQuestion[] = [];
  for (let idx = 0; idx < raw.length; idx += 1) {
    const item = asRecord(raw[idx]);
    if (!item) continue;
    const question = asString(item.question) ?? asString(item.prompt) ?? asString(item.text);
    if (!question) continue;
    const id = asString(item.id) ?? asString(item.header) ?? `q_${idx + 1}`;
    const header = asString(item.header);
    const multiSelect = item.multiSelect === true || item.multi_select === true;
    const rawOptions = Array.isArray(item.options) ? item.options : undefined;
    const options = rawOptions
      ?.map((opt) => {
        if (typeof opt === "string") return { label: opt, value: opt };
        const rec = asRecord(opt);
        if (!rec) return undefined;
        const label = asString(rec.label) ?? asString(rec.title) ?? asString(rec.value);
        if (!label) return undefined;
        const desc = asString(rec.description);
        const val = asString(rec.value) ?? label;
        return { label, value: val, ...(desc ? { description: desc } : {}) };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
    out.push({
      id,
      ...(header ? { header } : {}),
      question,
      ...(multiSelect ? { multiSelect: true } : {}),
      ...(options && options.length > 0 ? { options } : {})
    });
  }
  return out.length > 0 ? out : undefined;
}

export function extractCodexThreadIdFromObject(obj: Record<string, unknown>): string | undefined {
  const params = asRecord(obj.params);
  if (!params) return asString(obj.thread_id) ?? asString(obj.threadId);
  return (
    asString(params.threadId) ??
    asString(params.thread_id) ??
    asString(asRecord(params.thread)?.id) ??
    asString(asRecord(params.turn)?.threadId)
  );
}

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

function stringifyCommand(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map((item) => String(item)).join(" ");
  return "";
}

function stringifyPreview(value: unknown, limit = 4000): string {
  if (typeof value === "string") return truncateText(value, limit);
  if (value === undefined || value === null) return "";
  try {
    return truncateText(JSON.stringify(value, null, 2), limit);
  } catch {
    return truncateText(String(value), limit);
  }
}

// ============================================================================
// Codex app-server v2 JSON-RPC 2.0 protocol helpers
// ============================================================================

export function buildCodexSpawnArgs(mode: "interactive" | "oneshot", input: {
  prompt: string;
  model?: string;
  sandbox?: string;
  extraArgs?: string[];
}): string[] {
  const extra = input.extraArgs ?? [];
  if (mode === "interactive") {
    return ["app-server", "--listen", "stdio://", ...extra];
  }
  const args = ["exec", "--json"];
  if (input.model) args.push("--model", input.model);
  if (input.sandbox) args.push("--sandbox", input.sandbox);
  args.push(...extra, input.prompt);
  return args;
}

export function buildCodexRpcRequest(id: number, method: string, params?: Record<string, unknown>): string {
  return `${JSON.stringify({ jsonrpc: "2.0", id, method, ...(params !== undefined ? { params } : {}) })}\n`;
}

export function buildCodexRpcNotification(method: string, params?: Record<string, unknown>): string {
  return `${JSON.stringify({ jsonrpc: "2.0", method, ...(params !== undefined ? { params } : {}) })}\n`;
}

export function buildCodexRpcResponse(id: string | number, result: Record<string, unknown>): string {
  return `${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`;
}

export function mapCodexDecision(decision: CliApprovalDecision): string {
  switch (decision) {
    case "accept":
      return "accept";
    case "accept_for_session":
      return "acceptForSession";
    case "decline":
      return "decline";
    case "cancel":
      return "cancel";
  }
}

export function mapLegacyCodexDecision(decision: CliApprovalDecision): string {
  switch (decision) {
    case "accept":
      return "approved";
    case "accept_for_session":
      return "approved_for_session";
    case "decline":
      return "denied";
    case "cancel":
      return "abort";
  }
}

export function buildCodexInterventionResponse(
  intervention: CliPendingIntervention,
  input: {
    decision?: CliApprovalDecision;
    answers?: Record<string, string | string[]>;
    text?: string;
  }
): Record<string, unknown> {
  if (intervention.method === "item/tool/requestUserInput") {
    const formatted: Record<string, { answers: string[] }> = {};
    if (input.answers) {
      for (const [key, value] of Object.entries(input.answers)) {
        formatted[key] = { answers: Array.isArray(value) ? value : [value] };
      }
    } else if (input.text !== undefined) {
      const questions = Array.isArray(intervention.details.questions)
        ? intervention.details.questions
        : [];
      const firstId = asString(asRecord(questions[0])?.id) ?? "answer";
      formatted[firstId] = { answers: [input.text] };
    }
    return { answers: formatted };
  }

  if (intervention.method === "item/permissions/requestApproval") {
    const decision = input.decision ?? "decline";
    const approved = decision === "accept" || decision === "accept_for_session";
    const requested = asRecord(intervention.details.permissions) ?? {};
    return {
      permissions: approved ? requested : {},
      scope: decision === "accept_for_session" ? "session" : "turn"
    };
  }

  if (intervention.method === "applyPatchApproval" || intervention.method === "execCommandApproval") {
    return { decision: mapLegacyCodexDecision(input.decision ?? "decline") };
  }

  return { decision: mapCodexDecision(input.decision ?? "decline") };
}

function classifyCodexServerRequest(method: string): { kind: CliInterventionKind; title: string } | undefined {
  switch (method) {
    case "item/commandExecution/requestApproval":
    case "execCommandApproval":
      return { kind: "command_approval", title: "Codex 请求执行命令审批" };
    case "item/fileChange/requestApproval":
    case "applyPatchApproval":
      return { kind: "file_change_approval", title: "Codex 请求文件修改审批" };
    case "item/permissions/requestApproval":
      return { kind: "permissions_approval", title: "Codex 请求额外权限" };
    case "item/tool/requestUserInput":
    case "mcpServer/elicitation/request":
      return { kind: "user_input", title: "Codex 等待用户输入" };
    default:
      return undefined;
  }
}

function formatCodexFileChanges(item: Record<string, unknown>): { title: string; diff: string } {
  const changes = Array.isArray(item.changes) ? item.changes : [];
  const paths: string[] = [];
  const diffParts: string[] = [];
  for (const raw of changes) {
    const ch = asRecord(raw);
    if (!ch) continue;
    const p = asString(ch.path) ?? asString(ch.file) ?? "";
    const kind = asString(ch.kind) ?? "edit";
    if (p) paths.push(`${kind}: ${p}`);
    const diff = asString(ch.diff) ?? asString(ch.patch) ?? "";
    if (diff) {
      diffParts.push(p ? `--- ${p}\n${diff}` : diff);
    }
  }
  const title = paths.length > 0 ? `文件变更 (${paths.slice(0, 3).join(", ")}${paths.length > 3 ? ` +${paths.length - 3}` : ""})` : "文件变更";
  const directDiff = asString(item.diff) ?? asString(item.patch) ?? "";
  return { title, diff: diffParts.join("\n\n") || directDiff };
}

export function parseCodexStdoutLine(line: string, nowIso: string, makeInterventionId: () => string): ParsedProtocolAction[] {
  const trimmed = line.trim();
  if (!trimmed) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    if (trimmed.length > 1024 && (trimmed.startsWith("{") || trimmed.includes('"jsonrpc"') || trimmed.includes('"thread"'))) {
      return [
        {
          kind: "notice",
          summary: `跳过一条不完整的 JSON 协议输出 (${trimmed.length} chars)`
        }
      ];
    }
    return [{ kind: "notice", summary: truncateText(trimmed, 400) }];
  }
  const obj = asRecord(parsed);
  if (!obj) return [];

  const hasId = typeof obj.id === "string" || typeof obj.id === "number";
  const method = asString(obj.method);

  if (hasId && !method) {
    const errObj = asRecord(obj.error);
    return [
      {
        kind: "rpc_response",
        id: obj.id as string | number,
        ...(obj.result !== undefined ? { result: obj.result } : {}),
        ...(errObj
          ? {
              error: {
                ...(typeof errObj.code === "number" ? { code: errObj.code } : {}),
                ...(asString(errObj.message) ? { message: asString(errObj.message) } : {}),
                ...(errObj.data !== undefined ? { data: errObj.data } : {})
              }
            }
          : {})
      }
    ];
  }

  if (hasId && method) {
    const params = asRecord(obj.params) ?? {};
    const classified = classifyCodexServerRequest(method);
    const questions = normalizeUserInputQuestions(params.questions);
    return [
      {
        kind: "intervention",
        intervention: {
          id: makeInterventionId(),
          requestId: obj.id as string | number,
          kind: classified?.kind ?? "control_request",
          method,
          title: classified?.title ?? `Codex server request: ${method}`,
          details: params,
          ...(questions ? { questions } : {}),
          createdAt: nowIso
        }
      }
    ];
  }

  if (method) {
    const params = asRecord(obj.params) ?? {};
    const turnId = asString(params.turnId);
    const itemId = asString(params.itemId);
    switch (method) {
      case "thread/closed": {
        const closedId = asString(params.threadId) ?? asString(asRecord(params.thread)?.id);
        return closedId ? [{ kind: "thread_closed", threadId: closedId }] : [];
      }
      case "thread/tokenUsage/updated": {
        const tokenUsage = asRecord(params.tokenUsage) ?? asRecord(params.usage) ?? params;
        const total = asRecord(tokenUsage.total) ?? asRecord(tokenUsage.last) ?? tokenUsage;
        const inputTokens = asNumber(total.inputTokens) ?? asNumber(total.input_tokens);
        const outputTokens = asNumber(total.outputTokens) ?? asNumber(total.output_tokens);
        const cacheReadTokens = asNumber(total.cachedInputTokens) ?? asNumber(total.cache_read_tokens);
        const totalTokens = asNumber(total.totalTokens) ?? asNumber(total.total_tokens) ?? (inputTokens !== undefined && outputTokens !== undefined ? inputTokens + outputTokens : undefined);
        const contextWindow = asNumber(tokenUsage.modelContextWindow) ?? asNumber(params.modelContextWindow);
        const usageObj: Record<string, unknown> = {
          ...(inputTokens !== undefined ? { input_tokens: inputTokens } : {}),
          ...(outputTokens !== undefined ? { output_tokens: outputTokens } : {}),
          ...(cacheReadTokens !== undefined ? { cache_read_tokens: cacheReadTokens } : {}),
          ...(totalTokens !== undefined ? { total_tokens: totalTokens } : {})
        };
        return Object.keys(usageObj).length > 0 || contextWindow !== undefined
          ? [{ kind: "usage_updated", usage: usageObj, ...(contextWindow !== undefined ? { contextWindow } : {}), ...(turnId ? { turnId } : {}) }]
          : [];
      }
      case "item/plan/delta": {
        const delta = typeof params.delta === "string" ? params.delta : "";
        return delta ? [{ kind: "plan_delta", text: delta, blockKey: `plan:${itemId ?? "default"}`, ...(turnId ? { turnId } : {}) }] : [];
      }
      case "turn/plan/updated": {
        const explanation = asString(params.explanation);
        const planItems = Array.isArray(params.plan) ? params.plan : [];
        const lines: string[] = [];
        if (explanation) lines.push(explanation, "");
        for (const step of planItems) {
          const s = asRecord(step);
          if (!s) continue;
          const status = asString(s.status) ?? "pending";
          const mark = status === "completed" ? "[x]" : status === "inProgress" ? "[~]" : "[ ]";
          const label = asString(s.step) ?? asString(s.title) ?? "";
          if (label) lines.push(`- ${mark} ${label}`);
        }
        const planText = lines.join("\n").trim();
        return planText
          ? [{ kind: "plan_completed", text: planText, blockKey: `plan:${turnId ?? "active"}`, title: "执行计划", ...(turnId ? { turnId } : {}) }]
          : [];
      }
      case "turn/started": {
        const turn = asRecord(params.turn);
        const resolvedTurnId = asString(turn?.id) ?? turnId;
        return [{ kind: "turn_started", ...(resolvedTurnId ? { turnId: resolvedTurnId } : {}), summary: `Codex turn started${resolvedTurnId ? ` (${resolvedTurnId})` : ""}` }];
      }
      case "item/agentMessage/delta": {
        const delta = typeof params.delta === "string" ? params.delta : "";
        return delta ? [{ kind: "assistant_delta", text: delta, ...(itemId ? { blockKey: `msg:${itemId}` } : {}), ...(turnId ? { turnId } : {}) }] : [];
      }
      case "item/reasoning/summaryTextDelta":
      case "item/reasoning/textDelta": {
        const delta = typeof params.delta === "string" ? params.delta : "";
        return delta ? [{ kind: "reasoning_delta", text: delta, ...(itemId ? { blockKey: `reason:${itemId}` } : {}), ...(turnId ? { turnId } : {}) }] : [];
      }
      case "item/commandExecution/outputDelta": {
        const delta = typeof params.delta === "string" ? params.delta : "";
        return delta ? [{ kind: "command_delta", blockKey: `cmd:${itemId ?? "default"}`, text: delta, ...(turnId ? { turnId } : {}) }] : [];
      }
      case "item/fileChange/outputDelta": {
        const delta = typeof params.delta === "string" ? params.delta : "";
        return delta ? [{ kind: "file_change_delta", blockKey: `file:${itemId ?? "default"}`, text: delta, ...(turnId ? { turnId } : {}) }] : [];
      }
      case "item/started": {
        const item = asRecord(params.item);
        const itemType = asString(item?.type);
        const keyId = asString(item?.id) ?? itemId ?? "item";
        if (itemType === "commandExecution") {
          const command = stringifyCommand(item?.command) || "shell command";
          const cwd = asString(item?.cwd);
          return [{ kind: "command_started", blockKey: `cmd:${keyId}`, command, ...(cwd ? { cwd } : {}), ...(turnId ? { turnId } : {}) }];
        }
        if (itemType === "fileChange") {
          const { title } = formatCodexFileChanges(item ?? {});
          return [{ kind: "file_change_started", blockKey: `file:${keyId}`, title, details: item, ...(turnId ? { turnId } : {}) }];
        }
        if (itemType === "mcpToolCall" || itemType === "toolCall") {
          const toolName = asString(item?.tool) ?? asString(item?.name) ?? itemType;
          return [{ kind: "tool_started", blockKey: `tool:${keyId}`, toolName, parameters: asRecord(item?.arguments) ?? asRecord(item?.input), ...(turnId ? { turnId } : {}) }];
        }
        if (itemType === "collabAgentToolCall") {
          const toolName = `collab:${asString(item?.tool) ?? "agent"}`;
          const paramsObj = {
            ...(asString(item?.prompt) ? { prompt: asString(item?.prompt) } : {}),
            ...(asString(item?.senderThreadId) ? { senderThreadId: asString(item?.senderThreadId) } : {})
          };
          return [{
            kind: "tool_started",
            blockKey: `tool:${keyId}`,
            toolName,
            ...(Object.keys(paramsObj).length > 0 ? { parameters: paramsObj } : {}),
            ...(turnId ? { turnId } : {})
          }];
        }
        if (itemType === "imageGeneration") {
          const savedPath = asString(item?.savedPath) ?? asString(item?.path);
          const revisedPrompt = asString(item?.revisedPrompt) ?? asString(item?.prompt);
          return [{
            kind: "image_generated",
            blockKey: `img:${keyId}`,
            ...(savedPath ? { savedPath } : {}),
            ...(revisedPrompt ? { revisedPrompt } : {}),
            status: "streaming",
            ...(turnId ? { turnId } : {})
          }];
        }
        if (itemType === "plan") {
          const text = asString(item?.text) ?? "";
          return [{ kind: "plan_delta", text, blockKey: `plan:${keyId}`, ...(turnId ? { turnId } : {}) }];
        }
        return [];
      }
      case "item/completed": {
        const item = asRecord(params.item);
        const itemType = asString(item?.type);
        const keyId = asString(item?.id) ?? itemId ?? "item";
        if (itemType === "agentMessage") {
          const text = extractCodexMessageText(item);
          return text ? [{ kind: "assistant_message", text, blockKey: `msg:${keyId}`, ...(turnId ? { turnId } : {}) }] : [];
        }
        if (itemType === "plan") {
          const text = asString(item?.text) ?? extractCodexMessageText(item);
          return text ? [{ kind: "plan_completed", text, blockKey: `plan:${keyId}`, title: "实施方案", ...(turnId ? { turnId } : {}) }] : [];
        }
        if (itemType === "imageGeneration") {
          const savedPath = asString(item?.savedPath) ?? asString(item?.path);
          const revisedPrompt = asString(item?.revisedPrompt) ?? asString(item?.prompt);
          const failed = item?.status === "failed";
          return [{
            kind: "image_generated",
            blockKey: `img:${keyId}`,
            ...(savedPath ? { savedPath } : {}),
            ...(revisedPrompt ? { revisedPrompt } : {}),
            status: failed ? "failed" : "completed",
            ...(turnId ? { turnId } : {})
          }];
        }
        if (itemType === "reasoning") {
          const summary = Array.isArray(item?.summary) ? item!.summary.map(String).join("\n") : asString(item?.text);
          return summary ? [{ kind: "reasoning_delta", text: summary, blockKey: `reason:${keyId}`, ...(turnId ? { turnId } : {}) }] : [];
        }
        if (itemType === "commandExecution") {
          const command = stringifyCommand(item?.command);
          const output = asString(item?.aggregatedOutput) ?? asString(item?.output);
          const exitCode = asNumber(item?.exitCode);
          const failed = item?.status === "failed" || (exitCode !== undefined && exitCode !== 0);
          return [{
            kind: "command_completed",
            blockKey: `cmd:${keyId}`,
            ...(command ? { command } : {}),
            ...(output ? { output } : {}),
            ...(exitCode !== undefined ? { exitCode } : {}),
            status: failed ? "failed" : "completed",
            ...(turnId ? { turnId } : {})
          }];
        }
        if (itemType === "fileChange") {
          const { title, diff } = formatCodexFileChanges(item ?? {});
          const failed = item?.status === "failed" || item?.status === "declined";
          return [{
            kind: "file_change_completed",
            blockKey: `file:${keyId}`,
            title,
            ...(diff ? { diff } : {}),
            status: failed ? "failed" : "completed",
            details: item,
            ...(turnId ? { turnId } : {})
          }];
        }
        if (itemType === "mcpToolCall" || itemType === "toolCall") {
          const toolName = asString(item?.tool) ?? asString(item?.name) ?? itemType;
          const output = stringifyPreview(item?.result ?? item?.output ?? item?.error);
          const failed = item?.status === "failed" || Boolean(item?.error);
          return [{
            kind: "tool_completed",
            blockKey: `tool:${keyId}`,
            toolName,
            ...(output ? { output } : {}),
            status: failed ? "failed" : "completed",
            ...(turnId ? { turnId } : {})
          }];
        }
        if (itemType === "collabAgentToolCall") {
          const toolName = `collab:${asString(item?.tool) ?? "agent"}`;
          const output = stringifyPreview(item?.agentsStates ?? item?.result ?? item?.error);
          const failed = item?.status === "failed" || Boolean(item?.error);
          return [{
            kind: "tool_completed",
            blockKey: `tool:${keyId}`,
            toolName,
            ...(output ? { output } : {}),
            status: failed ? "failed" : "completed",
            ...(turnId ? { turnId } : {})
          }];
        }
        return [];
      }
      case "turn/completed": {
        const turn = asRecord(params.turn);
        const resolvedTurnId = asString(turn?.id) ?? turnId;
        const rawStatus = asString(turn?.status);
        const status: "completed" | "failed" | "interrupted" =
          rawStatus === "interrupted" ? "interrupted" : rawStatus === "failed" ? "failed" : "completed";
        const errRecord = asRecord(turn?.error);
        const errorMessage = asString(errRecord?.message) ?? asString(turn?.error);
        const finalText = extractCodexTurnFinalText(turn);
        const usage = asRecord(turn?.usage) ?? asRecord(params.usage);
        return [
          {
            kind: "turn_completed",
            ...(resolvedTurnId ? { turnId: resolvedTurnId } : {}),
            status,
            ...(finalText ? { finalText } : {}),
            ...(errorMessage ? { errorMessage } : {}),
            ...(usage ? { usage } : {}),
            data: { status: rawStatus ?? status }
          }
        ];
      }
      case "error": {
        const err = asRecord(params.error);
        const msg = asString(err?.message) ?? asString(params.message) ?? "Codex reported an error";
        const willRetry = params.willRetry === true;
        return [{ kind: "notice", summary: `Codex error${willRetry ? " (retrying)" : ""}: ${truncateText(msg, 300)}`, data: params }];
      }
      default:
        return [];
    }
  }

  const eventType = asString(obj.type);
  if (eventType) {
    if (eventType === "thread.started") {
      const threadId = asString(obj.thread_id);
      if (threadId) return [{ kind: "session_id", externalSessionId: threadId, summary: `Codex thread started (${threadId})` }];
    }
    if (eventType === "turn.started") {
      return [{ kind: "turn_started", summary: "Codex exec turn started" }];
    }
    if (eventType === "item.completed") {
      const item = asRecord(obj.item);
      if (asString(item?.type) === "agent_message" && typeof item?.text === "string") {
        return [{ kind: "assistant_message", text: item.text }];
      }
      return [{
        kind: "tool_completed",
        blockKey: `exec:${asString(item?.id) ?? "item"}`,
        toolName: asString(item?.type) ?? "item",
        output: stringifyPreview(item),
        status: "completed"
      }];
    }
    if (eventType === "turn.completed") {
      return [{ kind: "turn_completed", status: "completed", usage: asRecord(obj.usage) }];
    }
    if (eventType === "turn.failed" || eventType === "error") {
      const msg = asString(asRecord(obj.error)?.message) ?? asString(obj.message) ?? "Codex turn failed";
      return [{ kind: "turn_completed", status: "failed", errorMessage: msg }];
    }
  }

  return [];
}

function extractCodexMessageText(item: Record<string, unknown> | undefined): string | undefined {
  if (!item) return undefined;
  if (typeof item.text === "string" && item.text.length > 0) return item.text;
  if (Array.isArray(item.content)) {
    const parts = item.content
      .map((entry) => {
        const rec = asRecord(entry);
        return typeof rec?.text === "string" ? rec.text : "";
      })
      .filter(Boolean);
    if (parts.length > 0) return parts.join("");
  }
  return undefined;
}

function extractCodexTurnFinalText(turn: Record<string, unknown> | undefined): string | undefined {
  if (!turn || !Array.isArray(turn.items)) return undefined;
  const messages: string[] = [];
  for (const rawItem of turn.items) {
    const item = asRecord(rawItem);
    if (asString(item?.type) === "agentMessage") {
      const text = extractCodexMessageText(item);
      if (text) messages.push(text);
    }
  }
  return messages.length > 0 ? messages.join("\n") : undefined;
}

// ============================================================================
// Claude Code CLI stream-json NDJSON protocol helpers
// ============================================================================

const CLAUDE_PERMISSION_MODES = new Set([
  "default",
  "acceptEdits",
  "bypassPermissions",
  "plan",
  "dontAsk",
  "auto"
]);

export function mapClaudePermissionMode(approvalPolicy?: string): string | undefined {
  if (!approvalPolicy) return undefined;
  if (approvalPolicy === "accept-edits") return "acceptEdits";
  if (CLAUDE_PERMISSION_MODES.has(approvalPolicy)) return approvalPolicy;
  if (approvalPolicy === "never") return "bypassPermissions";
  if (approvalPolicy === "on-request" || approvalPolicy === "untrusted" || approvalPolicy === "on-failure") {
    return "default";
  }
  return undefined;
}

export function buildClaudeSpawnArgs(mode: "interactive" | "oneshot", input: {
  prompt?: string;
  model?: string;
  reasoningEffort?: string;
  approvalPolicy?: string;
  resumeSessionId?: string;
  extraArgs?: string[];
}): string[] {
  const args = ["-p", "--output-format", "stream-json", "--verbose"];
  if (mode === "interactive") {
    args.push("--input-format", "stream-json", "--replay-user-messages");
  }
  const permissionMode = mapClaudePermissionMode(input.approvalPolicy);
  if (permissionMode) {
    args.push("--permission-mode", permissionMode);
  }
  if (input.model) {
    args.push("--model", input.model);
  }
  if (input.reasoningEffort && ["low", "medium", "high", "xhigh", "max"].includes(input.reasoningEffort)) {
    args.push("--effort", input.reasoningEffort);
  }
  if (input.resumeSessionId) {
    args.push("--resume", input.resumeSessionId);
  }
  if (input.extraArgs?.length) {
    args.push(...input.extraArgs);
  }
  if (mode === "oneshot" && input.prompt) {
    args.push(input.prompt);
  }
  return args;
}

export function buildClaudeUserFrame(content: string): string {
  return `${JSON.stringify({
    type: "user",
    message: {
      role: "user",
      content
    }
  })}\n`;
}

export function buildClaudeInterruptFrame(requestId: string): string {
  return `${JSON.stringify({
    type: "control_request",
    request_id: requestId,
    request: {
      subtype: "interrupt"
    }
  })}\n`;
}

export function buildClaudeControlResponseFrame(
  requestId: string | number,
  decision: CliApprovalDecision,
  options: { updatedInput?: Record<string, unknown>; message?: string } = {}
): string {
  const allow = decision === "accept" || decision === "accept_for_session";
  const response = allow
    ? {
        behavior: "allow",
        ...(options.updatedInput ? { updatedInput: options.updatedInput } : {})
      }
    : {
        behavior: "deny",
        message: options.message ?? (decision === "cancel" ? "Cancelled by CoTree operator." : "Denied by CoTree operator."),
        ...(decision === "cancel" ? { interrupt: true } : {})
      };
  return `${JSON.stringify({
    type: "control_response",
    response: {
      subtype: "success",
      request_id: String(requestId),
      response
    }
  })}\n`;
}

export function parseClaudeStdoutLine(line: string, nowIso: string, makeInterventionId: () => string): ParsedProtocolAction[] {
  const trimmed = line.trim();
  if (!trimmed) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    if (trimmed.length > 1024 && (trimmed.startsWith("{") || trimmed.includes('"jsonrpc"') || trimmed.includes('"thread"'))) {
      return [
        {
          kind: "notice",
          summary: `跳过一条不完整的 JSON 协议输出 (${trimmed.length} chars)`
        }
      ];
    }
    return [{ kind: "notice", summary: truncateText(trimmed, 400) }];
  }
  const obj = asRecord(parsed);
  if (!obj) return [];

  const type = asString(obj.type);
  const actions: ParsedProtocolAction[] = [];

  const sessionId = asString(obj.session_id);
  if (type === "system" && asString(obj.subtype) === "init" && sessionId) {
    actions.push({
      kind: "session_id",
      externalSessionId: sessionId,
      ...(asString(obj.model) ? { model: asString(obj.model) } : {}),
      summary: `Claude Code session initialized (${sessionId})`
    });
    return actions;
  }

  if (type === "stream_event") {
    const event = asRecord(obj.event);
    const delta = asRecord(event?.delta);
    const deltaType = asString(delta?.type);
    if (deltaType === "text_delta" && typeof delta?.text === "string" && delta.text.length > 0) {
      actions.push({ kind: "assistant_delta", text: delta.text });
    } else if (deltaType === "thinking_delta" && typeof delta?.thinking === "string" && delta.thinking.length > 0) {
      actions.push({ kind: "reasoning_delta", text: delta.thinking });
    }
    return actions;
  }

  if (type === "assistant") {
    const message = asRecord(obj.message);
    const content = Array.isArray(message?.content) ? message.content : [];
    const textParts: string[] = [];
    for (const block of content) {
      const rec = asRecord(block);
      const blockType = asString(rec?.type);
      if (blockType === "thinking" && typeof rec?.thinking === "string" && rec.thinking.length > 0) {
        actions.push({ kind: "reasoning_delta", text: rec.thinking });
      } else if (blockType === "text" && typeof rec?.text === "string") {
        textParts.push(rec.text);
      } else if (blockType === "tool_use") {
        const toolId = asString(rec?.id) ?? makeInterventionId();
        const toolName = asString(rec?.name) ?? "tool";
        actions.push({
          kind: "tool_started",
          blockKey: `claude-tool:${toolId}`,
          toolName,
          parameters: asRecord(rec?.input)
        });
      }
    }
    if (textParts.length > 0) {
      actions.push({ kind: "assistant_message", text: textParts.join("") });
    }
    if (sessionId) {
      actions.push({ kind: "session_id", externalSessionId: sessionId });
    }
    return actions;
  }

  if (type === "user") {
    const message = asRecord(obj.message);
    const content = Array.isArray(message?.content) ? message.content : [];
    for (const block of content) {
      const rec = asRecord(block);
      if (asString(rec?.type) === "tool_result") {
        const toolUseId = asString(rec?.tool_use_id) ?? "tool";
        const isError = rec?.is_error === true;
        const output = stringifyPreview(rec?.content);
        actions.push({
          kind: "tool_completed",
          blockKey: `claude-tool:${toolUseId}`,
          ...(output ? { output } : {}),
          status: isError ? "failed" : "completed"
        });
      }
    }
    return actions;
  }

  if (type === "control_request") {
    const requestId = asString(obj.request_id) ?? makeInterventionId();
    const request = asRecord(obj.request) ?? {};
    const subtype = asString(request.subtype) ?? "control_request";
    actions.push({
      kind: "intervention",
      intervention: {
        id: makeInterventionId(),
        requestId,
        kind: subtype === "can_use_tool" ? "command_approval" : "control_request",
        method: `claude.control_request.${subtype}`,
        title:
          subtype === "can_use_tool"
            ? `Claude 请求工具审批: ${asString(request.tool_name) ?? "tool"}`
            : `Claude 控制请求: ${subtype}`,
        details: request,
        createdAt: nowIso
      }
    });
    return actions;
  }

  if (type === "control_response") {
    const resp = asRecord(obj.response);
    actions.push({
      kind: "notice",
      summary: `Claude control_response (${asString(resp?.subtype) ?? "ack"})`,
      data: resp
    });
    return actions;
  }

  if (type === "result") {
    if (sessionId) {
      actions.push({ kind: "session_id", externalSessionId: sessionId });
    }
    const subtype = asString(obj.subtype);
    const isError = obj.is_error === true || subtype === "error_during_execution" || subtype === "error_max_turns";
    const resultText = typeof obj.result === "string" ? obj.result : undefined;
    const status: "completed" | "failed" | "interrupted" = isError
      ? "failed"
      : subtype === "interrupted"
        ? "interrupted"
        : "completed";
    const durationMs = asNumber(obj.duration_ms);
    const costUsd = asNumber(obj.total_cost_usd);
    const usage = asRecord(obj.usage);
    actions.push({
      kind: "turn_completed",
      status,
      ...(resultText ? { finalText: resultText } : {}),
      ...(isError ? { errorMessage: resultText ?? subtype ?? "Claude turn failed" } : {}),
      ...(durationMs !== undefined ? { durationMs } : {}),
      ...(costUsd !== undefined ? { costUsd } : {}),
      ...(usage ? { usage } : {}),
      data: {
        ...(subtype ? { subtype } : {}),
        ...(typeof obj.num_turns === "number" ? { numTurns: obj.num_turns } : {})
      }
    });
    return actions;
  }

  return actions;
}

// ============================================================================
// Antigravity CLI (`agy`) bidirectional stream-json NDJSON protocol helpers
// ============================================================================

export function buildAntigravitySpawnArgs(mode: "interactive" | "oneshot", input: {
  prompt?: string;
  model?: string;
  approvalPolicy?: string;
  sandbox?: string;
  resumeSessionId?: string;
  extraArgs?: string[];
}): string[] {
  const args = ["--output-format", "stream-json"];
  if (mode === "interactive") {
    args.push("--input-format", "stream-json");
  }
  if (input.approvalPolicy === "never" || input.approvalPolicy === "bypassPermissions") {
    args.push("--dangerously-skip-permissions");
  } else if (input.approvalPolicy === "acceptEdits" || input.approvalPolicy === "accept-edits") {
    args.push("--mode", "accept-edits");
  } else if (input.approvalPolicy === "plan") {
    args.push("--mode", "plan");
  } else if (input.approvalPolicy === "auto") {
    args.push("--mode", "auto");
  }
  if (input.sandbox === "read-only" || input.sandbox === "workspace-write") {
    args.push("--sandbox");
  }
  if (input.model) {
    args.push("--model", input.model);
  }
  if (input.resumeSessionId) {
    args.push("--conversation", input.resumeSessionId);
  }
  if (input.extraArgs?.length) {
    args.push(...input.extraArgs);
  }
  args.push("-p", mode === "oneshot" ? (input.prompt ?? "") : "");
  return args;
}

export function buildAntigravityUserFrame(content: string): string {
  return `${JSON.stringify({
    event: "user",
    message: {
      role: "user",
      content
    }
  })}\n`;
}

export function parseAntigravityStdoutLine(line: string, nowIso: string, makeInterventionId: () => string): ParsedProtocolAction[] {
  const trimmed = line.trim();
  if (!trimmed) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    if (trimmed.length > 1024 && (trimmed.startsWith("{") || trimmed.includes('"jsonrpc"') || trimmed.includes('"thread"'))) {
      return [
        {
          kind: "notice",
          summary: `跳过一条不完整的 JSON 协议输出 (${trimmed.length} chars)`
        }
      ];
    }
    return [{ kind: "notice", summary: truncateText(trimmed, 400) }];
  }
  const obj = asRecord(parsed);
  if (!obj) return [];

  const event = asString(obj.event);
  const actions: ParsedProtocolAction[] = [];

  if (event === "init") {
    const init = asRecord(obj.init);
    const convId = asString(obj.conversation_id) ?? asString(init?.conversation_id);
    const model = asString(init?.model);
    if (convId) {
      actions.push({
        kind: "session_id",
        externalSessionId: convId,
        ...(model ? { model } : {}),
        summary: `Antigravity CLI session initialized (${convId})`
      });
    }
    return actions;
  }

  if (event === "step_update") {
    const update = asRecord(obj.step_update);
    if (!update) return actions;
    const convId = asString(update.conversation_id);
    if (convId) {
      actions.push({ kind: "session_id", externalSessionId: convId });
    }
    const stepIndex = asNumber(update.step_index) ?? 0;
    const state = asString(update.state) ?? "ACTIVE";
    const stepType = asString(update.step_type) ?? "";
    const thinkingDelta = typeof update.thinking_delta === "string" ? update.thinking_delta : "";
    const textDelta = typeof update.text_delta === "string" ? update.text_delta : "";

    if (thinkingDelta) {
      actions.push({ kind: "reasoning_delta", text: thinkingDelta, blockKey: `agy-think:${stepIndex}` });
    }
    if (stepType === "agent_response" && textDelta) {
      actions.push({ kind: "assistant_delta", text: textDelta, blockKey: `agy-msg:${stepIndex}` });
    } else if (stepType === "tool") {
      const toolInfo = asRecord(update.tool_info);
      const toolName = asString(update.tool_name) ?? asString(toolInfo?.name) ?? "tool";
      const params = asRecord(toolInfo?.parameters);
      const blockKey = `agy-tool:${stepIndex}`;
      const durationSec = asNumber(update.duration_seconds);
      if (state === "ACTIVE") {
        actions.push({
          kind: "tool_started",
          blockKey,
          toolName,
          ...(params ? { parameters: params } : {})
        });
      } else {
        const resultPreview = stringifyPreview(toolInfo?.result ?? toolInfo?.output ?? toolInfo?.error ?? update.error);
        const failed = state === "ERROR" || state === "FAILED" || Boolean(update.error);
        actions.push({
          kind: "tool_completed",
          blockKey,
          toolName,
          ...(params ? { parameters: params } : {}),
          ...(resultPreview ? { output: resultPreview } : {}),
          status: failed ? "failed" : "completed",
          ...(durationSec !== undefined ? { durationMs: Math.round(durationSec * 1000) } : {})
        });
      }
    } else if (stepType === "permission_request" || stepType === "ask_permission") {
      actions.push({
        kind: "intervention",
        intervention: {
          id: makeInterventionId(),
          requestId: `agy-step-${stepIndex}`,
          kind: "permissions_approval",
          method: `antigravity.${stepType}`,
          title: `Antigravity CLI 请求确认 (${asString(update.tool_name) ?? stepType})`,
          details: update,
          createdAt: nowIso
        }
      });
    }
    return actions;
  }

  if (event === "result") {
    const result = asRecord(obj.result);
    if (!result) return actions;
    const convId = asString(result.conversation_id) ?? asString(obj.conversation_id);
    if (convId) {
      actions.push({ kind: "session_id", externalSessionId: convId });
    }
    const rawStatus = (asString(result.status) ?? "SUCCESS").toUpperCase();
    const status: "completed" | "failed" | "interrupted" =
      rawStatus === "ERROR" || rawStatus === "FAILED"
        ? "failed"
        : rawStatus === "CANCELLED" || rawStatus === "INTERRUPTED"
          ? "interrupted"
          : "completed";
    const responseText = typeof result.response === "string" ? result.response : undefined;
    const errorMsg = asString(result.error);
    const durationSec = asNumber(result.duration_seconds);
    const usage = asRecord(result.usage);
    actions.push({
      kind: "turn_completed",
      status,
      ...(responseText ? { finalText: responseText } : {}),
      ...(status === "failed" ? { errorMessage: errorMsg ?? "Antigravity CLI turn failed." } : {}),
      ...(durationSec !== undefined ? { durationMs: Math.round(durationSec * 1000) } : {}),
      ...(usage ? { usage } : {}),
      data: {
        status: rawStatus,
        ...(typeof result.num_turns === "number" ? { numTurns: result.num_turns } : {}),
        ...(asString(result.finished_reason) ? { finishedReason: asString(result.finished_reason) } : {})
      }
    });
    return actions;
  }

  return actions;
}

// ============================================================================
// Gemini / generic CLI protocol helpers
// ============================================================================

export function buildGeminiSpawnArgs(input: {
  prompt: string;
  model?: string;
  extraArgs?: string[];
}): string[] {
  const args = ["-p", input.prompt, "--output-format", "stream-json"];
  if (input.model) args.push("-m", input.model);
  if (input.extraArgs?.length) args.push(...input.extraArgs);
  return args;
}

export function parseGeminiStdoutLine(line: string): ParsedProtocolAction[] {
  const trimmed = line.trim();
  if (!trimmed) return [];
  try {
    const obj = asRecord(JSON.parse(trimmed));
    if (!obj) return [];
    const type = asString(obj.type);
    if (type === "init" && asString(obj.session_id)) {
      return [{ kind: "session_id", externalSessionId: asString(obj.session_id)! }];
    }
    if (type === "message" && asString(obj.role) === "assistant" && typeof obj.content === "string") {
      return [{ kind: "assistant_delta", text: obj.content }];
    }
    if (type === "result") {
      const status = asString(obj.status) === "error" ? "failed" : "completed";
      return [{ kind: "turn_completed", status, ...(asString(obj.response) ? { finalText: asString(obj.response) } : {}) }];
    }
    if (typeof obj.response === "string") {
      return [{ kind: "assistant_message", text: obj.response }];
    }
    return [];
  } catch {
    return [{ kind: "assistant_delta", text: `${trimmed}\n` }];
  }
}

// ============================================================================
// OpenCode CLI (`opencode run --format json` & `opencode models`) helpers
// ============================================================================

export function buildOpencodeRunSpawnArgs(input: {
  prompt: string;
  model?: string;
  resumeSessionId?: string;
  extraArgs?: string[];
}): string[] {
  const args = ["run", "--format", "json"];
  if (input.model) args.push("-m", input.model);
  if (input.resumeSessionId) args.push("--session", input.resumeSessionId);
  if (input.extraArgs?.length) args.push(...input.extraArgs);
  if (input.prompt) args.push(input.prompt);
  return args;
}

export function parseOpencodeRunStdoutLine(line: string): ParsedProtocolAction[] {
  const trimmed = stripAnsi(line).trim();
  if (!trimmed) return [];
  try {
    const obj = asRecord(JSON.parse(trimmed));
    if (!obj) return [];
    const actions: ParsedProtocolAction[] = [];
    const sessionId = asString(obj.sessionID) ?? asString(obj.sessionId) ?? asString(obj.session_id);
    if (sessionId) {
      actions.push({ kind: "session_id", externalSessionId: sessionId });
    }
    const type = asString(obj.type) ?? "";
    const part = asRecord(obj.part);

    if (type === "text" || type === "assistant" || type === "message") {
      const text = asString(part?.text) ?? asString(obj.text) ?? asString(obj.content);
      if (text) actions.push({ kind: "assistant_delta", text });
    } else if (type === "reasoning" || type === "thinking") {
      const text = asString(part?.text) ?? asString(obj.text);
      if (text) {
        actions.push({
          kind: "reasoning_delta",
          blockKey: asString(part?.id) ?? "opencode_reasoning",
          text
        });
      }
    } else if (type === "tool_use" || type === "tool") {
      const toolName = asString(part?.tool) ?? asString(obj.tool) ?? asString(obj.name) ?? "tool";
      const state = asRecord(part?.state);
      const statusRaw = asString(state?.status) ?? asString(obj.status) ?? "running";
      const blockKey = asString(part?.callID) ?? asString(part?.id) ?? `opencode_tool_${toolName}`;
      const output = asString(state?.output) ?? asString(obj.output);
      const inputObj = asRecord(state?.input) ?? asRecord(obj.input);
      if (statusRaw === "completed" || statusRaw === "error" || statusRaw === "failed") {
        actions.push({
          kind: "tool_completed",
          blockKey,
          toolName,
          status: statusRaw === "completed" ? "completed" : "failed",
          ...(output ? { output } : {}),
          ...(inputObj ? { parameters: inputObj } : {})
        });
      } else {
        actions.push({
          kind: "tool_started",
          blockKey,
          toolName,
          ...(inputObj ? { parameters: inputObj } : {})
        });
      }
    } else if (type === "step_finish" || type === "result" || type === "turn_completed") {
      const tokens = asRecord(part?.tokens) ?? asRecord(obj.usage);
      const cost = typeof part?.cost === "number" ? part.cost : typeof obj.cost === "number" ? obj.cost : undefined;
      const reason = asString(part?.reason) ?? asString(obj.status);
      if (type !== "step_finish" || (reason && reason !== "tool-calls")) {
        actions.push({
          kind: "turn_completed",
          status: reason === "error" || reason === "failed" ? "failed" : "completed",
          ...(tokens ? { usage: tokens } : {}),
          ...(cost !== undefined ? { costUsd: cost } : {})
        });
      }
    } else if (type === "error") {
      const errObj = asRecord(obj.error);
      const msg = asString(errObj?.message) ?? asString(obj.message) ?? "OpenCode execution failed.";
      actions.push({ kind: "turn_completed", status: "failed", errorMessage: msg });
    }
    return actions;
  } catch {
    return [{ kind: "assistant_delta", text: `${trimmed}\n` }];
  }
}

export function parseOpencodeModelsOutput(stdout: string): CliModelOption[] {
  const models: CliModelOption[] = [];
  const seen = new Set<string>();
  for (const rawLine of stripAnsi(stdout).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("INFO") || line.startsWith("Usage:") || line.startsWith("#")) continue;
    // Standard `opencode models` lines print `provider/model` (optionally followed by whitespace metadata).
    const firstToken = line.split(/\s+/)[0] ?? "";
    if (!/^[A-Za-z0-9._-]+\/[A-Za-z0-9._:@/-]{1,127}$/.test(firstToken)) continue;
    if (seen.has(firstToken)) continue;
    seen.add(firstToken);
    const slashIdx = firstToken.indexOf("/");
    const provider = firstToken.slice(0, slashIdx);
    const modelName = firstToken.slice(slashIdx + 1);
    const groupLabel = provider.charAt(0).toUpperCase() + provider.slice(1);
    models.push({
      id: firstToken,
      displayName: `${modelName} (${provider})`,
      group: `OpenCode · ${groupLabel}`
    });
  }
  return models;
}

// ============================================================================
// Qwen Code CLI (`qwen -p ... --output-format stream-json`) helpers
// ============================================================================

export function buildQwenSpawnArgs(input: {
  prompt: string;
  model?: string;
  resumeSessionId?: string;
  permissionMode?: CliPermissionMode;
  extraArgs?: string[];
}): string[] {
  const args = ["-p", input.prompt, "--output-format", "stream-json"];
  if (input.model) args.push("-m", input.model);
  if (input.resumeSessionId) args.push("--resume", input.resumeSessionId);
  if (input.permissionMode === "full_access") {
    args.push("--yolo");
  } else if (input.permissionMode === "accept_edits") {
    args.push("--approval-mode", "auto-edit");
  }
  if (input.extraArgs?.length) args.push(...input.extraArgs);
  return args;
}

export function parseQwenStdoutLine(line: string): ParsedProtocolAction[] {
  const trimmed = stripAnsi(line).trim();
  if (!trimmed) return [];
  try {
    const obj = asRecord(JSON.parse(trimmed));
    if (!obj) return [];
    const actions: ParsedProtocolAction[] = [];
    const sessionId = asString(obj.session_id) ?? asString(obj.sessionId);
    const type = asString(obj.type) ?? "";

    if ((type === "init" || type === "system") && sessionId) {
      const model = asString(obj.model);
      actions.push({ kind: "session_id", externalSessionId: sessionId, ...(model ? { model } : {}) });
      return actions;
    }

    if (type === "message" && asString(obj.role) === "assistant") {
      if (typeof obj.content === "string" && obj.content.length > 0) {
        actions.push({ kind: "assistant_delta", text: obj.content });
      }
      return actions;
    }

    if (type === "assistant") {
      const msg = asRecord(obj.message);
      const content = msg?.content;
      if (typeof content === "string" && content.length > 0) {
        actions.push({ kind: "assistant_delta", text: content });
      } else if (Array.isArray(content)) {
        for (const item of content) {
          const rec = asRecord(item);
          if (!rec) continue;
          if (rec.type === "text" && typeof rec.text === "string" && rec.text.length > 0) {
            actions.push({ kind: "assistant_delta", text: rec.text });
          } else if (rec.type === "thinking" && typeof rec.thinking === "string" && rec.thinking.length > 0) {
            actions.push({ kind: "reasoning_delta", blockKey: "qwen_thinking", text: rec.thinking });
          } else if (rec.type === "tool_use") {
            const name = asString(rec.name) ?? "tool";
            const id = asString(rec.id) ?? `qwen_tool_${name}`;
            actions.push({
              kind: "tool_started",
              blockKey: id,
              toolName: name,
              ...(asRecord(rec.input) ? { parameters: asRecord(rec.input) } : {})
            });
          }
        }
      }
      return actions;
    }

    if (type === "tool_use") {
      const name = asString(obj.tool_name) ?? asString(obj.name) ?? "tool";
      const id = asString(obj.tool_id) ?? asString(obj.id) ?? `qwen_tool_${name}`;
      actions.push({
        kind: "tool_started",
        blockKey: id,
        toolName: name,
        ...(asRecord(obj.parameters) ? { parameters: asRecord(obj.parameters) } : {})
      });
      return actions;
    }

    if (type === "tool_result") {
      const id = asString(obj.tool_id) ?? asString(obj.id) ?? "qwen_tool";
      const ok = asString(obj.status) !== "error" && obj.is_error !== true;
      const out = asString(obj.output) ?? asString(obj.content);
      actions.push({
        kind: "tool_completed",
        blockKey: id,
        toolName: asString(obj.tool_name) ?? "tool",
        status: ok ? "completed" : "failed",
        ...(out ? { output: out } : {})
      });
      return actions;
    }

    if (type === "result") {
      const failed = asString(obj.status) === "error" || obj.is_error === true;
      const usage = asRecord(obj.usage) ?? asRecord(obj.stats);
      const finalText = asString(obj.result) ?? asString(obj.response);
      actions.push({
        kind: "turn_completed",
        status: failed ? "failed" : "completed",
        ...(finalText ? { finalText } : {}),
        ...(usage ? { usage } : {}),
        ...(failed && asString(obj.error) ? { errorMessage: asString(obj.error) } : {})
      });
      return actions;
    }

    if (typeof obj.response === "string") {
      actions.push({ kind: "assistant_message", text: obj.response });
    }
    return actions;
  } catch {
    return [{ kind: "assistant_delta", text: `${trimmed}\n` }];
  }
}

export function getCuratedQwenModelOptions(): CliModelOption[] {
  return [
    {
      id: "coder-model",
      displayName: "Qwen Coder (默认别名)",
      description: "Qwen Code OAuth / 默认编程主力模型别名。",
      group: "Qwen Code 预设",
      isDefault: true
    },
    {
      id: "qwen3-coder-plus",
      displayName: "Qwen3 Coder Plus",
      description: "DashScope 旗舰代码生成与多文件重构模型。",
      group: "Qwen Code 预设"
    },
    {
      id: "qwen3.5-plus",
      displayName: "Qwen3.5 Plus",
      description: "均衡推理与编码能力。",
      group: "Qwen Code 预设"
    },
    {
      id: "qwen3-coder-480b-a35b-instruct",
      displayName: "Qwen3 Coder 480B (Open)",
      description: "开源 MoE 大参数代码专家模型。",
      group: "Qwen Code 预设"
    },
    {
      id: "qwen-max",
      displayName: "Qwen Max",
      description: "复杂架构设计与长链路分析。",
      group: "Qwen Code 预设"
    }
  ];
}

// ============================================================================
// Per-CLI model catalog parsers & curated catalogs
// ============================================================================

function inferCodexModelGroup(id: string): string {
  const lower = id.toLowerCase();
  if (lower.startsWith("gpt-6")) return "GPT-6";
  if (lower.startsWith("gpt-5")) return "GPT-5";
  if (lower.startsWith("gpt-4")) return "GPT-4";
  if (lower.startsWith("o3") || lower.startsWith("o4")) return "Reasoning (o-series)";
  return "Codex Models";
}

export function parseCodexModelListResult(result: unknown): CliModelOption[] {
  const root = asRecord(result);
  const items = Array.isArray(root?.data)
    ? root.data
    : Array.isArray(result)
      ? result
      : [];
  const models: CliModelOption[] = [];
  const seen = new Set<string>();
  for (const raw of items) {
    const entry = asRecord(raw);
    if (!entry || entry.hidden === true) continue;
    const id = asString(entry.id) ?? asString(entry.model);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const displayName = asString(entry.displayName) ?? id;
    const description = asString(entry.description);
    const defaultReasoningEffort = asString(entry.defaultReasoningEffort);
    const efforts: string[] = [];
    if (Array.isArray(entry.supportedReasoningEfforts)) {
      for (const eff of entry.supportedReasoningEfforts) {
        if (typeof eff === "string" && eff.length > 0) {
          efforts.push(eff);
        } else {
          const effObj = asRecord(eff);
          const effName = asString(effObj?.reasoningEffort);
          if (effName) efforts.push(effName);
        }
      }
    }
    models.push({
      id,
      displayName,
      ...(description ? { description } : {}),
      group: inferCodexModelGroup(id),
      ...(entry.isDefault === true ? { isDefault: true } : {}),
      ...(efforts.length > 0 ? { supportedReasoningEfforts: efforts } : {}),
      ...(defaultReasoningEffort ? { defaultReasoningEffort } : {})
    });
  }
  return models;
}

function inferAntigravityModelGroup(id: string): string {
  const lower = id.toLowerCase();
  if (lower.startsWith("gemini-4")) return "Gemini 4";
  if (lower.startsWith("gemini-pro-orchestrator")) return "Orchestrator";
  if (lower.startsWith("gemini-3")) return "Gemini 3.8";
  if (lower.startsWith("claude-")) return "Claude (via Antigravity)";
  if (lower.startsWith("gpt-")) return "GPT / OSS";
  return "Antigravity Models";
}

export function parseAntigravityModelsOutput(stdout: string): CliModelOption[] {
  const models: CliModelOption[] = [];
  const seen = new Set<string>();
  for (const rawLine of stdout.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("Fetching") || line.startsWith("Usage:") || line.startsWith("Available")) {
      continue;
    }
    const tabParts = line.split("\t").map((part) => part.trim()).filter(Boolean);
    let id: string | undefined;
    let displayName: string | undefined;
    if (tabParts.length >= 2) {
      id = tabParts[0];
      displayName = tabParts.slice(1).join(" ");
    } else {
      const match = /^([A-Za-z0-9][A-Za-z0-9._:-]{1,127})\s{2,}(.+)$/.exec(line);
      if (match) {
        id = match[1];
        displayName = match[2]!.trim();
      }
    }
    if (!id || !/^[A-Za-z0-9][A-Za-z0-9._:-]{1,127}$/.test(id) || seen.has(id)) {
      continue;
    }
    seen.add(id);
    models.push({
      id,
      displayName: displayName ?? id,
      group: inferAntigravityModelGroup(id)
    });
  }
  return models;
}

export function getCuratedClaudeModelOptions(): CliModelOption[] {
  const efforts = ["low", "medium", "high", "xhigh", "max"];
  return [
    {
      id: "sonnet",
      displayName: "Sonnet (Claude CLI 别名)",
      description: "日常开发均衡主力模型，实际映射遵循本机 Claude CLI / 代理配置。",
      group: "Claude CLI 别名",
      supportedReasoningEfforts: efforts
    },
    {
      id: "opus",
      displayName: "Opus (Claude CLI 别名)",
      description: "复杂架构设计与深度推理旗舰别名。",
      group: "Claude CLI 别名",
      supportedReasoningEfforts: efforts
    },
    {
      id: "haiku",
      displayName: "Haiku (Claude CLI 别名)",
      description: "轻量高速检索与简单修改别名。",
      group: "Claude CLI 别名",
      supportedReasoningEfforts: efforts
    },
    {
      id: "fable",
      displayName: "Fable (Claude CLI 别名)",
      description: "Claude CLI 最新前沿别名（需本机账号/代理支持）。",
      group: "Claude CLI 别名",
      supportedReasoningEfforts: efforts
    }
  ];
}

export function getCuratedGeminiModelOptions(): CliModelOption[] {
  return [
    {
      id: "gemini-2.5-pro",
      displayName: "Gemini 2.5 Pro",
      description: "复杂代码与长上下文推理。",
      group: "Gemini 预设"
    },
    {
      id: "gemini-2.5-flash",
      displayName: "Gemini 2.5 Flash",
      description: "低延迟高速响应。",
      group: "Gemini 预设"
    }
  ];
}
