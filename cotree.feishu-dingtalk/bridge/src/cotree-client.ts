import { BridgeError, object, string, type Config } from "./config.js";
import type { InputClient, InputReceipt, InputResult } from "./types.js";

export class CoTreeClient implements InputClient {
  private readonly workspace: string;
  constructor(private readonly config: Config, private readonly token: string, private readonly fetchImpl: typeof fetch = fetch) {
    this.workspace = `/v1/workspaces/${encodeURIComponent(config.workspaceId)}`;
  }
  async request(route: string, signal: AbortSignal, body?: unknown, key?: string): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.config.cotreeUrl}${route}`, {
        method: body === undefined ? "GET" : "POST", redirect: "error",
        headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json", ...(key ? { "Idempotency-Key": key } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.any([signal, AbortSignal.timeout(15000)])
      });
    } catch { throw new BridgeError("COTREE_UNAVAILABLE", undefined, true); }
    const raw: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const candidate = raw && typeof raw === "object" ? (raw as { error?: { code?: unknown } }).error?.code : undefined;
      const code = typeof candidate === "string" && /^[A-Z_]{1,64}$/.test(candidate) ? candidate : `COTREE_HTTP_${response.status}`;
      throw new BridgeError(code, undefined, response.status >= 500 || response.status === 429);
    }
    const envelope = object(raw);
    if (envelope.ok !== true || !("data" in envelope)) throw new BridgeError("COTREE_PROTOCOL_INVALID");
    return envelope.data;
  }
  async submit(body: unknown, key: string, signal: AbortSignal): Promise<InputReceipt> {
    const result = object(await this.request(`${this.workspace}/inputs`, signal, body, key));
    return { inputId: string(result.inputId, "inputId"), sessionId: string(result.sessionId, "sessionId") };
  }
  async result(id: string, signal: AbortSignal): Promise<InputResult> {
    const result = object(await this.request(`${this.workspace}/inputs/${encodeURIComponent(id)}/result`, signal));
    const input = object(result.input);
    const state = object(input.state);
    string(state.delivery, "delivery");
    if (input.run) { const run = object(input.run); string(run.status, "status"); string(run.runId, "runId"); }
    if (result.final) { const final = object(result.final); string(final.eventId, "eventId"); if (typeof final.text !== "string") throw new BridgeError("COTREE_PROTOCOL_INVALID"); }
    return result as InputResult;
  }
  workspaces(signal: AbortSignal) { return this.request("/v1/workspaces?limit=200", signal); }
}
