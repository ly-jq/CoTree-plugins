import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MessagingControl } from "../src/control.js";
import { Bridge } from "../src/bridge.js";
import { readConfig, readSecrets } from "../src/config.js";
import { MessagingService } from "../src/service.js";
import type { PluginServiceContext } from "../../../../packages/plugin-sdk/src/service.js";

const fixtures: { root: string; control: MessagingControl }[] = [];
afterEach(async () => {
  vi.unstubAllGlobals();
  for (const { root, control } of fixtures.splice(0)) {
    await control.close();
    if (path.dirname(path.resolve(root)) !== path.resolve(tmpdir()) || !path.basename(root).startsWith("cotree-panel-test-")) throw new Error("Unsafe cleanup path");
    rmSync(root, { recursive: true, force: true });
  }
});
function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "cotree-panel-test-")), file = path.join(root, "config.json");
  const starts = vi.fn(async () => {}), stops = vi.fn(async () => {});
  const bridge = new Bridge(file, platform => ({ platform, start: starts, stop: stops, send: async () => {}, status: () => ({ state: "connected" }) }));
  const control = new MessagingControl(file, bridge); fixtures.push({ root, control });
  const config = { schemaVersion: 1, cotreeUrl: "http://127.0.0.1:19191", workspaceId: "workspace", tokenEnv: "PANEL_TEST_TOKEN", feishu: { appId: "app", secretEnv: "PANEL_TEST_SECRET", allowUsers: ["user"], allowChats: [], requireMention: true } };
  return { root, file, control, config, starts, stops };
}
describe("panel control", () => {
  it("opens on a fresh install and saves credentials without returning them", async () => {
    const f = fixture();
    expect(await f.control.call("panel.state")).toMatchObject({ ok: true, data: { config: null, credentials: { sourceToken: false } } });
    const response = await f.control.call("config.save", { config: f.config, credentials: { sourceToken: 'test-"token\\value', feishuSecret: "test-secret" } });
    expect(response).toMatchObject({ ok: true, data: { credentials: { sourceToken: true, feishuSecret: true } } });
    expect(JSON.stringify(response)).not.toContain("test-secret");
    expect(JSON.stringify(response)).not.toContain("token\\value");
    expect(readSecrets(f.file, readConfig(f.file)).PANEL_TEST_TOKEN).toBe('test-"token\\value');
    expect(readFileSync(f.file, "utf8")).not.toContain("test-secret");
  });
  it("preserves blank credentials and serializes save/start/stop", async () => {
    const f = fixture();
    await f.control.call("config.save", { config: f.config, credentials: { sourceToken: "token", feishuSecret: "secret" } });
    await f.control.call("config.save", { config: f.config, credentials: { sourceToken: "", feishuSecret: "" } });
    const [started, denied, stopped] = await Promise.all([
      f.control.call("messaging_start"), f.control.call("config.save", { config: f.config }), f.control.call("messaging_stop")
    ]);
    expect(started).toMatchObject({ ok: true, running: true });
    expect(denied).toMatchObject({ ok: false, code: "STOP_BRIDGE_BEFORE_CONFIGURE" });
    expect(stopped).toMatchObject({ ok: true, running: false });
    expect(f.starts).toHaveBeenCalledTimes(1); expect(f.stops).toHaveBeenCalledTimes(1);
    expect(readSecrets(f.file, readConfig(f.file)).PANEL_TEST_SECRET).toBe("secret");
  });
  it("checks CoTree before any platform configuration without saving the typed token", async () => {
    const f = fixture(), requests: RequestInit[] = [];
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => { requests.push(init); return Response.json({ ok: true, data: { workspaces: [{ workspaceId: "w" }] } }); });
    const result = await f.control.call("connection.check", { cotreeUrl: f.config.cotreeUrl, sourceToken: "unsaved-token" });
    expect(result).toMatchObject({ ok: true, data: { workspaces: [{ workspaceId: "w" }] } });
    expect(requests).toHaveLength(2);
    expect(requests[0]!.headers).toMatchObject({ Authorization: "Bearer unsaved-token" });
    expect(JSON.stringify(await f.control.call("panel.state"))).not.toContain("unsaved-token");
    expect(f.starts).not.toHaveBeenCalled();
  });
  it("rejects unknown credential fields, missing credentials and raw secret tool input", async () => {
    const f = fixture();
    expect(await f.control.call("config.save", { config: f.config, credentials: { arbitrary: "value" } })).toMatchObject({ ok: false, code: "INVALID_CREDENTIAL_FIELD" });
    await f.control.call("messaging_configure", { config: f.config, credentials: { sourceToken: "must-not-save" } });
    expect(await f.control.call("messaging_start")).toMatchObject({ ok: false, code: "SECRET_REQUIRED" });
    expect(f.starts).not.toHaveBeenCalled();
  });
});
describe("panel bot identity lookup", () => {
  function platform() {
    const fetch = vi.fn(async (url: string, _init: RequestInit) => Response.json(url.endsWith("/internal")
      ? { code: 0, tenant_access_token: "private-token" } : { code: 0, bot: { open_id: "ou_bot" } }));
    vi.stubGlobal("fetch", fetch); return fetch;
  }
  it("works before CoTree or platform configuration is saved and does not persist credentials", async () => {
    const f = fixture(); platform();
    expect(await f.control.call("feishu.bot-info", { appId: "cli_fixture", appSecret: "typed-secret" })).toEqual({ ok: true, running: false, data: { openId: "ou_bot" } });
    expect(existsSync(f.file)).toBe(false);
    expect(existsSync(path.join(f.root, "credentials.json"))).toBe(false);
    expect(f.starts).not.toHaveBeenCalled();
  });
  it("reuses a saved secret for the same app, supports an unsaved override and refuses reuse for another app", async () => {
    const f = fixture(), fetch = platform();
    await f.control.call("config.save", { config: f.config, credentials: { feishuSecret: "saved-secret" } });
    expect(await f.control.call("feishu.bot-info", { appId: " app ", appSecret: "" })).toMatchObject({ ok: true, data: { openId: "ou_bot" } });
    expect(JSON.parse(String(fetch.mock.calls[0]![1].body))).toEqual({ app_id: "app", app_secret: "saved-secret" });
    expect(await f.control.call("feishu.bot-info", { appId: "app", appSecret: "replacement-secret" })).toMatchObject({ ok: true });
    expect(JSON.parse(String(fetch.mock.calls[2]![1].body))).toEqual({ app_id: "app", app_secret: "replacement-secret" });
    expect(readFileSync(path.join(f.root, "credentials.json"), "utf8")).toContain("saved-secret");
    expect(readFileSync(path.join(f.root, "credentials.json"), "utf8")).not.toContain("replacement-secret");
    expect(await f.control.call("feishu.bot-info", { appId: "another-app", appSecret: "" })).toMatchObject({ ok: false, code: "FEISHU_APP_SECRET_REQUIRED" });
    expect(fetch).toHaveBeenCalledTimes(4);
  });
  it("rejects missing and malformed credentials before network access", async () => {
    const f = fixture(), fetch = platform();
    for (const [input, code] of [
      [{}, "FEISHU_APP_ID_REQUIRED"], [{ appId: "app" }, "FEISHU_APP_SECRET_REQUIRED"],
      [{ appId: "app", appSecret: 123 }, "INVALID_CREDENTIAL"],
      [{ appId: "app", appSecret: "secret\n" }, "INVALID_CREDENTIAL"],
      [{ appId: "app", appSecret: "a".repeat(4097) }, "INVALID_CREDENTIAL"]
    ] as const) expect(await f.control.call("feishu.bot-info", input)).toMatchObject({ ok: false, code });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("keeps the lookup unavailable while the bridge is running", async () => {
    const f = fixture(), fetch = platform();
    await f.control.call("config.save", { config: f.config, credentials: { sourceToken: "token", feishuSecret: "secret" } });
    expect(await f.control.call("messaging_start")).toMatchObject({ ok: true, running: true });
    expect(await f.control.call("feishu.bot-info", { appId: "app" })).toMatchObject({ ok: false, code: "STOP_BRIDGE_BEFORE_CONFIGURE" });
    expect(fetch).not.toHaveBeenCalled();
  });
});
describe("service process ownership", () => {
  it("uses fixed arguments, keeps a running child, and releases it on stop", async () => {
    let pending = "", running = false;
    const broker = {
      inspect: vi.fn(async () => ({ available: true })), spawn: vi.fn(async () => ({ processId: "native" })),
      write: vi.fn(async (_id: string, line: string) => {
        const request = JSON.parse(line) as { id: string; method: string };
        if (request.method === "messaging_start") running = true;
        if (request.method === "messaging_stop") running = false;
        pending = Buffer.from(JSON.stringify({ id: request.id, ok: true, running, data: { running } }) + "\n").toString("base64");
      }), read: vi.fn(async () => { const stdout = pending; pending = ""; return { stdout, stderr: "", exited: false }; }), stop: vi.fn(async () => {})
    };
    const service = new MessagingService({ process: broker, workspace: "workspace" } as unknown as PluginServiceContext), signal = new AbortController().signal;
    expect(await service.call("messaging_start", {}, signal)).toMatchObject({ ok: true });
    expect(broker.spawn).toHaveBeenCalledWith("messaging-node", ["bridge.cjs", "control"], expect.objectContaining({ cwd: "dist" }));
    expect(broker.stop).not.toHaveBeenCalled();
    await service.call("panel.state", {}, signal); expect(broker.spawn).toHaveBeenCalledTimes(1);
    await service.call("messaging_stop", {}, signal); expect(broker.stop).toHaveBeenCalledTimes(1);
    expect(await service.call("arbitrary.execute", {}, signal)).toMatchObject({ ok: false, code: "UNKNOWN_CONTROL_METHOD" });
    expect(broker.spawn).toHaveBeenCalledTimes(1);
  });
});
