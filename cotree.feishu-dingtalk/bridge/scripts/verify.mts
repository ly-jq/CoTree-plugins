import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as bundle } from "esbuild";
import { PluginServiceManager, createExtensionContributionSnapshot, grantPluginExecutionTrust, installPluginPackageSource, listPluginMcpServerRecords, setPluginEnabled, verifyAllPluginPackages } from "@cotree/agent-plugins";
import type { JsonValue } from "@cotree/agent-core";

const root = path.resolve(fileURLToPath(new URL("../../../../", import.meta.url)));
const artifacts = path.join(root, ".cotree", "artifacts", "feishu-dingtalk-plugin");
const build = JSON.parse(readFileSync(path.join(artifacts, "latest.json"), "utf8"));
const directory = path.join(artifacts, `verification-${Date.now()}`), workspace = path.join(directory, "workspace"), profile = path.join(directory, "profile");
mkdirSync(workspace, { recursive: true }); mkdirSync(profile, { recursive: true });
process.env.COTREE_HOME = path.join(directory, "home");
process.env.COTREE_STORAGE_MODE = "workspace";
process.env.COTREE_CONTROL_STATE_DIR = path.join(directory, "control");
// The child uses OS home discovery; keep synthetic credentials inside this fixture.
const homeVariable = process.platform === "win32" ? "USERPROFILE" : "HOME", originalHome = process.env[homeVariable];
process.env[homeVariable] = profile;
const options = { workspace, yes: true };
const installation = await installPluginPackageSource(build.archivePath, { ...options, state: "enabled" });
assert.equal(installation.verification.ok, true);
assert.ok(verifyAllPluginPackages(options).every(item => item.ok));
grantPluginExecutionTrust("cotree.feishu-dingtalk", { ...options, scope: "global", grantedBy: "isolated-plugin-verification", reason: "Validate this exact local test artifact in an isolated workspace." });
assert.equal(listPluginMcpServerRecords(options).length, 0);
const childScriptPath = path.join(directory, "host-service-child.mjs");
await bundle({ entryPoints: [path.join(root, "packages/plugins/src/host-service-child.ts")], outfile: childScriptPath, bundle: true, platform: "node", format: "esm", target: "node22" });
const manager = new PluginServiceManager({ ...options, childScriptPath, startupTimeoutMs: 15000, defaultCallTimeoutMs: 60000 });
const checks = ["zip-installed", "integrity-verified", "no-competing-mcp-entry"];
const contributions = createExtensionContributionSnapshot({ ...options, host: "desktop" });
assert.ok(contributions.views.some(view => view.pluginId === "cotree.feishu-dingtalk" && view.status === "active" && view.custom));
assert.ok(contributions.placements.some(placement => placement.pluginId === "cotree.feishu-dingtalk" && placement.status === "active" && placement.location === "desktop.sidebar.primary"));
assert.ok(contributions.placements.some(placement => placement.pluginId === "cotree.feishu-dingtalk" && placement.status === "active" && placement.location === "desktop.commandPalette"));
checks.push("active-custom-view-and-ui-entrypoints");
const server = createServer((request, response) => {
  assert.equal(request.headers.authorization, "Bearer synthetic-source-token");
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify({ ok: true, data: request.url?.startsWith("/v1/workspaces") ? { workspaces: [{ workspaceId: "fixture", displayName: "隔离工作区" }] } : { schemaVersion: 1 } }));
});
await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
const address = server.address(); assert.ok(address && typeof address !== "string");
const config = { schemaVersion: 1, cotreeUrl: `http://127.0.0.1:${address.port}`, workspaceId: "fixture", tokenEnv: "COTREE_INPUT_TOKEN",
  feishu: { appId: "synthetic-app", secretEnv: "FEISHU_APP_SECRET", allowUsers: ["synthetic-user"], allowChats: [] } };
const call = (method: string, input: JsonValue = {}) => manager.call({ pluginId: "cotree.feishu-dingtalk", serviceId: "messaging.bridge", method, input }) as Promise<{ ok: boolean; code?: string; data?: any }>;
try {
  const first = await call("panel.state"); assert.equal(first.ok, true, JSON.stringify(first)); assert.equal(first.data.config, null);
  checks.push("supervised-native-worker-started", "fresh-panel-state");
  assert.deepEqual(await call("feishu.bot-info"), { ok: false, code: "FEISHU_APP_ID_REQUIRED" });
  assert.deepEqual(await call("feishu.bot-info", { appId: "synthetic-app" }), { ok: false, code: "FEISHU_APP_SECRET_REQUIRED" });
  checks.push("supervised-bot-lookup-validates-before-network");
  const saved = await call("config.save", { config, credentials: { sourceToken: "synthetic-source-token" } });
  assert.equal(saved.ok, true); assert.equal(saved.data.credentials.sourceToken, true);
  assert.ok(path.resolve(saved.data.status.configPath).startsWith(path.resolve(profile) + path.sep));
  assert.ok(!JSON.stringify(saved).includes("synthetic-source-token")); checks.push("private-credential-save-no-echo");
  const loaded = await call("panel.state"); assert.equal(loaded.data.config.workspaceId, "fixture"); assert.equal(loaded.data.credentials.sourceToken, true);
  checks.push("configuration-survives-worker-restart");
  const connection = await call("connection.check"); assert.equal(connection.ok, true); assert.equal(connection.data.workspaces[0].workspaceId, "fixture");
  checks.push("authenticated-http-workspace-discovery");
  const failed = await call("messaging_start"); assert.equal(failed.ok, false); assert.equal(failed.code, "SECRET_REQUIRED");
  checks.push("missing-platform-secret-refuses-start-without-network");
  assert.equal((await call("messaging_stop")).ok, true); checks.push("stop-idempotent");
  setPluginEnabled("cotree.feishu-dingtalk", "disabled", options); await manager.reconcile();
  assert.equal(manager.state("cotree.feishu-dingtalk", "messaging.bridge"), "stopped");
  await assert.rejects(call("panel.state")); checks.push("disabled-service-unavailable");
} finally {
  await manager.dispose(); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
  if (originalHome === undefined) delete process.env[homeVariable]; else process.env[homeVariable] = originalHome;
}
const report = { ok: true, archivePath: build.archivePath, sha256: build.sha256, directory, checks,
  realPlatforms: "not-tested-no-credentials", providerCalls: false, userConfigurationModified: false };
writeFileSync(path.join(artifacts, "verification.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
