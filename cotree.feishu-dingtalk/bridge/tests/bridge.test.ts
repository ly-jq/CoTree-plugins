import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Bridge } from "../src/bridge.js";
import { BridgeError, saveConfig } from "../src/config.js";
import { Store } from "../src/store.js";
import type { Adapter, InputClient, InputResult, Message } from "../src/types.js";

const roots: string[] = [], bridges: Bridge[] = [];
afterEach(async () => {
  for (const bridge of bridges.splice(0)) await bridge.stop();
  vi.useRealTimers();
  for (const root of roots.splice(0)) {
    const resolved = path.resolve(root);
    if (path.dirname(resolved) !== path.resolve(tmpdir()) || !path.basename(resolved).startsWith("cotree-messaging-test-")) throw new Error("Unexpected test cleanup path");
    rmSync(resolved, { recursive: true, force: true });
  }
});
const message: Message = { platform: "feishu", accountId: "app", messageId: "m1", chatId: "chat", userId: "user", text: "do work", kind: "direct" };
function fixture() {
  const directory = mkdtempSync(path.join(tmpdir(), "cotree-messaging-test-")); roots.push(directory);
  const file = path.join(directory, "config.json");
  saveConfig(file, { schemaVersion: 1, cotreeUrl: "http://127.0.0.1:19191", workspaceId: "w", tokenEnv: "TEST_COTREE_TOKEN", feishu: { appId: "app", secretEnv: "TEST_FEISHU_SECRET", allowUsers: ["user", "second"], allowChats: [] } });
  writeFileSync(path.join(directory, "secrets.env"), "TEST_COTREE_TOKEN=fake-token\nTEST_FEISHU_SECRET=fake-secret\n");
  const sends: string[] = []; const submissions: { body: unknown; key: string }[] = [];
  const adapter: Adapter = { platform: "feishu", start: async () => {}, stop: async () => {}, send: async (_target, text) => { sends.push(text); } };
  let result: InputResult = { input: { state: { delivery: "consumed" }, run: { runId: "r", status: "running" } } };
  const client: InputClient = { submit: async (body, key) => { submissions.push({ body, key }); return { inputId: `input-${key}`, sessionId: `session-${key}` }; }, result: async () => result };
  const make = () => { const bridge = new Bridge(file, () => adapter, () => client); bridges.push(bridge); return bridge; };
  return { file, directory, make, client, adapter, sends, submissions, final: () => { result = { input: { state: { delivery: "consumed" }, run: { runId: "r", status: "completed" } }, final: { eventId: "final", text: "answer" } }; }, setResult: (value: InputResult) => { result = value; } };
}
describe("durable messaging bridge", () => {
  it("deduplicates platform redelivery across restarts and delivers only canonical finals", async () => {
    const f = fixture(), bridge = f.make(); await bridge.start(false);
    bridge.receive(message); bridge.receive(message); await bridge.pump();
    expect(f.submissions).toHaveLength(1); expect(f.sends).toEqual([]);
    await bridge.stop(); f.final();
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(Date.now() + 6000);
    const restarted = f.make(); await restarted.start(false); restarted.receive(message); await restarted.pump(); await restarted.pump();
    expect(f.submissions).toHaveLength(1); expect(f.sends).toEqual(["answer"]);
  });
  it("freezes the request before POST and replays the same key after a lost receipt", async () => {
    const f = fixture(), original = f.client.submit; let lost = true;
    f.client.submit = async (...args) => { const receipt = await original(...args); if (lost) { lost = false; throw new BridgeError("COTREE_UNAVAILABLE", undefined, true); } return receipt; };
    const first = f.make(); await first.start(false); first.receive(message); await first.pump(); await first.stop();
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(Date.now() + 6000);
    const retry = f.make(); await retry.start(false); await retry.pump();
    expect(f.submissions).toHaveLength(2); expect(f.submissions[0]).toEqual(f.submissions[1]);
  });
  it("reuses one conversation and isolates different senders", async () => {
    const f = fixture(), bridge = f.make(); f.final(); await bridge.start(false);
    bridge.receive(message); await bridge.pump();
    bridge.receive({ ...message, messageId: "m2" }); bridge.receive({ ...message, messageId: "m3", userId: "second" }); await bridge.pump();
    expect(f.submissions[1]!.body).toMatchObject({ session: { id: expect.any(String) } });
    expect(f.submissions[2]!.body).toMatchObject({ session: { create: expect.any(Object) } });
  });
  it("does not automatically repeat uncertain outbound messages", async () => {
    const f = fixture(), bridge = f.make(); f.final(); f.adapter.send = async () => { f.sends.push("possibly delivered"); throw new Error("lost response with secret"); };
    await bridge.start(false); bridge.receive(message); await bridge.pump(); await bridge.pump();
    expect(f.sends).toHaveLength(1);
    const state = bridge.status(); expect(JSON.stringify(state)).not.toContain("secret");
    const id = (state.uncertainDeliveries![0] as { id: string }).id;
    bridge.retryDelivery(id); await bridge.pump(); expect(f.sends).toHaveLength(2);
  });
  it("reports a pause without treating it as completion and sends a later final", async () => {
    const f = fixture(), bridge = f.make();
    f.setResult({ input: { state: { delivery: "consumed" }, run: { runId: "r", status: "paused_for_approval" } } });
    await bridge.start(false); bridge.receive(message); await bridge.pump();
    expect(f.sends[0]).toContain("等待本机处理");
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(Date.now() + 6000); await bridge.pump();
    expect(f.sends).toHaveLength(1); f.final(); vi.setSystemTime(Date.now() + 6000); await bridge.pump();
    expect(f.sends).toEqual([expect.stringContaining("等待本机处理"), "answer"]);
  });
  it("blocks a revoked source without blindly retrying and preserves the input for explicit retry", async () => {
    const f = fixture(), bridge = f.make(); let attempts = 0;
    f.client.submit = async () => { attempts++; throw new BridgeError("AUTHORIZATION_REVOKED"); };
    await bridge.start(false); const id = bridge.receive(message); await bridge.pump(); await bridge.pump();
    expect(attempts).toBe(1); expect(JSON.stringify(bridge.status())).toContain("AUTHORIZATION_REVOKED");
    bridge.retryInput(id); await bridge.pump(); expect(attempts).toBe(2);
  });
  it("rejects two owners and refuses to replay a database with a different source identity", () => {
    const f = fixture(), directory = path.join(f.directory, "lock-test"), first = new Store(directory, "identity");
    expect(() => new Store(directory, "identity")).toThrow("already owned"); first.close();
    expect(() => new Store(directory, "other")).toThrow("new config directory");
    const recovered = new Store(directory, "identity"); recovered.close();
  });
  it("marks interrupted sending as unknown and detects changed event or reply payloads", () => {
    const f = fixture(), directory = path.join(f.directory, "state-test"); let store = new Store(directory, "identity");
    const id = store.receive(message);
    expect(() => store.receive({ ...message, text: "changed" })).toThrow("EVENT_ID_CONFLICT");
    store.enqueueReply(store.get(id), "manual:key", "first", false);
    expect(() => store.enqueueReply(store.get(id), "manual:key", "changed", false)).toThrow("REPLY_ID_CONFLICT");
    store.deliveryState(store.deliveries()[0]!.id, "sending"); store.close(); store = new Store(directory, "identity");
    expect(store.deliveries()).toEqual([]); expect(store.status().uncertainDeliveries).toHaveLength(1); store.close();
  });
  it("does not let older polling conversations starve newly queued messages", () => {
    const f = fixture(), store = new Store(path.join(f.directory, "fairness-test"), "identity");
    try {
      for (let index = 0; index < 5; index++) {
        const id = store.receive({ ...message, messageId: `m${index}`, chatId: `chat${index}` });
        if (index < 4) store.defer(id, undefined, false, 0);
      }
      const due = store.due();
      expect(due[0]!.message.messageId).toBe("m4");
      expect(due).toHaveLength(4);
    } finally { store.close(); }
  });
});
