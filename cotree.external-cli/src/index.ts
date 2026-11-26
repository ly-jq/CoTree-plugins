import { definePlugin, type PluginToolContext, type PluginToolResult, type PluginJsonValue } from "@cotree/plugin-sdk";
import { SERVICE_ID } from "./shared.js";

function delegateToService(toolName: string) {
  return async (input: PluginJsonValue, context: PluginToolContext): Promise<PluginToolResult> => {
    const toolCallId = (context as unknown as { toolCallId?: unknown }).toolCallId;
    const result = await context.services.call(SERVICE_ID, "tool", {
      toolName,
      input: input ?? {},
      context: {
        runId: context.runId,
        agentId: context.agentId,
        workspace: context.workspace,
        target: context.target,
        ...(context.sessionId ? { sessionId: context.sessionId } : {}),
        ...(typeof toolCallId === "string" && toolCallId ? { toolCallId } : {})
      }
    });
    if (result && typeof result === "object" && !Array.isArray(result) && typeof (result as { ok?: unknown }).ok === "boolean") {
      return result as unknown as PluginToolResult;
    }
    return { ok: true, output: result };
  };
}

// All declared tools are bound to `services[cli-runner]` (`tools[].service`).
// These handlers provide a consistent fallback if invoked via the tool host.
export default definePlugin({
  tools: {
    inspect: delegateToService("inspect"),
    start: delegateToService("start"),
    wait: delegateToService("wait"),
    steer: delegateToService("steer"),
    respond: delegateToService("respond"),
    stop: delegateToService("stop"),
    read: delegateToService("read"),
    handoff: delegateToService("handoff"),
    fork: delegateToService("fork"),
    compact: delegateToService("compact"),
    undoTurn: delegateToService("undoTurn"),
    queue: delegateToService("queue"),
    listNativeSessions: delegateToService("listNativeSessions"),
    importNative: delegateToService("importNative")
  }
});
