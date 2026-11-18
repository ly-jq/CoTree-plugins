import type { PluginToolContext, PluginToolResult } from "@cotree/plugin-sdk";
import { digest, good, integer, object, parse, privateKey, relative, shape, StudioError, text, type Json, type ObjectValue } from "./shared.js";

export const CAPTURE_ACTIONS = ["capture.targets", "capture.start", "capture.pause", "capture.resume", "capture.stop", "capture.mark", "capture.status", "capture.list", "capture.read", "capture.evidence", "capture.retain", "sample.get", "list", "get", "status"];
export const NETWORK_ACTIONS = ["network.enable", "network.disable", "network.list", "network.request", "network.responseBody"];
export function summarizeHar(har: ObjectValue, offset = 0, limit = 50) {
  const log = object(har.log, "HAR log");
  if (!Array.isArray(log.entries)) throw new StudioError("STUDIO_HAR_INVALID", "HAR log.entries must be an array.");
  const entries = log.entries.slice(offset, offset + limit).map((value, index) => {
    const item = object(value, "HAR entry"), request = object(item.request, "request"), response = object(item.response, "response");
    const url = new URL(text(request.url, "request.url", 16000));
    if (!["http:", "https:"].includes(url.protocol)) throw new StudioError("STUDIO_HAR_URL_INVALID", "Only HTTP(S) HAR requests are supported.");
    const content = response.content && typeof response.content === "object" && !Array.isArray(response.content) ? response.content : {};
    const post = request.postData && typeof request.postData === "object" && !Array.isArray(request.postData) ? request.postData : {};
    const bodyShape = (value: Json | undefined, encoding?: Json): Json => {
      if (typeof value !== "string") return { available: false, reason: "body_not_retained_in_har" };
      const decoded = encoding === "base64" ? Buffer.from(value, "base64").toString("utf8") : value;
      try { return { available: true, bytes: Buffer.byteLength(decoded), schema: shape(JSON.parse(decoded) as Json) }; }
      catch { return { available: true, bytes: Buffer.byteLength(decoded), schema: { type: "non_json" }, contentOmitted: true }; }
    };
    return { index: offset + index, method: request.method, origin: url.origin, path: url.pathname,
      queryNames: [...url.searchParams.keys()].filter(key => !privateKey(key)), status: response.status,
      startedDateTime: item.startedDateTime ?? null, durationMs: item.time ?? null,
      requestBody: bodyShape(post.text), responseBody: bodyShape(content.text, content.encoding),
      correlation: "HAR timing only; associate with a recorded action before claiming causality" };
  });
  return { entries, offset, total: log.entries.length, complete: offset + entries.length >= log.entries.length,
    ...(offset + entries.length < log.entries.length ? { nextOffset: offset + entries.length } : {}), credentialsIncluded: false, valuesIncluded: false };
}
export async function capture(input: ObjectValue, context: PluginToolContext): Promise<PluginToolResult> {
  const action = text(input.action, "action", 80);
  if (action === "import-har") {
    const source = relative(input.path, "path"), read = await context.files.read(source, { maxBytes: 1048576 });
    const result = { source: { path: source, sha256: digest(read.content) }, ...summarizeHar(parse(read.content, source), integer(input.offset, "offset", 0, 1000000, 0), integer(input.limit, "limit", 1, 100, 50)) };
    const artifact = await context.artifacts.create({ type: "json", content: JSON.stringify(result), summary: "API structure from HAR; values and credentials omitted" });
    return good({ ...result, artifact: artifact.artifact });
  }
  const request = object(input.request ?? {}, "request");
  if (CAPTURE_ACTIONS.includes(action)) {
    if (["capture.start", "capture.mark", "capture.pause", "capture.resume", "capture.stop"].includes(action)) {
      const key = text(request.requestId, "request.requestId", 128);
      if (!/^[a-zA-Z0-9_-]+$/.test(key)) throw new StudioError("STUDIO_INPUT_INVALID", "request.requestId must be a stable 1–128 character id containing letters, digits, - or _. Reuse it only for the same recording command.");
    }
    if (action === "capture.start") {
      text(request.sessionId, "request.sessionId", 256); text(request.tabId, "request.tabId", 256);
      const options = request.captureOptions === undefined ? {} : object(request.captureOptions, "captureOptions");
      request.captureOptions = { ...options, control: options.control ?? "current" };
    }
    const response = await context.tools.call("BrowserApi", { ...request, action });
    return relay(response);
  }
  if (NETWORK_ACTIONS.includes(action)) {
    text(request.sessionId, "request.sessionId", 256); text(request.tabId, "request.tabId", 256);
    if (["network.request", "network.responseBody"].includes(action)) text(request.requestId, "request.requestId", 256);
    const response = await context.tools.call("BrowserDevtools", { ...request, operation: action });
    // Preserve native errors/receipts. Response body content is not automatically copied into product documents.
    return relay(response);
  }
  throw new StudioError("STUDIO_CAPTURE_ACTION_DENIED", "Use a documented recording/read operation or import-har. This tool never replays business requests or runs page JavaScript.");
}
export function relay(value: Json): PluginToolResult {
  if (value && typeof value === "object" && !Array.isArray(value) && typeof value.ok === "boolean") return value as PluginToolResult;
  return good(value);
}
