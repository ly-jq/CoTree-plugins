import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseEnv } from "node:util";

export type Platform = "feishu" | "dingtalk";
export type ChannelConfig = {
  appId: string; secretEnv: string; allowUsers: string[]; allowChats: string[];
  requireMention: boolean; botOpenId?: string; robotCode?: string;
};
export type Config = {
  schemaVersion: 1; cotreeUrl: string; workspaceId: string; tokenEnv: string;
  feishu?: ChannelConfig; dingtalk?: ChannelConfig;
};
export class BridgeError extends Error {
  constructor(readonly code: string, message = code, readonly retryable = false) { super(message); }
}
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new BridgeError("INVALID_OBJECT");
  return value as Record<string, unknown>;
}
export function string(value: unknown, name: string, max = 256): string {
  if (typeof value !== "string" || !value.trim() || value.length > max || value.includes("\0")) throw new BridgeError("INVALID_CONFIG", `Invalid ${name}`);
  return value;
}
function keys(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).some(key => !allowed.includes(key))) throw new BridgeError("UNKNOWN_CONFIG_FIELD");
}
function envName(value: unknown, name: string) {
  const result = string(value, name, 128);
  if (!/^[A-Z_][A-Z0-9_]*$/.test(result)) throw new BridgeError("INVALID_ENV_NAME");
  return result;
}
function ids(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 500) throw new BridgeError("INVALID_ALLOWLIST");
  return [...new Set(value.map(item => {
    const id = string(item, "allowlist id");
    if (id === "*") throw new BridgeError("EXACT_USER_IDS_REQUIRED");
    return id;
  }))];
}
export function parseConfig(value: unknown): Config {
  const raw = object(value);
  keys(raw, ["schemaVersion", "cotreeUrl", "workspaceId", "tokenEnv", "feishu", "dingtalk"]);
  if (raw.schemaVersion !== 1) throw new BridgeError("CONFIG_VERSION_UNSUPPORTED");
  const origin = cotreeOrigin(raw.cotreeUrl);
  const config: Config = { schemaVersion: 1, cotreeUrl: origin, workspaceId: string(raw.workspaceId, "workspaceId"), tokenEnv: envName(raw.tokenEnv, "tokenEnv") };
  for (const platform of ["feishu", "dingtalk"] as const) {
    if (raw[platform] === undefined) continue;
    const channel = object(raw[platform]);
    keys(channel, ["appId", "secretEnv", "allowUsers", "allowChats", "requireMention", "botOpenId", "robotCode"]);
    if (channel.requireMention !== undefined && typeof channel.requireMention !== "boolean") throw new BridgeError("INVALID_CONFIG");
    config[platform] = {
      appId: string(channel.appId, `${platform}.appId`), secretEnv: envName(channel.secretEnv, "secretEnv"),
      allowUsers: ids(channel.allowUsers), allowChats: ids(channel.allowChats ?? []), requireMention: channel.requireMention !== false,
      ...(channel.botOpenId === undefined ? {} : { botOpenId: string(channel.botOpenId, "botOpenId") }),
      ...(channel.robotCode === undefined ? {} : { robotCode: string(channel.robotCode, "robotCode") })
    };
  }
  if (!config.feishu && !config.dingtalk) throw new BridgeError("NO_CHANNEL_CONFIGURED");
  return config;
}
export function cotreeOrigin(value: unknown): string {
  const url = new URL(string(value, "cotreeUrl", 2048));
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/"
    || !(url.protocol === "https:" || (url.protocol === "http:" && ["127.0.0.1", "[::1]", "localhost"].includes(url.hostname)))) {
    throw new BridgeError("INVALID_COTREE_URL", "Use an HTTPS origin or a local HTTP origin.");
  }
  return url.origin;
}
export function configPath(explicit?: string): string {
  return path.resolve(explicit ?? process.env.COTREE_MESSAGING_CONFIG ?? path.join(os.homedir(), ".cotree", "messaging", "config.json"));
}
export function readConfig(file: string): Config {
  if (!existsSync(file)) throw new BridgeError("CONFIG_REQUIRED", "Run bridge.cjs init, then edit the private config and secrets.env files.");
  return parseConfig(JSON.parse(readFileSync(file, "utf8")));
}
export function saveConfig(file: string, value: unknown): Config {
  const config = parseConfig(value);
  mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify(config, null, 2) + "\n", { mode: 0o600 });
  renameSync(temporary, file);
  return config;
}
export function readSecrets(file: string, config: Config, includePlatforms = true): Record<string, string> {
  const environment = readSecretValues(file);
  const output: Record<string, string> = {};
  for (const name of [config.tokenEnv, ...(includePlatforms ? [config.feishu?.secretEnv, config.dingtalk?.secretEnv] : [])].filter((item): item is string => Boolean(item))) {
    const secret = environment[name];
    if (!secret?.trim()) throw new BridgeError("SECRET_REQUIRED", `Set ${name} in private secrets.env or the process environment.`);
    output[name] = secret;
  }
  return output;
}
export function readSecretValues(file: string): Record<string, string> {
  const privateFile = path.join(path.dirname(file), "secrets.env"), managedFile = path.join(path.dirname(file), "credentials.json");
  const values = { ...(existsSync(privateFile) ? parseEnv(readFileSync(privateFile, "utf8")) : {}),
    ...(existsSync(managedFile) ? object(JSON.parse(readFileSync(managedFile, "utf8"))) : {}), ...process.env };
  return Object.fromEntries(Object.entries(values).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}
export function safeError(error: unknown): string {
  // Never include SDK errors, response bodies, URLs or arbitrary exception messages.
  return error instanceof BridgeError ? error.code : "TRANSPORT_OR_INTERNAL_ERROR";
}
