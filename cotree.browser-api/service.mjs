import plugin from "./index.mjs";

// The host owns the process, storage and authorization. Nothing is persisted in this service.
export default {
  async call(method, request, service) {
    if (method !== "execute" || request?.toolName !== "manage") throw new Error("Unsupported workbench service method.");
    const capability = async (name, input) => {
      const result = await service.host.call("tool.capability", { capability: name, input });
      if (!result.ok) throw new Error(`${result.error?.code}: ${result.error?.message}`);
      return result.output;
    };
    return plugin.tools.manage(request.input, { ...request.context,
      tools: { call: (toolName, input) => capability("tools.call", { toolName, input }) },
      storage: {
        get: key => capability("storage.get", { key }),
        set: (key, value) => capability("storage.set", { key, value }),
        delete: key => capability("storage.delete", { key }),
        list: (prefix = "") => capability("storage.list", { prefix })
      }
    });
  }
};
