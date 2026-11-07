import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { Bridge } from "./bridge.js";
import { createAdapter } from "./adapters.js";
import { BridgeError, configPath, readConfig, readSecrets, safeError } from "./config.js";
import { CoTreeClient } from "./cotree-client.js";
import { runMcp } from "./mcp.js";
import { runControlWorker } from "./control-worker.js";

async function main() {
  const { values, positionals } = parseArgs({ options: { config: { type: "string" } }, allowPositionals: true });
  const command = positionals[0] ?? "mcp", file = configPath(values.config);
  if (positionals.length > 1) throw new BridgeError("INVALID_ARGUMENTS");
  if (command === "control") { await runControlWorker(); return; }
  if (command === "mcp") { await runMcp(file); return; }
  if (command === "init") {
    mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    const example = { schemaVersion: 1, cotreeUrl: "http://127.0.0.1:19191", workspaceId: "REPLACE_WORKSPACE_ID", tokenEnv: "COTREE_INPUT_TOKEN",
      feishu: { appId: "REPLACE_FEISHU_APP_ID", secretEnv: "FEISHU_APP_SECRET", allowUsers: [], allowChats: [], requireMention: true, botOpenId: "REPLACE_BOT_OPEN_ID" },
      dingtalk: { appId: "REPLACE_DINGTALK_CLIENT_ID", secretEnv: "DINGTALK_CLIENT_SECRET", allowUsers: [], allowChats: [], requireMention: true } };
    if (!existsSync(file)) writeFileSync(file, JSON.stringify(example, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    const secretFile = path.join(path.dirname(file), "secrets.env");
    if (!existsSync(secretFile)) writeFileSync(secretFile, "# Private credentials. Never paste into chat or commit.\nCOTREE_INPUT_TOKEN=\nFEISHU_APP_SECRET=\nDINGTALK_CLIENT_SECRET=\n", { flag: "wx", mode: 0o600 });
    process.stdout.write(JSON.stringify({ configPath: file, secretsPath: secretFile }) + "\n"); return;
  }
  if (command === "check" || command === "workspaces") {
    const config = readConfig(file), secrets = readSecrets(file, config, command === "check");
    const client = new CoTreeClient(config, secrets[config.tokenEnv]!);
    const result = command === "workspaces" ? await client.workspaces(new AbortController().signal)
      : await client.request("/v1/capabilities", new AbortController().signal);
    process.stdout.write(JSON.stringify({ ok: true, data: result }) + "\n"); return;
  }
  if (command !== "run") throw new BridgeError("INVALID_ARGUMENTS", "Usage: bridge.cjs init|check|workspaces|mcp|run [--config PATH]");
  const bridge = new Bridge(file, createAdapter);
  await bridge.start();
  process.stderr.write(JSON.stringify({ event: "bridge_started", configPath: file }) + "\n");
  const close = () => { void bridge.stop().then(() => { process.exitCode = 0; }); };
  process.once("SIGINT", close); process.once("SIGTERM", close);
}
void main().catch(error => {
  process.stderr.write(JSON.stringify({ code: safeError(error), ...(error instanceof BridgeError ? { message: error.message } : {}) }) + "\n");
  process.exitCode = 1;
});
