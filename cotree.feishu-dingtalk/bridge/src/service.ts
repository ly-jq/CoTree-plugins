import { Buffer } from "node:buffer";
import { defineService, type PluginServiceContext } from "../../../../packages/plugin-sdk/src/service.js";
import type { PluginJsonValue } from "../../../../packages/plugin-sdk/src/index.js";

const methods = new Set(["panel.state", "config.save", "feishu.bot-info", "connection.workspaces", "connection.check", "messaging_status", "messaging_configure", "messaging_workspaces", "messaging_start", "messaging_stop", "messaging_retry_input", "messaging_retry_delivery", "messaging_reply"]);
type Reply = { id: string; ok: boolean; running: boolean; data?: PluginJsonValue; code?: string };

/** The supervisor owns the native child; no detached daemon or public control port. */
export class MessagingService {
  private processId?: string;
  private sequence = 0;
  private buffer = "";
  private decoder = new TextDecoder();
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private context: PluginServiceContext) {}

  call(method: string, input: PluginJsonValue | undefined, signal: AbortSignal): Promise<PluginJsonValue> {
    const run = async (): Promise<PluginJsonValue> => {
      if (!methods.has(method)) return { ok: false, code: "UNKNOWN_CONTROL_METHOD" };
      try {
        signal.throwIfAborted();
        if (!this.processId) {
          const inspection = await this.context.process.inspect("messaging-node");
          if (!inspection.available) return { ok: false, code: "NODE_REQUIRED" };
          const child = await this.context.process.spawn("messaging-node", ["bridge.cjs", "control"], { cwd: "dist", maxOutputBytes: 524288 });
          this.processId = child.processId; this.buffer = ""; this.decoder = new TextDecoder();
          const initialized = await this.request("initialize", { workspace: this.context.workspace }, signal);
          if (!initialized.ok) throw new Error(initialized.code ?? "INITIALIZATION_FAILED");
        }
        const reply = await this.request(method, input ?? {}, signal);
        // A live native process pins the existing supervisor while messaging runs.
        // Configuration-only calls release it, allowing normal idle cleanup.
        if (!reply.running) await this.stop();
        return reply.ok ? { ok: true, data: reply.data ?? null } : { ok: false, code: reply.code ?? "CONTROL_FAILED" };
      } catch (error) {
        await this.stop();
        const code = signal.aborted ? "CONTROL_CANCELLED" : error instanceof Error ? /^([A-Z_]{1,80})(?=:|$)/.exec(error.message)?.[1] ?? "CONTROL_PROCESS_FAILED" : "CONTROL_PROCESS_FAILED";
        return { ok: false, code };
      }
    };
    const result = this.queue.then(run, run); this.queue = result; return result;
  }
  private async request(method: string, input: PluginJsonValue, signal: AbortSignal): Promise<Reply> {
    const id = String(++this.sequence), started = Date.now();
    await this.context.process.write(this.processId!, JSON.stringify({ id, method, input }) + "\n");
    while (Date.now() - started < 40000) {
      signal.throwIfAborted();
      const read = await this.context.process.read(this.processId!, { maxBytes: 131072, outputEncoding: "base64" });
      this.buffer += this.decoder.decode(Buffer.from(read.stdout, "base64"), { stream: true });
      if (this.buffer.length > 524288) throw new Error("CONTROL_RESPONSE_TOO_LARGE");
      let index: number;
      while ((index = this.buffer.indexOf("\n")) >= 0) {
        const line = this.buffer.slice(0, index); this.buffer = this.buffer.slice(index + 1);
        const frame = JSON.parse(line) as Reply;
        if (frame.id !== id || typeof frame.ok !== "boolean" || typeof frame.running !== "boolean") throw new Error("CONTROL_PROTOCOL_INVALID");
        return frame;
      }
      if (read.exited) throw new Error("CONTROL_PROCESS_EXITED");
      await new Promise(resolve => setTimeout(resolve, 80));
    }
    throw new Error("CONTROL_TIMEOUT");
  }
  async stop() {
    if (!this.processId) return;
    const id = this.processId;
    await this.context.process.stop(id);
    this.processId = undefined; this.buffer = "";
  }
}

let service: MessagingService | undefined;
export default defineService({
  start(context) { service = new MessagingService(context); },
  call(method, input, context) {
    if (!service) throw new Error("SERVICE_NOT_STARTED");
    return service.call(method, input, context.signal);
  },
  async stop() { await service?.stop(); service = undefined; }
});
