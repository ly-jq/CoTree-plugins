import { afterEach, describe, expect, it, vi } from "vitest";
import { createAdapter } from "../src/adapters.js";
import type { ChannelConfig } from "../src/config.js";

type Callbacks = { onReady(): void; onReconnected(): void; onError(error: Error): void; handshakeTimeoutMs: number };
const sdk = vi.hoisted(() => ({ clients: [] as Array<{ callbacks: Callbacks; state: string; close: () => void }> }));
vi.mock("@larksuiteoapi/node-sdk", () => ({
  WSClient: class {
    state = "idle";
    constructor(readonly callbacks: Callbacks) { sdk.clients.push(this); }
    async start() { this.state = "connecting"; }
    close() { this.state = "closed"; }
    getConnectionStatus() { return { state: this.state }; }
  },
  EventDispatcher: class { register() { return this; } }
}));
afterEach(() => { sdk.clients.length = 0; });
const config: ChannelConfig = { appId: "cli_0123456789abcdef", secretEnv: "FIXTURE_SECRET", allowUsers: [], allowChats: [], requireMention: true };

describe("Feishu connection diagnostics", () => {
  it.each([
    ["514", "FEISHU_WS_AUTH_FAILED"], ["403", "FEISHU_WS_FORBIDDEN"],
    ["1000040350", "FEISHU_WS_CONNECTION_LIMIT"], ["12345", "FEISHU_WS_REJECTED_12345"]
  ])("reports a failure arriving after start resolves, safely preserving code %s", async (code, expected) => {
    const adapter = createAdapter("feishu", config, "private-secret"); await adapter.start(() => {});
    expect(adapter.status?.()).toEqual({ state: "connecting" });
    const client = sdk.clients[0]!; client.state = "failed";
    client.callbacks.onError(new Error(`pullConnectConfig failed: code=${code}, msg=private-secret wss://example.test/?ticket=private-ticket`));
    expect(adapter.status?.()).toEqual({ state: "failed", lastError: expected });
    expect(client.callbacks.handshakeTimeoutMs).toBe(15000);
    await adapter.stop(); expect(adapter.status?.()).toEqual({ state: "stopped" });
  });
  it("clears a previous failure on recovery and ignores callbacks after stop", async () => {
    const adapter = createAdapter("feishu", config, "private-secret"); await adapter.start(() => {});
    const client = sdk.clients[0]!; client.state = "failed";
    client.callbacks.onError(new Error("WebSocket reconnect exhausted after 3 attempts"));
    expect(adapter.status?.()?.lastError).toBe("FEISHU_WS_RETRIES_EXHAUSTED");
    client.state = "connected"; client.callbacks.onReconnected();
    expect(adapter.status?.()).toEqual({ state: "connected" });
    await adapter.stop(); client.callbacks.onError(new Error("private-error"));
    expect(adapter.status?.()).toEqual({ state: "stopped" });
  });
  it("never returns arbitrary exception messages", async () => {
    const adapter = createAdapter("feishu", config, "private-secret"); await adapter.start(() => {});
    const client = sdk.clients[0]!; client.state = "failed";
    client.callbacks.onError(new Error("private-secret private-ticket"));
    expect(adapter.status?.()).toEqual({ state: "failed", lastError: "FEISHU_WS_FAILED" });
    client.state = "connected"; client.callbacks.onReady();
    expect(adapter.status?.()).toEqual({ state: "connected" });
    await adapter.stop();
  });
  it("rejects malformed App IDs instead of staying idle silently", async () => {
    const adapter = createAdapter("feishu", { ...config, appId: "incorrect-app-id" }, "private-secret");
    await expect(adapter.start(() => {})).rejects.toMatchObject({ code: "FEISHU_APP_ID_INVALID" });
    expect(sdk.clients).toHaveLength(0);
  });
});
