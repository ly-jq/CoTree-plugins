import path from "node:path";
import { createHash } from "node:crypto";
import { PluginCapabilityError, type PluginJsonValue, type PluginToolResult } from "@cotree/plugin-sdk";

export type Json = PluginJsonValue;
export type ObjectValue = { [key: string]: Json };
export const PLUGIN_ID = "cotree.app-studio";
export class StudioError extends Error {
  constructor(readonly code: string, message: string) { super(message); }
}
export function object(value: unknown, name = "input"): ObjectValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new StudioError("STUDIO_INPUT_INVALID", `${name} must be an object.`);
  return value as ObjectValue;
}
export function text(value: unknown, name: string, max = 8000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new StudioError("STUDIO_INPUT_INVALID", `${name} must contain 1–${max} characters.`);
  return value;
}
export function optionalText(value: unknown, name: string, max = 8000): string | undefined { return value === undefined ? undefined : text(value, name, max); }
export function strings(value: unknown, name: string, max = 64): string[] {
  if (!Array.isArray(value) || value.length > max) throw new StudioError("STUDIO_INPUT_INVALID", `${name} must be an array of at most ${max} strings.`);
  return value.map(item => text(item, name, 1024));
}
export function integer(value: unknown, name: string, min: number, max: number, fallback: number): number {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || typeof value !== "number" || value < min || value > max) throw new StudioError("STUDIO_INPUT_INVALID", `${name} must be ${min}–${max}.`);
  return value;
}
export function relative(value: unknown, name = "projectPath"): string {
  const input = value === undefined ? "." : text(value, name, 512);
  if (path.isAbsolute(input) || path.win32.isAbsolute(input) || input.includes(":")) throw new StudioError("STUDIO_PATH_INVALID", `${name} must be workspace relative.`);
  const normalized = input.replaceAll("\\", "/");
  if (normalized.split("/").includes("..") || normalized.includes("\0")) throw new StudioError("STUDIO_PATH_INVALID", `${name} cannot traverse parent directories.`);
  return path.posix.normalize(normalized);
}
export function file(root: string, name: string): string { return path.posix.join(root, relative(name, "file")); }
export function digest(value: string | Uint8Array): string { return createHash("sha256").update(value).digest("hex"); }
export function json(value: unknown): Json { return JSON.parse(JSON.stringify(value)) as Json; }
export function good(output: unknown, summary?: string): PluginToolResult { return { ok: true, output: json(output), ...(summary ? { summary } : {}) }; }
export function failure(error: unknown): PluginToolResult {
  if (error instanceof PluginCapabilityError) return { ok: false, error: { code: error.code, message: error.message, recoverable: true, ...(error.remedy ? { remedy: error.remedy } : {}) }, ...(error.output !== undefined ? { output: error.output } : {}) };
  // The worker's SDK creates capability errors in a different bundled module.
  // Preserve that original error identity even when instanceof cannot match.
  if (error instanceof Error && "code" in error && typeof error.code === "string") {
    return { ok: false, error: { code: error.code, message: error.message, recoverable: true,
      ...("remedy" in error && typeof error.remedy === "string" ? { remedy: error.remedy } : {}) },
      ...("output" in error && error.output !== undefined ? { output: json(error.output) } : {}) };
  }
  return { ok: false, error: { code: error instanceof StudioError ? error.code : "STUDIO_OPERATION_FAILED", message: error instanceof Error ? error.message : "Operation failed without an Error payload. Inspect the original host receipt.", recoverable: true } };
}
export function parse(content: string, name: string): ObjectValue {
  try { return object(JSON.parse(content), name); }
  catch (error) { if (error instanceof StudioError) throw error; throw new StudioError("STUDIO_JSON_INVALID", `${name} must contain a JSON object.`); }
}
export function identifier(value: unknown, name: string): string {
  const result = text(value, name, 80);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(result)) throw new StudioError("STUDIO_INPUT_INVALID", `${name} must be a simple stable identifier.`);
  return result;
}
const privateNames = new Set(["authorization", "proxyauthorization", "cookie", "setcookie", "password", "passwd", "secret", "clientsecret", "apikey", "accesskey", "accesstoken", "refreshtoken", "idtoken", "token", "csrf", "csrftoken", "xsrf", "xsrftoken", "otp"]);
export function privateKey(key: string): boolean { return privateNames.has(key.toLowerCase().replaceAll(/[-_]/g, "")); }
export function shape(value: Json, depth = 0): ObjectValue {
  if (depth > 8) return { type: "omitted", reason: "schema_depth_limit" };
  if (value === null) return { type: "null" };
  if (Array.isArray(value)) return { type: "array", sampledItems: value.length ? [shape(value[0]!, depth + 1)] : [], coverage: "first_item_only" };
  if (typeof value === "object") {
    const entries = Object.entries(value), properties: ObjectValue = Object.create(null) as ObjectValue;
    for (const [key, child] of entries.slice(0, 64)) properties[key] = privateKey(key) ? { type: "redacted" } : shape(child, depth + 1);
    return { type: "object", properties, omittedProperties: Math.max(0, entries.length - 64) };
  }
  return { type: typeof value };
}
