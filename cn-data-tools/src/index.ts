import {
  definePlugin,
  type PluginJsonValue,
  type PluginNetworkClient,
  type PluginToolResult
} from "@cotree/plugin-sdk";
import type { CnDataFetch } from "./http.js";
import { getWeather, weatherOutputToJson } from "./weather.js";
import { getFinanceQuote, financeQuoteOutputToJson } from "./finance-quote.js";
import { searchNews, newsSearchOutputToJson } from "./news-search.js";

export default definePlugin({
  tools: {
    async "WeatherGet"(input, context) {
      const args = asRecord(input);
      const days = readPositiveInt(args, "days");
      try {
        const output = await getWeather({
          location: readString(args, "location") ?? "",
          ...(days !== undefined ? { days } : {})
        }, { fetcher: brokerFetch(context.network) });
        return ok(weatherOutputToJson(output), `Weather returned for ${output.location}.`);
      } catch (error) {
        return fail("WEATHER_GET_FAILED", errorMessage(error));
      }
    },

    async "FinanceQuote"(input, context) {
      const args = asRecord(input);
      const name = readString(args, "name");
      try {
        const output = await getFinanceQuote({
          symbol: readString(args, "symbol") ?? "",
          ...(name ? { name } : {})
        }, { fetcher: brokerFetch(context.network) });
        return ok(
          financeQuoteOutputToJson(output),
          `Finance quote returned for ${output.symbol} at ${output.timestamp}; result batch ${output.evidenceBatch.status}.`
        );
      } catch (error) {
        return fail("FINANCE_QUOTE_FAILED", errorMessage(error));
      }
    },

    async "NewsSearch"(input, context) {
      const args = asRecord(input);
      const query = readString(args, "query");
      const categories = readStringArray(args, "categories");
      const maxResults = readPositiveInt(args, "maxResults");
      const fresh = readBoolean(args, "fresh");
      try {
        const output = await searchNews({
          ...(query !== undefined ? { query } : {}),
          ...(categories !== undefined ? { categories } : {}),
          ...(maxResults !== undefined ? { maxResults } : {}),
          ...(fresh !== undefined ? { fresh } : {})
        }, { fetcher: brokerFetch(context.network) });
        return ok(
          newsSearchOutputToJson(output),
          `News search returned ${output.items.length} item(s) from ${output.sources.length} source(s).`
        );
      } catch (error) {
        return fail("NEWS_SEARCH_FAILED", errorMessage(error));
      }
    }
  }
});

function brokerFetch(network: PluginNetworkClient): CnDataFetch {
  return async (url, init = {}) => {
    const response = asRecord(await network.fetch({
      url,
      method: init.method ?? "GET",
      ...(init.headers ? { headers: init.headers } : {}),
      ...(init.body !== undefined ? { body: init.body } : {}),
      timeoutMs: 5_000,
      maxResponseBytes: 4 * 1024 * 1024
    }));
    const headers = asRecord(response.headers);
    const body = typeof response.body === "string" ? response.body : "";
    const status = typeof response.status === "number" ? response.status : 0;
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: "",
      headers: {
        get: (name) => typeof headers[name.toLowerCase()] === "string" ? headers[name.toLowerCase()] as string : null
      },
      text: async () => body
    };
  };
}

function ok(output: PluginJsonValue, summary: string): PluginToolResult {
  return { ok: true, output, summary };
}

function fail(code: string, message: string): PluginToolResult {
  return { ok: false, error: { code, message, recoverable: true }, summary: message };
}

function asRecord(value: PluginJsonValue | undefined): Record<string, PluginJsonValue> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, PluginJsonValue> : {};
}

function readString(record: Record<string, PluginJsonValue>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readPositiveInt(record: Record<string, PluginJsonValue>, key: string): number | undefined {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : undefined;
}

function readBoolean(record: Record<string, PluginJsonValue>, key: string): boolean | undefined {
  const value = record[key];
  return typeof value === "boolean" ? value : undefined;
}

function readStringArray(record: Record<string, PluginJsonValue>, key: string): string[] | undefined {
  const value = record[key];
  if (!Array.isArray(value)) return undefined;
  const items = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return items.length > 0 ? items : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
