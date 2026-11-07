import path from "node:path";
import { BridgeError, readConfig, readSecrets, safeError, type Config, type Platform } from "./config.js";
import { CoTreeClient } from "./cotree-client.js";
import { authorized } from "./normalize.js";
import { Store, hash, type Inbox } from "./store.js";
import type { Adapter, AdapterFactory, InputClient, Message } from "./types.js";

export class Bridge {
  private store?: Store;
  private config?: Config;
  private client?: InputClient;
  private controller?: AbortController;
  private adapters = new Map<Platform, Adapter>();
  private timer?: ReturnType<typeof setInterval>;
  private tick?: Promise<void>;
  private channelErrors: Partial<Record<Platform, string>> = {};
  private lastError?: string;
  constructor(readonly file: string, private factory: AdapterFactory, private clientFactory: (config: Config, token: string) => InputClient = (config, token) => new CoTreeClient(config, token)) {}
  get running() { return Boolean(this.store); }
  async start(schedule = true) {
    if (this.running) return this.status();
    const config = readConfig(this.file), secrets = readSecrets(this.file, config);
    const store = new Store(path.join(path.dirname(this.file), "state"), hash([config.cotreeUrl, config.workspaceId, hash(secrets[config.tokenEnv])]));
    this.config = config; this.store = store; this.controller = new AbortController(); this.channelErrors = {};
    this.client = this.clientFactory(config, secrets[config.tokenEnv]!);
    try {
      for (const platform of ["feishu", "dingtalk"] as const) {
        const channel = config[platform];
        if (!channel) continue;
        const adapter = this.factory(platform, channel, secrets[channel.secretEnv]!);
        this.adapters.set(platform, adapter);
        void adapter.start(message => this.receive(message)).catch(error => { this.channelErrors[platform] = safeError(error); });
      }
      if (schedule) this.timer = setInterval(() => { void this.pump().catch(error => { this.lastError = safeError(error); }); }, 1000);
      return this.status();
    } catch (error) { await this.stop(); throw error; }
  }
  receive(message: Message) {
    const channel = this.config?.[message.platform];
    if (!this.store || this.controller?.signal.aborted) throw new BridgeError("BRIDGE_STOPPED");
    if (!channel || !authorized(message, channel)) throw new BridgeError("SOURCE_NOT_ALLOWED");
    return this.store.receive(message);
  }
  pump(): Promise<void> {
    if (this.tick) return this.tick;
    if (!this.store || !this.controller || this.controller.signal.aborted) return Promise.resolve();
    this.tick = this.work(this.store, this.controller.signal).finally(() => { this.tick = undefined; });
    return this.tick;
  }
  private async work(store: Store, signal: AbortSignal) {
    await Promise.all(store.due().map(item => this.processInput(store, item, signal)));
    if (signal.aborted) return;
    await Promise.all(store.deliveries().map(async delivery => {
      const channel = this.config?.[delivery.message.platform];
      const adapter = this.adapters.get(delivery.message.platform);
      if (!channel || !adapter || !authorized(delivery.message, channel)) { store.deliveryState(delivery.id, "unknown", "SOURCE_NOT_ALLOWED"); return; }
      store.deliveryState(delivery.id, "sending");
      try {
        await adapter.send(delivery.message, delivery.text, delivery.id, signal);
        store.deliveryState(delivery.id, "sent");
      } catch (error) { store.deliveryState(delivery.id, "unknown", safeError(error)); }
    }));
  }
  private async processInput(store: Store, item: Inbox, signal: AbortSignal) {
    try {
      const channel = this.config?.[item.message.platform];
      if (!channel || !authorized(item.message, channel)) throw new BridgeError("SOURCE_NOT_ALLOWED");
      if (!item.receipt) {
        const body = store.prepare(item);
        const receipt = await this.client!.submit(body, `messaging:${item.id}`, signal);
        store.accepted(item, receipt); item.receipt = receipt;
      }
      const result = await this.client!.result(item.receipt.inputId, signal);
      // Canonical promoted final only. 'consumed' and 'completed' are not proof of task success.
      if (result.final) { store.enqueueReply(item, `final:${result.final.eventId}`, result.final.text, true); return; }
      const status = result.input.run?.status;
      if (["failed", "cancelled", "completed"].includes(status ?? "") || ["cancelled", "expired", "superseded"].includes(result.input.state.queue ?? "")) {
        store.enqueueReply(item, "terminal", `CoTree 执行状态：${status ?? result.input.state.queue}，没有最终文本。请在 CoTree 查看会话 ${item.receipt.sessionId}。`, true);
        return;
      }
      if (["paused_for_approval", "paused_for_input", "interrupted"].includes(status ?? "") || result.input.state.queue === "blocked") {
        store.enqueueReply(item, `notice:${status ?? "blocked"}`, `CoTree 正在等待本机处理（${status ?? "blocked"}）。请打开会话 ${item.receipt.sessionId} 处理审批、补充信息或继续任务。`, false);
      }
      store.defer(item.id, undefined, false, 3000);
    } catch (error) {
      const retryable = error instanceof BridgeError ? error.retryable : true;
      store.defer(item.id, safeError(error), !retryable, Math.min(60000, 2000 * 2 ** Math.min(item.attempts, 5)));
    }
  }
  async stop() {
    if (this.timer) clearInterval(this.timer); this.timer = undefined;
    this.controller?.abort();
    await Promise.allSettled([...this.adapters.values()].map(adapter => adapter.stop()));
    try { await this.tick; }
    finally { this.adapters.clear(); this.store?.close(); this.store = undefined; this.client = undefined; }
    return this.status();
  }
  status() { return { running: this.running, configPath: this.file,
    channels: [...this.adapters].map(([platform, adapter]) => ({ platform, ...(adapter.status?.() ?? { state: "status_not_exposed" }) })),
    channelErrors: this.channelErrors, ...(this.lastError ? { lastError: this.lastError } : {}), ...(this.store?.status() ?? {}) }; }
  reply(id: string, text: string, requestId: string) {
    const store = this.requireStore();
    store.enqueueReply(store.get(id), `manual:${requestId}`, text, false);
    return { queued: true, messageId: id, requestId };
  }
  retryDelivery(id: string) { this.requireStore().retryDelivery(id); return { queued: true }; }
  retryInput(id: string) { this.requireStore().retryInput(id); return { queued: true, preservesOriginalRequest: true }; }
  private requireStore() { if (!this.store) throw new BridgeError("BRIDGE_NOT_STARTED"); return this.store; }
}
