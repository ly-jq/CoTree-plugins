import type { ChannelConfig, Platform } from "./config.js";
export type Message = {
  platform: Platform; accountId: string; messageId: string; chatId: string; userId: string;
  text: string; kind: "direct" | "group"; threadId?: string;
};
export type Adapter = {
  platform: Platform;
  start(receive: (message: Message) => void): Promise<void>;
  stop(): Promise<void>;
  status?(): { state: string; lastError?: string };
  send(target: Message, text: string, deliveryId: string, signal: AbortSignal): Promise<void>;
};
export type AdapterFactory = (platform: Platform, config: ChannelConfig, secret: string) => Adapter;
export type InputReceipt = { inputId: string; sessionId: string };
export type InputResult = {
  input: { run?: { runId: string; status: string }; state: { queue?: string; delivery: string }; blockedReason?: string; settledAt?: string };
  final?: { eventId: string; text: string };
};
export type InputClient = {
  submit(body: unknown, key: string, signal: AbortSignal): Promise<InputReceipt>;
  result(id: string, signal: AbortSignal): Promise<InputResult>;
};
