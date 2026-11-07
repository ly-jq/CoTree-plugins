import { workflowOperation } from "./workflow.mjs";
export default {
  tools: {
    async manage(input, context) {
      if (input.action.startsWith("workflow.") || input.action.startsWith("selection.")) return { ok: true, output: await workflowOperation(input, context) };
      try { return { ok: true, output: await context.tools.call("BrowserApi", input) }; }
      catch (error) {
        if (input.action !== "call" || !input.operationId) throw error;
        try {
          const output = await context.tools.call("BrowserApi", { action: "receipt", operationId: input.operationId, ...(input.profile ? { profile: input.profile } : {}) });
          return { ok: false, output, error: { code: "BROWSER_API_CALL_FAILED", message: "Inspect the request receipt. No retry was sent." } };
        } catch { throw error; }
      }
    }
  }
};
