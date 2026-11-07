import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Bridge } from "./bridge.js";
import { createAdapter } from "./adapters.js";
import { BridgeError, cotreeOrigin, object, parseConfig, readConfig, readSecretValues, safeError, saveConfig, string, type Config } from "./config.js";
import { CoTreeClient } from "./cotree-client.js";
import { fetchFeishuBotIdentity } from "./feishu-identity.js";

export type SecretField = "sourceToken" | "feishuSecret" | "dingtalkSecret";
const names: Record<SecretField, string> = { sourceToken: "COTREE_INPUT_TOKEN", feishuSecret: "FEISHU_APP_SECRET", dingtalkSecret: "DINGTALK_CLIENT_SECRET" };
export type PanelState = {
  config: Config | null;
  credentials: Record<SecretField, boolean>;
  status: ReturnType<Bridge["status"]>;
};
export type ControlResponse = { ok: boolean; running: boolean; data?: unknown; code?: string };

/** UI-only credential operations never enter model tools or return stored secrets. */
export class MessagingControl {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(readonly file: string, readonly bridge = new Bridge(file, createAdapter)) {}

  call(method: string, input: unknown = {}): Promise<ControlResponse> {
    const run = async (): Promise<ControlResponse> => {
      try { return { ok: true, data: await this.execute(method, object(input)), running: this.bridge.running }; }
      catch (error) { return { ok: false, code: safeError(error), running: this.bridge.running }; }
    };
    const next = this.queue.then(run, run); this.queue = next; return next;
  }
  async close() { await this.queue; await this.bridge.stop(); }

  private secrets(): Record<string, string> {
    return readSecretValues(this.file);
  }
  private state(): PanelState {
    const config = existsSync(this.file) ? readConfig(this.file) : null, secrets = this.secrets();
    return { config, credentials: {
      sourceToken: Boolean(secrets[config?.tokenEnv ?? names.sourceToken]?.trim()),
      feishuSecret: Boolean(secrets[config?.feishu?.secretEnv ?? names.feishuSecret]?.trim()),
      dingtalkSecret: Boolean(secrets[config?.dingtalk?.secretEnv ?? names.dingtalkSecret]?.trim())
    }, status: this.bridge.status() };
  }
  private stopped() {
    if (this.bridge.running || existsSync(path.join(path.dirname(this.file), "state", "bridge.lock"))) throw new BridgeError("STOP_BRIDGE_BEFORE_CONFIGURE");
  }
  private save(input: Record<string, unknown>) {
    this.stopped();
    const config = parseConfig(input.config), patch = object(input.credentials ?? {});
    if (Object.keys(patch).some(key => !Object.hasOwn(names, key))) throw new BridgeError("INVALID_CREDENTIAL_FIELD");
    const file = path.join(path.dirname(this.file), "credentials.json");
    const secrets = existsSync(file) ? object(JSON.parse(readFileSync(file, "utf8"))) : {};
    const mapping: Record<SecretField, string> = { sourceToken: config.tokenEnv, feishuSecret: config.feishu?.secretEnv ?? names.feishuSecret, dingtalkSecret: config.dingtalk?.secretEnv ?? names.dingtalkSecret };
    for (const field of Object.keys(patch) as SecretField[]) {
      const value = patch[field];
      if (typeof value !== "string" || value.length > 4096 || /[\r\n\0]/.test(value)) throw new BridgeError("INVALID_CREDENTIAL");
      // Blank means keep; secrets are never replaced by a masked UI placeholder.
      if (value.trim()) secrets[mapping[field]] = value.trim();
    }
    mkdirSync(path.dirname(this.file), { recursive: true, mode: 0o700 });
    const temporary = `${file}.${process.pid}.tmp`;
    writeFileSync(temporary, JSON.stringify(secrets, null, 2) + "\n", { mode: 0o600 });
    renameSync(temporary, file);
    saveConfig(this.file, config);
    return this.state();
  }
  private async connection(input: Record<string, unknown>, check: boolean) {
    const existing = existsSync(this.file) ? readConfig(this.file) : null;
    const token = typeof input.sourceToken === "string" && input.sourceToken.trim() ? input.sourceToken.trim() : this.secrets()[existing?.tokenEnv ?? names.sourceToken];
    if (!token) throw new BridgeError("SECRET_REQUIRED");
    const config: Config = { schemaVersion: 1, cotreeUrl: cotreeOrigin(input.cotreeUrl ?? existing?.cotreeUrl), workspaceId: "discovery", tokenEnv: names.sourceToken };
    const client = new CoTreeClient(config, token), signal = new AbortController().signal;
    if (check) await client.request("/v1/capabilities", signal);
    return client.workspaces(signal);
  }
  private async feishuIdentity(input: Record<string, unknown>) {
    this.stopped();
    if (typeof input.appId !== "string" || !input.appId.trim()) throw new BridgeError("FEISHU_APP_ID_REQUIRED");
    const appId = string(input.appId.trim(), "Feishu App ID");
    const typedSecret = input.appSecret ?? "";
    if (typeof typedSecret !== "string" || typedSecret.length > 4096 || /[\r\n\0]/.test(typedSecret)) throw new BridgeError("INVALID_CREDENTIAL");
    const existing = existsSync(this.file) ? readConfig(this.file).feishu : undefined;
    // A saved secret is reusable only for its original application.
    const secret = typedSecret.trim() || (existing?.appId.trim() === appId ? this.secrets()[existing.secretEnv]?.trim() : undefined);
    if (!secret) throw new BridgeError("FEISHU_APP_SECRET_REQUIRED");
    if (secret.length > 4096 || /[\r\n\0]/.test(secret)) throw new BridgeError("INVALID_CREDENTIAL");
    return fetchFeishuBotIdentity(appId, secret);
  }
  private async execute(method: string, input: Record<string, unknown>): Promise<unknown> {
    switch (method) {
      case "panel.state": return this.state();
      case "config.save": return this.save(input);
      case "feishu.bot-info": return this.feishuIdentity(input);
      case "connection.workspaces": return this.connection(input, false);
      case "connection.check": return this.connection(input, true);
      case "messaging_status": return this.bridge.status();
      case "messaging_configure": this.stopped(); saveConfig(this.file, input.config); return { saved: true };
      case "messaging_workspaces": return this.connection({}, false);
      case "messaging_start": await this.bridge.start(); return this.state();
      case "messaging_stop": await this.bridge.stop(); return this.state();
      case "messaging_retry_input": return this.bridge.retryInput(string(input.id, "id"));
      case "messaging_retry_delivery":
        if (input.acceptDuplicateRisk !== true) throw new BridgeError("DELIVERY_CONFIRMATION_REQUIRED");
        return this.bridge.retryDelivery(string(input.id, "id"));
      case "messaging_reply": return this.bridge.reply(string(input.messageId, "messageId"), string(input.text, "text", 32000), string(input.requestId, "requestId"));
      default: throw new BridgeError("UNKNOWN_CONTROL_METHOD");
    }
  }
}
