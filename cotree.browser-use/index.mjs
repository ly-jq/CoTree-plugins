const operations = {
  tabs: "listTabs",
  snapshot: "snapshot",
  inspect: "inspect",
  devtools: "devtools",
  act: "act",
  screenshot: "screenshot"
};

export default {
  tools: {
    async BrowserUse(input, context) {
      const operation = input && typeof input.operation === "string" ? input.operation : "";
      const method = operations[operation];
      if (!method) {
        return { ok: false, error: { code: "BROWSER_USE_OPERATION_INVALID", message: "operation must be one of tabs, snapshot, inspect, devtools, act, screenshot." } };
      }
      const result = await context.browser[method](input.input ?? {});
      if (operation === "screenshot" && result && typeof result === "object" && !Array.isArray(result) && "output" in result) {
        return { ok: true, output: result.output, ...(Array.isArray(result.content) ? { content: result.content } : {}), ...(result.artifacts !== undefined ? { artifacts: result.artifacts } : {}), ...(result.budget !== undefined ? { budget: result.budget } : {}), ...(typeof result.summary === "string" ? { summary: result.summary } : {}), };
      }
      return { ok: true, output: result, summary: `Browser ${operation} completed through the CoTree browser-use plugin.` };
    }
  }
};
