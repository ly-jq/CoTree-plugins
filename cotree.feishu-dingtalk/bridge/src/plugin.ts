import { definePlugin, type PluginToolResult, type CoTreeCodePlugin } from "../../../../packages/plugin-sdk/src/index.js";

const names = ["messaging_status", "messaging_configure", "messaging_workspaces", "messaging_start", "messaging_stop", "messaging_retry_input", "messaging_retry_delivery", "messaging_reply"];
const tools: NonNullable<CoTreeCodePlugin["tools"]> = {};
for (const name of names) {
  tools[name] = async (input, context): Promise<PluginToolResult> => {
    const result = await context.services.call("messaging.bridge", name, input, { timeoutMs: 60000 });
    const response = result as { ok: boolean; data?: PluginToolResult["output"]; code?: string };
    return response.ok ? { ok: true, output: response.data ?? null } : { ok: false, error: { code: response.code ?? "MESSAGING_FAILED", message: response.code ?? "MESSAGING_FAILED", recoverable: true } };
  };
}
export default definePlugin({ tools });
