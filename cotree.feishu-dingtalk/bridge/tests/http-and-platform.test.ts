import { createServer } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CoTreeClient } from "../src/cotree-client.js";
import { createAdapter } from "../src/adapters.js";
import type { Config } from "../src/config.js";
import type { Message } from "../src/types.js";
afterEach(() => vi.unstubAllGlobals());
const channel = { appId: "app", secretEnv: "SECRET", allowUsers: ["u"], allowChats: [], requireMention: true };
const message: Message = { platform: "feishu", accountId: "app", messageId: "original", chatId: "c", userId: "u", kind: "direct", text: "task" };
describe("transport contracts", () => {
  it("sends bearer credentials and the original idempotency key over HTTP and reads the result envelope", async () => {
    const observed: unknown[] = [];
    const server = createServer(async (request, response) => {
      let body = ""; for await (const bytes of request) body += String(bytes);
      observed.push({ path: request.url, auth: request.headers.authorization, key: request.headers["idempotency-key"], body });
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ ok: true, data: request.method === "POST" ? { inputId: "i", sessionId: "s" }
        : { input: { state: { delivery: "consumed" } }, final: { eventId: "event", text: "answer" } } }));
    });
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const address = server.address(); if (!address || typeof address === "string") throw new Error("Missing port");
    try {
      const config: Config = { schemaVersion: 1, cotreeUrl: `http://127.0.0.1:${address.port}`, workspaceId: "wid", tokenEnv: "TOKEN", feishu: channel };
      const client = new CoTreeClient(config, "synthetic-token"); const signal = new AbortController().signal;
      expect(await client.submit({ exact: "body" }, "same-key", signal)).toEqual({ inputId: "i", sessionId: "s" });
      expect(await client.result("i", signal)).toMatchObject({ final: { text: "answer" } });
      expect(observed[0]).toEqual({ path: "/v1/workspaces/wid/inputs", auth: "Bearer synthetic-token", key: "same-key", body: '{"exact":"body"}' });
    } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
  });
  it("does not follow redirects with an CoTree source credential", async () => {
    let options: RequestInit | undefined;
    const fakeFetch: typeof fetch = async (_url, init) => { options = init; return new Response("", { status: 302, headers: { location: "https://other.example" } }); };
    const client = new CoTreeClient({ schemaVersion: 1, cotreeUrl: "http://127.0.0.1:19191", workspaceId: "w", tokenEnv: "TOKEN" }, "synthetic", fakeFetch);
    await expect(client.result("i", new AbortController().signal)).rejects.toMatchObject({ code: "COTREE_HTTP_302" });
    expect(options?.redirect).toBe("error");
  });
  it.each(["feishu", "dingtalk"] as const)("uses %s credentials only at the platform endpoint", async platform => {
    const calls: { url: string; body: Record<string, unknown>; headers: Record<string, string> }[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, body: JSON.parse(String(init.body)) as Record<string, unknown>, headers: init.headers as Record<string, string> });
      return Response.json(calls.length === 1 ? (platform === "feishu" ? { code: 0, tenant_access_token: "access", expire: 7200 } : { accessToken: "access", expireIn: 7200 }) : { code: 0 });
    });
    const adapter = createAdapter(platform, channel, "secret");
    await adapter.send({ ...message, platform }, "reply", "stable-delivery-id", new AbortController().signal);
    expect(calls).toHaveLength(2); expect(calls[1]!.url).not.toContain("secret");
    if (platform === "feishu") {
      expect(calls[1]!.url).toContain("/original/reply"); expect(calls[1]!.body).toMatchObject({ uuid: "stable-delivery-id", msg_type: "text" });
    } else {
      expect(calls[1]!.url).toContain("/oToMessages/batchSend"); expect(calls[1]!.body).toMatchObject({ userIds: ["u"], robotCode: "app", msgKey: "sampleText" });
    }
    expect(JSON.stringify(calls[1]!.body)).not.toContain("secret");
  });
  it("surfaces platform business failure even with HTTP 200", async () => {
    vi.stubGlobal("fetch", async () => Response.json({ code: 99991663, msg: "secret echo" }));
    const adapter = createAdapter("feishu", channel, "secret");
    await expect(adapter.send(message, "text", "key", new AbortController().signal)).rejects.toMatchObject({ code: "PLATFORM_API_REJECTED", message: "PLATFORM_API_REJECTED" });
  });
});
