import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchFeishuBotIdentity } from "../src/feishu-identity.js";

afterEach(() => vi.unstubAllGlobals());

describe("Feishu bot identity lookup", () => {
  it("uses authenticated fixed endpoints and returns only the root bot open_id", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json({ code: 0, tenant_access_token: "private-token" }))
      .mockResolvedValueOnce(Response.json({ code: 0, bot: { open_id: "ou_bot123", app_name: "Fixture", activate_status: 2 } }));
    vi.stubGlobal("fetch", fetch);
    expect(await fetchFeishuBotIdentity("cli_fixture", "private-secret")).toEqual({ openId: "ou_bot123" });
    expect(fetch).toHaveBeenNthCalledWith(1, "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", expect.objectContaining({
      method: "POST", redirect: "error", body: JSON.stringify({ app_id: "cli_fixture", app_secret: "private-secret" }), signal: expect.any(AbortSignal)
    }));
    expect(fetch).toHaveBeenNthCalledWith(2, "https://open.feishu.cn/open-apis/bot/v3/info", expect.objectContaining({
      method: "GET", redirect: "error", headers: { Authorization: "Bearer private-token", Accept: "application/json" }, signal: expect.any(AbortSignal)
    }));
  });
  it.each([
    { code: 10003, msg: "private-secret is invalid" },
    { code: 0 },
    { code: 0, tenant_access_token: "" }
  ])("rejects invalid app authentication without returning platform details: %j", async body => {
    const fetch = vi.fn().mockResolvedValue(Response.json(body)); vi.stubGlobal("fetch", fetch);
    await expect(fetchFeishuBotIdentity("app", "private-secret")).rejects.toMatchObject({ code: "FEISHU_AUTH_REJECTED", message: "FEISHU_AUTH_REJECTED" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it.each([
    { code: 99991672, msg: "private-token cannot access bot" },
    { code: 0 },
    { code: 0, bot: { open_id: "cli_application_is_not_bot_id" } },
    { code: 0, data: { bot: { open_id: "ou_wrong_shape" } } }
  ])("requires a valid bot response without returning platform details: %j", async body => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ code: 0, tenant_access_token: "private-token" })).mockResolvedValueOnce(Response.json(body)));
    await expect(fetchFeishuBotIdentity("app", "private-secret")).rejects.toMatchObject({ code: "FEISHU_BOT_UNAVAILABLE", message: "FEISHU_BOT_UNAVAILABLE" });
  });
  it("sanitizes network failures and malformed responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network failed for private-secret")));
    await expect(fetchFeishuBotIdentity("app", "private-secret")).rejects.toMatchObject({ message: "FEISHU_LOOKUP_UNAVAILABLE" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ code: 0, tenant_access_token: "private-token" })).mockResolvedValueOnce(new Response("private-token is not JSON")));
    await expect(fetchFeishuBotIdentity("app", "private-secret")).rejects.toMatchObject({ message: "FEISHU_LOOKUP_UNAVAILABLE" });
  });
});
