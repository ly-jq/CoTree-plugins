import assert from "node:assert/strict";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MessagingControl } from "../src/control.js";
import { Bridge } from "../src/bridge.js";

const root = path.resolve(fileURLToPath(new URL("../../../../", import.meta.url)));
const { chromium } = createRequire(path.join(root, "apps/desktop/package.json"))("playwright-core");
const artifacts = path.join(root, ".cotree/artifacts/feishu-dingtalk-plugin");
const build = JSON.parse(readFileSync(path.join(artifacts, "latest.json"), "utf8"));
const output = path.join(artifacts, `ui-verification-${Date.now()}`); mkdirSync(output, { recursive: true });
const file = path.join(output, "private/config.json");
const sent: string[] = [];
let feishuStatus: { state: string; lastError?: string } = { state: "connected" };
const bridge = new Bridge(file, platform => ({ platform, start: async () => {}, stop: async () => {},
  status: () => platform === "feishu" ? feishuStatus : { state: "connected" }, send: async (_target, text) => { sent.push(text); } }),
  () => ({ submit: async () => ({ inputId: "fixture-input", sessionId: "fixture-session" }),
    result: async () => ({ input: { state: { delivery: "consumed" } }, final: { eventId: "fixture-final", text: "已完成隔离测试任务" } }) }));
const control = new MessagingControl(file, bridge);
const uiRoot = path.join(build.directory, "ui");
const pluginVersion = JSON.parse(readFileSync(path.join(build.directory, "plugin.json"), "utf8")).version;
const originalFetch = globalThis.fetch;
let rejectBotLookup = false, blockBotLookup = false, releaseBotLookup: (() => void) | undefined;
// Exercise real control/transport code with synthetic Feishu responses, never a tenant.
globalThis.fetch = async (input, init) => {
  if (String(input) === "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal") {
    assert.deepEqual(JSON.parse(String(init?.body)), { app_id: "cli_fixture", app_secret: "synthetic-feishu-secret" });
    return Response.json({ code: 0, tenant_access_token: "synthetic-access-token" });
  }
  if (String(input) === "https://open.feishu.cn/open-apis/bot/v3/info") {
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer synthetic-access-token");
    if (blockBotLookup) await new Promise<void>(resolve => { releaseBotLookup = resolve; });
    return Response.json(rejectBotLookup ? { code: 10001, msg: "synthetic failure" } : { code: 0, bot: { open_id: "ou_bot" } });
  }
  assert.ok(String(input).startsWith("http://127.0.0.1:"), "Unexpected network destination in UI verification");
  return originalFetch(input, init);
};
const server = createServer((request, response) => {
  if (request.url?.startsWith("/v1/")) {
    if (request.headers.authorization !== "Bearer synthetic-ui-token") { response.writeHead(401).end(); return; }
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ ok: true, data: request.url.startsWith("/v1/workspaces") ? { workspaces: [{ workspaceId: "ui-workspace", name: "产品研发工作区" }] } : { schemaVersion: 1 } })); return;
  }
  const requested = request.url === "/" ? "/index.html" : (request.url ?? "/index.html").split("?")[0]!;
  if (requested === "/favicon.ico") { response.writeHead(204).end(); return; }
  const target = path.resolve(uiRoot, requested.replace(/^\/+/, ""));
  if (!target.startsWith(path.resolve(uiRoot) + path.sep)) { response.writeHead(403).end(); return; }
  try {
    response.setHeader("Content-Type", target.endsWith(".html") ? "text/html; charset=utf-8" : target.endsWith(".css") ? "text/css" : "text/javascript");
    response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'");
    response.end(readFileSync(target));
  } catch { response.writeHead(404).end(); }
});
await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
const address = server.address(); assert.ok(address && typeof address !== "string");
const url = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch({ channel: "msedge", headless: true });
const errors: string[] = [], checks: string[] = [], screenshots: string[] = [];
async function pageFor(theme: string, width: number) {
  const page = await browser.newPage({ viewport: { width, height: 1000 } });
  page.on("pageerror", (error: Error) => errors.push(error.message));
  page.on("console", (message: { type(): string; text(): string }) => { if (message.type() === "error") errors.push(message.text()); });
  await page.exposeFunction("messagingTestCall", (service: string, method: string, input: unknown) => {
    assert.equal(service, "messaging.bridge"); return control.call(method, input);
  });
  const context = { bridgeVersion: 2, pluginId: "cotree.feishu-dingtalk", pluginVersion, viewId: "cotree.feishu-dingtalk.panel", location: "desktop.surface.primary", visible: true, locale: "zh-CN", theme: { mode: theme, name: theme, designSystem: "cotree.plugin-ui.v1", density: "comfortable" } };
  await page.addInitScript({ content: `globalThis.cotreePluginView = { bridgeVersion: 2, getContext: async () => (${JSON.stringify(context)}), subscribeContext: () => "context", unsubscribeContext: () => {}, serviceCall: (service, method, input) => globalThis.messagingTestCall(service, method, input) };` });
  await page.goto(url, { waitUntil: "networkidle" });
  try { await page.waitForFunction(() => document.getElementById("service-state")?.textContent !== "正在读取配置", undefined, { timeout: 10000 }); }
  catch (error) { await page.screenshot({ path: path.join(output, "failure.png"), fullPage: true }); console.error(JSON.stringify({ errors, message: await page.locator("#feedback").textContent() })); throw error; }
  return page;
}
try {
  const page = await pageFor("light", 1280);
  await page.locator("#feishu-bot-get").click(); await page.waitForFunction(() => document.getElementById("feedback")?.textContent?.includes("请先填写飞书 App ID"));
  await page.locator("#feishu-app").fill("cli_fixture");
  await page.locator("#feishu-bot-get").click(); await page.waitForFunction(() => document.getElementById("feedback")?.textContent?.includes("此 App ID 对应的 App Secret"));
  checks.push("bot-lookup-missing-credentials-explained");
  await page.locator("#feishu-secret").fill("synthetic-feishu-secret");
  blockBotLookup = true; await page.locator("#feishu-bot-get").click();
  await page.waitForFunction(() => document.getElementById("feishu-bot-get")?.textContent === "获取中…");
  assert.equal(await page.locator("#feishu-bot-get").isDisabled(), true);
  assert.equal(await page.locator("#feishu-app").isDisabled(), true);
  assert.ok(releaseBotLookup); releaseBotLookup(); blockBotLookup = false;
  await page.waitForFunction(() => document.getElementById("feedback")?.textContent?.includes("机器人 Open ID 已自动填入"));
  assert.equal(await page.locator("#feishu-bot").inputValue(), "ou_bot");
  assert.equal(await page.locator("#feishu-secret").inputValue(), "synthetic-feishu-secret");
  assert.equal(existsSync(file), false); assert.equal(bridge.running, false);
  checks.push("automatic-bot-id-before-workspace-setup", "bot-lookup-busy-state", "lookup-does-not-save-or-start");
  await page.locator("#feishu-secret").fill("");
  await page.locator("#cotree-url").fill(url); await page.locator("#source-token").fill("synthetic-ui-token");
  await page.locator("#check").click(); await page.waitForFunction(() => (document.getElementById("workspace") as HTMLSelectElement).value === "ui-workspace");
  checks.push("authenticated-workspace-picker");
  await page.locator("#feishu-users").fill("ou_user");
  await page.locator("#start").click(); await page.waitForFunction(() => document.getElementById("feedback")?.textContent?.includes("凭据不完整"));
  assert.equal(bridge.running, false); checks.push("missing-secret-error-visible");
  await page.locator("#feishu-secret").fill("synthetic-feishu-secret");
  await page.locator("#dingtalk-enabled").check(); await page.locator("#dingtalk-app").fill("ding_fixture");
  await page.locator("#dingtalk-secret").fill("synthetic-dingtalk-secret"); await page.locator("#dingtalk-users").fill("employee001");
  await page.locator("#start").click(); await page.waitForFunction(() => document.getElementById("service-state")?.textContent === "服务运行中");
  assert.equal(bridge.running, true); assert.equal(await page.locator("#feishu-secret").inputValue(), "");
  assert.equal(await page.locator("#source-token").inputValue(), ""); assert.equal(await page.locator("#cotree-url").isDisabled(), true);
  assert.equal(await page.locator("#feishu-bot-get").isDisabled(), true);
  checks.push("save-and-start-from-panel", "secrets-cleared-after-save", "running-config-locked");
  feishuStatus = { state: "failed", lastError: "FEISHU_WS_FORBIDDEN" };
  await page.locator("#refresh").click(); await page.waitForFunction(() => document.getElementById("feishu-status")?.textContent === "连接失败");
  assert.equal(await page.locator("#feishu-error").isVisible(), true);
  assert.ok((await page.locator("#feishu-error").innerText()).includes("飞书拒绝建立长连接"));
  assert.ok((await page.locator("#service-detail").innerText()).includes("需要处理"));
  const failed = path.join(output, "panel-connection-failure.png"); await page.screenshot({ path: failed, fullPage: true }); screenshots.push(failed);
  feishuStatus = { state: "connected" };
  await page.locator("#refresh").click(); await page.waitForFunction(() => document.getElementById("feishu-status")?.textContent === "已连接");
  assert.equal(await page.locator("#feishu-error").isVisible(), false);
  checks.push("connection-failure-reason-visible-and-cleared-on-recovery");
  bridge.receive({ platform: "feishu", accountId: "cli_fixture", messageId: "ui-test", userId: "ou_user", chatId: "chat", kind: "direct", text: "隔离测试任务" });
  await bridge.pump(); await page.locator("#refresh").click(); await page.waitForFunction(() => document.getElementById("receipts")?.textContent?.includes("已回传"));
  assert.deepEqual(sent, ["已完成隔离测试任务"]); checks.push("delivery-state-visible");
  const light = path.join(output, "panel-light.png"); await page.screenshot({ path: light, fullPage: true }); screenshots.push(light);
  await page.close(); assert.equal(bridge.running, true); checks.push("closing-panel-does-not-stop-service");
  const dark = await pageFor("dark", 1280);
  assert.equal(await dark.locator("#feishu-app").inputValue(), "cli_fixture"); assert.equal(await dark.locator("#feishu-secret").inputValue(), "");
  assert.equal(await dark.locator("#service-state").innerText(), "服务运行中"); checks.push("reopen-restores-state-without-secret-echo");
  const darkPath = path.join(output, "panel-dark.png"); await dark.screenshot({ path: darkPath, fullPage: true }); screenshots.push(darkPath);
  await dark.locator("#stop").click(); await dark.waitForFunction(() => document.getElementById("service-state")?.textContent === "服务已停止");
  assert.equal(bridge.running, false); assert.equal(await dark.locator("#save").isDisabled(), false); checks.push("stop-from-panel");
  await dark.locator("#feishu-bot").fill("");
  await dark.locator("#feishu-bot-get").click(); await dark.waitForFunction(() => document.getElementById("feedback")?.textContent?.includes("机器人 Open ID 已自动填入"));
  assert.equal(await dark.locator("#feishu-bot").inputValue(), "ou_bot");
  assert.equal(await dark.locator("#feishu-secret").inputValue(), ""); checks.push("lookup-reuses-saved-secret-without-echo");
  rejectBotLookup = true;
  await dark.locator("#feishu-bot-get").click(); await dark.waitForFunction(() => document.getElementById("feedback")?.textContent?.includes("开启机器人能力并发布"));
  assert.equal(await dark.locator("#feishu-bot").inputValue(), "ou_bot");
  assert.equal(await dark.locator("#feishu-bot-get").isDisabled(), false); checks.push("lookup-failure-explained-and-existing-id-preserved");
  rejectBotLookup = false;
  await dark.locator("#feishu-bot-get").click(); await dark.waitForFunction(() => document.getElementById("feedback")?.textContent?.includes("机器人 Open ID 已自动填入"));
  await dark.setViewportSize({ width: 420, height: 900 });
  assert.equal(await dark.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
  const narrow = path.join(output, "panel-narrow.png"); await dark.screenshot({ path: narrow, fullPage: true }); screenshots.push(narrow);
  checks.push("light-dark-and-narrow-layouts");
  assert.deepEqual(errors, []);
} finally {
  releaseBotLookup?.();
  await browser.close(); await control.close(); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
  globalThis.fetch = originalFetch;
}
const report = { ok: true, artifact: build.archivePath, sha256: build.sha256, output, checks, screenshots, pageErrors: errors, transport: "public-View-SDK-to-real-control-with-synthetic-platform-adapters", realPlatformMessages: false };
writeFileSync(path.join(artifacts, "ui-verification.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
