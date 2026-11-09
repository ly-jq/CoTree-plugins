import {
  defineProviderAdapter, defineProviderService, providerObject, providerString,
  type ProviderAuthDefinition, type ProviderModel, type ProviderObject
} from "@cotree/plugin-sdk/provider";

const baseUrl = "https://api.openai.com/v1";

/** Keep the original export/provider identity; the host owns SIWC and streaming. */
export const codex = defineProviderAdapter({
  protocol: "openai-responses",
  auth(configuration): ProviderAuthDefinition {
    return {
      kind: "oauth-pkce", authorizationUrl: "https://auth.openai.com/api/accounts/authorize",
      tokenUrl: "https://auth.openai.com/api/accounts/oauth/token", clientId: "dynamic_agent_client",
      scopes: ["openid", "profile", "email", "offline_access", "resource.invoke", "chatgpt.tokens.use.direct"],
      registration: { kind: "chatgpt-plan", agentName: providerString(configuration.agentName ?? "CoTree", "providerOptions.agentName", 80) }
    };
  },
  profile: {
    forceStream: true, systemRole: "developer", nativeToolSearch: false, functionNamespace: "cotree",
    // The public SIWC endpoint issues turn state too. Keep a stable session and let the
    // host echo the first opaque value within a run; credentials remain host-owned.
    routing: { endpoint: `${baseUrl}/responses`, sessionHeaders: ["session-id", "thread-id"],
      turnState: { header: "x-codex-turn-state", sources: ["http"] } },
    omitParameters: ["temperature", "top_p", "max_output_tokens", "max_completion_tokens", "prompt_cache_retention"]
  },
  prepareRequest(request) {
    const body: ProviderObject = { ...request.body, store: false, stream: true };
    // The plan route rejects explicit cache policy controls. Keep its automatic
    // caching, stable cache key and supported comparison diagnostics intact.
    const cacheOptions = body.prompt_cache_options;
    if (cacheOptions && typeof cacheOptions === "object" && !Array.isArray(cacheOptions)) {
      const options = { ...cacheOptions };
      delete options.mode;
      delete options.ttl;
      if (Object.keys(options).length) body.prompt_cache_options = options;
      else delete body.prompt_cache_options;
    }
    return { ...request, url: `${baseUrl}/responses`, headers: { ...request.headers, accept: "text/event-stream" },
      body };
  },
  discovery: {
    request() { return { operation: "discover", url: `${baseUrl}/models`, method: "GET", headers: { accept: "application/json" } }; },
    parse(response): ProviderModel[] {
      let payload: Record<string, unknown>;
      try { payload = providerObject(JSON.parse(response.body)); }
      catch { throw new Error("ChatGPT returned an invalid model catalog."); }
      if (!Array.isArray(payload.models)) throw new Error("ChatGPT did not return its account model catalog.");
      const models = new Map<string, ProviderModel>();
      for (const value of payload.models) {
        if (!value || typeof value !== "object" || Array.isArray(value)) continue;
        const model = providerObject(value);
        if (model.visibility !== "list" || typeof model.slug !== "string") continue;
        const id = model.slug.trim();
        if (!id || id.length > 200 || models.has(id)) continue;
        const displayName = typeof model.display_name === "string" ? model.display_name.trim() : "";
        const context = model.context_window;
        models.set(id, { id,
          ...(displayName && displayName.length <= 256 ? { displayName } : {}),
          ...(typeof context === "number" && Number.isSafeInteger(context) && context > 0 ? { contextWindowTokens: context } : {}),
          capabilities: { streaming: true, toolCalls: true,
            ...(Array.isArray(model.input_modalities) && model.input_modalities.every(item => typeof item === "string")
              ? { vision: model.input_modalities.includes("image") } : {}) } });
      }
      if (!models.size) throw new Error("This ChatGPT account has no listed models. Check plan permission and account access.");
      return [...models.values()];
    }
  }
});
export default defineProviderService({ codex });
