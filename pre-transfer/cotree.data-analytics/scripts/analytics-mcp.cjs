"use strict";
// CoTree's text/JSON transport. The archived canonical validator stays intact.
const core = require("../runtime/analytics-core.cjs");
const { once } = require("node:events");
const LIMIT = 4_000_000;
const descriptions = {
  validate_artifact: "Validate a report/dashboard manifest, snapshot and sources; return the normalized payload. Does not query data or write files.",
  render_artifact: "Normalize validated report/dashboard data as JSON. No embedded UI is displayed; use scripts/portable-report.mjs for an offline HTML reader.",
  render_chart: "Validate and normalize chart data as JSON. Does not display an embedded widget or fetch data.",
  render_table: "Validate and normalize table data as JSON. Does not display an embedded widget or fetch data."
};
const tools = core.toolDefinitions().filter(tool => Object.hasOwn(descriptions, tool.name)).map(({ _meta, ...tool }) => ({
  ...tool, description: descriptions[tool.name], annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
}));
const object = value => !!value && typeof value === "object" && !Array.isArray(value);
const error = (id, code, message) => ({ jsonrpc: "2.0", id, error: { code, message } });
function handle(message) {
  if (!object(message) || message.jsonrpc !== "2.0" || typeof message.method !== "string") return error(null, -32600, "Invalid Request");
  if (!Object.hasOwn(message, "id")) return null;
  const { id, method } = message;
  if (typeof id !== "string" && typeof id !== "number") return error(null, -32600, "Invalid request id");
  const params = message.params ?? {};
  if (!object(params)) return error(id, -32602, "Expected object params");
  let result;
  if (method === "initialize") result = {
    protocolVersion: ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"].includes(params.protocolVersion) ? params.protocolVersion : "2025-11-25",
    capabilities: { tools: {} }, serverInfo: { name: "cotree-data-analytics", version: core.SERVER_VERSION },
    instructions: "Validate reviewed local data only. Results are JSON, not rendered UI. Build an offline report with the plugin's portable-report script. No network queries, Sites export, file writes or MCP Apps bridge are exposed."
  };
  else if (method === "ping") result = {};
  else if (method === "tools/list") result = { tools };
  else if (method === "tools/call") {
    if (typeof params.name !== "string" || !Object.hasOwn(descriptions, params.name) || !object(params.arguments ?? {})) return error(id, -32602, "Unknown tool or invalid arguments");
    try {
      const payload = core.callTool(params.name, params.arguments ?? {});
      result = { content: [{ type: "text", text: JSON.stringify(payload) }], structuredContent: payload, isError: false };
    } catch (failure) {
      result = { content: [{ type: "text", text: failure.message }], isError: true };
    }
  } else return error(id, -32601, "Method not found");
  return { jsonrpc: "2.0", id, result };
}
async function main() {
  let pending = Buffer.alloc(0);
  for await (const chunk of process.stdin) {
    pending = Buffer.concat([pending, chunk]);
    let end;
    while ((end = pending.indexOf(10)) !== -1) {
      if (end > LIMIT) throw new Error("MCP input exceeds 4 MB");
      const line = pending.subarray(0, end).toString("utf8"); pending = pending.subarray(end + 1);
      if (!line.trim()) continue;
      let response;
      try { response = handle(JSON.parse(line)); } catch { response = error(null, -32700, "Parse error"); }
      if (response && !process.stdout.write(JSON.stringify(response) + "\n")) await once(process.stdout, "drain");
    }
    if (pending.length > LIMIT) throw new Error("MCP input exceeds 4 MB");
  }
}
if (require.main === module) main().catch(() => { process.stderr.write("Analytics protocol input rejected.\n"); process.exitCode = 1; process.stdin.destroy(); });
module.exports = { handle };
