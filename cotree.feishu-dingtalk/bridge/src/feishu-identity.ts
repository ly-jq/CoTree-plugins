import { jsonPost } from "./adapters.js";
import { BridgeError, object, string } from "./config.js";

/** Credentials go only to Feishu's fixed endpoints; tokens never return to the panel. */
export async function fetchFeishuBotIdentity(appId: string, appSecret: string): Promise<{ openId: string }> {
  const signal = AbortSignal.timeout(30000);
  let token: string;
  try {
    const auth = await jsonPost("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", { app_id: appId, app_secret: appSecret }, signal);
    if (auth.code !== 0) throw new BridgeError("FEISHU_AUTH_REJECTED");
    token = string(auth.tenant_access_token, "tenant access token", 4096);
  } catch (error) {
    if (error instanceof BridgeError && ["PLATFORM_API_REJECTED", "FEISHU_AUTH_REJECTED", "INVALID_CONFIG"].includes(error.code)) {
      throw new BridgeError("FEISHU_AUTH_REJECTED");
    }
    throw new BridgeError("FEISHU_LOOKUP_UNAVAILABLE");
  }
  try {
    const response = await fetch("https://open.feishu.cn/open-apis/bot/v3/info", {
      method: "GET", redirect: "error", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, signal
    });
    if (!response.ok) throw new BridgeError("FEISHU_LOOKUP_UNAVAILABLE");
    const text = await response.text();
    if (text.length > 1_048_576) throw new BridgeError("FEISHU_LOOKUP_UNAVAILABLE");
    const data = object(JSON.parse(text));
    if (data.code !== 0 || !data.bot || typeof data.bot !== "object" || Array.isArray(data.bot)) throw new BridgeError("FEISHU_BOT_UNAVAILABLE");
    const openId = object(data.bot).open_id;
    if (typeof openId !== "string" || !/^ou_[a-zA-Z0-9_-]{1,252}$/.test(openId)) throw new BridgeError("FEISHU_BOT_UNAVAILABLE");
    return { openId };
  } catch (error) {
    if (error instanceof BridgeError && error.code === "FEISHU_BOT_UNAVAILABLE") throw error;
    throw new BridgeError("FEISHU_LOOKUP_UNAVAILABLE");
  }
}
