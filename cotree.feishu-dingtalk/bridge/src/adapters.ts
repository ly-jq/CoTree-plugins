import * as Lark from "@larksuiteoapi/node-sdk";
import WebSocket from "ws";
import { setTimeout as delay } from "node:timers/promises";
import { BridgeError, object, string, type ChannelConfig, type Platform } from "./config.js";
import { dingtalkMessage, feishuMessage } from "./normalize.js";
import type { Adapter, Message } from "./types.js";

const quiet = { error() {}, warn() {}, info() {}, debug() {}, trace() {} };
export const DING_TOPIC = "/v1.0/im/bot/messages/get";
export async function jsonPost(url: string, body: unknown, signal: AbortSignal, headers: Record<string, string> = {}): Promise<Record<string, unknown>> {
  const response = await fetch(url, { method: "POST", redirect: "error", headers: { "Content-Type": "application/json", Accept: "application/json", ...headers },
    body: JSON.stringify(body), signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) });
  if (!response.ok) throw new BridgeError(`PLATFORM_HTTP_${response.status}`);
  const text = await response.text();
  if (text.length > 1_048_576) throw new BridgeError("PLATFORM_RESPONSE_TOO_LARGE");
  const data = object(JSON.parse(text));
  if ((typeof data.code === "number" && data.code !== 0) || (typeof data.errcode === "number" && data.errcode !== 0)
    || (typeof data.code === "string" && data.code !== "0")) throw new BridgeError("PLATFORM_API_REJECTED");
  return data;
}
class PlatformSender {
  private token?: { value: string; expires: number };
  constructor(private platform: Platform, private config: ChannelConfig, private secret: string) {}
  private async accessToken(signal: AbortSignal): Promise<string> {
    if (this.token && this.token.expires > Date.now()) return this.token.value;
    const feishu = this.platform === "feishu";
    const data = await jsonPost(feishu ? "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal" : "https://api.dingtalk.com/v1.0/oauth2/accessToken",
      feishu ? { app_id: this.config.appId, app_secret: this.secret } : { appKey: this.config.appId, appSecret: this.secret }, signal);
    const value = string(feishu ? data.tenant_access_token : data.accessToken, "access token", 4096);
    const seconds = Number(feishu ? data.expire : data.expireIn);
    this.token = { value, expires: Date.now() + Math.max(0, (Number.isFinite(seconds) ? seconds : 60) - 60) * 1000 };
    return value;
  }
  async send(target: Message, text: string, deliveryId: string, signal: AbortSignal) {
    const token = await this.accessToken(signal);
    if (this.platform === "feishu") {
      await jsonPost(`https://open.feishu.cn/open-apis/im/v1/messages/${encodeURIComponent(target.messageId)}/reply`, {
        content: JSON.stringify({ text }), msg_type: "text", uuid: deliveryId.slice(0, 32), ...(target.threadId ? { reply_in_thread: true } : {})
      }, signal, { Authorization: `Bearer ${token}` });
    } else {
      const data = await jsonPost(`https://api.dingtalk.com/v1.0/robot/${target.kind === "group" ? "groupMessages/send" : "oToMessages/batchSend"}`, {
        robotCode: this.config.robotCode ?? this.config.appId, msgKey: "sampleText", msgParam: JSON.stringify({ content: text }),
        ...(target.kind === "group" ? { openConversationId: target.chatId } : { userIds: [target.userId] })
      }, signal, { "x-acs-dingtalk-access-token": token });
      if (Array.isArray(data.invalidUserIdList) && data.invalidUserIdList.length) throw new BridgeError("PLATFORM_RECIPIENT_REJECTED");
    }
  }
}
class FeishuAdapter implements Adapter {
  readonly platform = "feishu" as const;
  private ws?: Lark.WSClient;
  private readonly sender: PlatformSender;
  private active = false;
  private lastError?: string;
  constructor(private config: ChannelConfig, private secret: string) { this.sender = new PlatformSender(this.platform, config, secret); }
  async start(receive: (message: Message) => void) {
    if (!/^cli_[0-9a-fA-F]{16}$/.test(this.config.appId)) throw new BridgeError("FEISHU_APP_ID_INVALID");
    this.active = true; this.lastError = undefined;
    const ready = () => { if (this.active) this.lastError = undefined; };
    this.ws = new Lark.WSClient({ appId: this.config.appId, appSecret: this.secret, logger: quiet, handshakeTimeoutMs: 15000,
      onReady: ready, onReconnected: ready,
      // start() resolves before the handshake. Terminal failures arrive via onError.
      onError: error => { if (this.active) this.lastError = feishuConnectionError(error); }
    });
    await this.ws.start({ eventDispatcher: new Lark.EventDispatcher({ logger: quiet }).register({
      "im.message.receive_v1": async (data) => {
        if (!this.active) return;
        const message = feishuMessage(data, this.config);
        if (message) receive(message); // Durable receipt before SDK ACK; do not await the model.
      }
    }) });
    if (!this.active) this.ws.close({ force: true });
  }
  async stop() { this.active = false; this.ws?.close({ force: true }); this.lastError = undefined; }
  status() { return { state: this.active ? this.ws?.getConnectionStatus().state ?? "connecting" : "stopped", ...(this.lastError ? { lastError: this.lastError } : {}) }; }
  send(target: Message, text: string, id: string, signal: AbortSignal) { return this.sender.send(target, text, id, signal); }
}

function feishuConnectionError(error: Error): string {
  // Preserve only the numeric platform code, never SDK messages, URLs or tickets.
  const code = /^pullConnectConfig failed: code=(\d{1,12}),/.exec(error.message)?.[1];
  if (code === "514") return "FEISHU_WS_AUTH_FAILED";
  if (code === "403") return "FEISHU_WS_FORBIDDEN";
  if (code === "1000040350") return "FEISHU_WS_CONNECTION_LIMIT";
  if (code) return `FEISHU_WS_REJECTED_${code}`;
  if (/^WebSocket reconnect exhausted after \d+ attempts$/.test(error.message)) return "FEISHU_WS_RETRIES_EXHAUSTED";
  return "FEISHU_WS_FAILED";
}

/** Minimal official Stream protocol: bounded IO, fresh ticket per reconnect, durable ACK. */
export class DingtalkAdapter implements Adapter {
  readonly platform = "dingtalk" as const;
  private readonly sender: PlatformSender;
  private abort?: AbortController;
  private socket?: WebSocket;
  private loop?: Promise<void>;
  private state = "stopped";
  private lastError?: string;
  constructor(private config: ChannelConfig, private secret: string) { this.sender = new PlatformSender(this.platform, config, secret); }
  async start(receive: (message: Message) => void) {
    this.abort = new AbortController();
    const signal = this.abort.signal;
    this.state = "connecting";
    this.loop = this.connectLoop(receive, signal);
  }
  private async connectLoop(receive: (message: Message) => void, signal: AbortSignal) {
    let failures = 0;
    while (!signal.aborted) {
      try {
        const endpoint = await jsonPost("https://api.dingtalk.com/v1.0/gateway/connections/open", {
          clientId: this.config.appId, clientSecret: this.secret, ua: "cotree-messaging/0.1.0", subscriptions: [{ type: "CALLBACK", topic: DING_TOPIC }]
        }, signal);
        const url = new URL(string(endpoint.endpoint, "endpoint", 2048));
        if (url.protocol !== "wss:" || !(url.hostname === "dingtalk.com" || url.hostname.endsWith(".dingtalk.com"))
          || url.username || url.password || (url.port && url.port !== "443")) throw new BridgeError("INVALID_STREAM_ENDPOINT");
        url.searchParams.set("ticket", string(endpoint.ticket, "ticket", 4096));
        if (signal.aborted) break;
        await new Promise<void>((resolve, reject) => {
          const socket = new WebSocket(url, { handshakeTimeout: 15000, maxPayload: 262144, followRedirects: false });
          this.socket = socket;
          const abort = () => socket.terminate();
          signal.addEventListener("abort", abort, { once: true });
          socket.on("open", () => { failures = 0; this.state = "connected"; this.lastError = undefined; });
          socket.on("error", () => { socket.terminate(); reject(new BridgeError("STREAM_DISCONNECTED")); });
          socket.on("close", () => { signal.removeEventListener("abort", abort); resolve(); });
          socket.on("message", bytes => {
            if (signal.aborted) return;
            try {
              const response = this.handleFrame(JSON.parse(bytes.toString()), receive);
              if (response) socket.send(JSON.stringify(response));
            } catch { /* No ACK when the durable receipt failed; the server may retry. */ }
          });
        });
      } catch { failures++; this.lastError = "STREAM_CONNECTION_FAILED"; }
      if (signal.aborted) break;
      this.state = "reconnecting";
      await delay(Math.min(30000, 1000 * 2 ** Math.min(failures, 5)), undefined, { signal }).catch(() => {});
    }
  }
  handleFrame(value: unknown, receive: (message: Message) => void): unknown {
    const frame = object(value), headers = object(frame.headers);
    if (frame.type === "SYSTEM" && headers.topic === "disconnect") { this.socket?.close(); return; }
    if (frame.type === "SYSTEM" && headers.topic === "ping") return { code: 200, headers, message: "OK", data: frame.data };
    if (frame.type !== "CALLBACK" || headers.topic !== DING_TOPIC) return;
    const message = dingtalkMessage(JSON.parse(string(frame.data, "data", 262144)), this.config);
    if (message) receive(message);
    return { code: 200, headers: { messageId: string(headers.messageId, "messageId"), contentType: "application/json" }, message: "OK", data: "{}" };
  }
  async stop() { this.abort?.abort(); this.socket?.terminate(); await this.loop; this.state = "stopped"; }
  status() { return { state: this.state, ...(this.lastError ? { lastError: this.lastError } : {}) }; }
  send(target: Message, text: string, id: string, signal: AbortSignal) { return this.sender.send(target, text, id, signal); }
}
export function createAdapter(platform: Platform, config: ChannelConfig, secret: string): Adapter {
  return platform === "feishu" ? new FeishuAdapter(config, secret) : new DingtalkAdapter(config, secret);
}
