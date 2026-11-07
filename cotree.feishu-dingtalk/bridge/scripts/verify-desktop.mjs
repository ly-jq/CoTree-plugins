import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { parseArgs } from "node:util";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const require = createRequire(path.join(root, "apps/desktop/package.json"));
const { _electron: electron } = require("playwright-core");
const { values } = parseArgs({ options: { executable: { type: "string" }, archive: { type: "string" }, "upgrade-from": { type: "string" }, "cross-workspace": { type: "boolean" }, recovery: { type: "string" } } });
assert.ok(values.executable, "Pass --executable with an installed packaged Desktop executable.");
assert.ok(!values.recovery || values.recovery === "restart", "--recovery must be restart.");
assert.ok(!values.recovery || values["cross-workspace"], "Recovery requires --cross-workspace.");
assert.ok(!values["upgrade-from"] || (values["cross-workspace"] && !values.recovery), "Upgrade verification requires --cross-workspace without recovery.");
const artifacts = path.join(root, ".cotree/artifacts/feishu-dingtalk-plugin");
const archive = path.resolve(values.archive ?? JSON.parse(readFileSync(path.join(artifacts, "latest.json"), "utf8")).archivePath);
const directory = path.join(artifacts, `desktop-verification-${Date.now()}`);
const workspace = path.join(directory, "workspace"), home = path.join(directory, "home"), profile = path.join(directory, "profile");
for (const dir of [workspace, home, profile]) mkdirSync(dir, { recursive: true });
writeFileSync(path.join(profile, "input-access.json"), JSON.stringify({ schemaVersion: 2, settings: { enabled: false } }));
writeFileSync(path.join(profile, "companion.json"), JSON.stringify({ background: false, closeToTray: false, minimizeToTray: false, island: false, ideIntegration: false }));
const env = {};
for (const key of ["SystemRoot", "WINDIR", "COMSPEC", "PATHEXT", "PATH", "Path", "TEMP", "TMP", "DISPLAY", "WAYLAND_DISPLAY", "XDG_RUNTIME_DIR"]) if (process.env[key]) env[key] = process.env[key];
Object.assign(env, { HOME: home, USERPROFILE: home, APPDATA: path.join(home, "roaming"), LOCALAPPDATA: path.join(home, "local"), COTREE_HOME: home,
  COTREE_STORAGE_MODE: "workspace", COTREE_CONTROL_STATE_DIR: path.join(home, "control"), COTREE_KERNEL_WORKSPACE: workspace, COTREE_DESKTOP_DEV_SERVER: "" });
const hash = file => createHash("sha256").update(readFileSync(file)).digest("hex");
const report = { ok: false, archive, archiveSha256: hash(archive), directory, checks: [], errors: [], userConfigurationModified: false };
let app, page;
async function launch() {
  app = await electron.launch({ executablePath: path.resolve(values.executable), args: [`--user-data-dir=${profile}`], cwd: path.dirname(values.executable), env, timeout: 60000 });
  const identity = await app.evaluate(({ app }) => ({ packaged: app.isPackaged, version: app.getVersion(), appPath: app.getAppPath(), resources: process.resourcesPath }));
  assert.equal(identity.packaged, true);
  report.desktop = { ...identity, asarSha256: hash(identity.appPath), bridge: JSON.parse(readFileSync(path.join(identity.resources, "kernel-bridge/runtime/bundle-manifest.json"), "utf8")).buildId };
  page = await app.firstWindow();
  page.on("pageerror", error => report.errors.push(error.message));
  await page.locator('[data-window-shell="agent"]').waitFor({ timeout: 60000 });
  await (await app.browserWindow(page)).evaluate(win => win.setBounds({ width: 1440, height: 1000 }));
}
async function openFromMenu() {
  if (values["cross-workspace"]) await page.getByRole("button", { name: "选择工作区 other-workspace", exact: true }).click();
  await page.locator("[data-loaded-plugins-menu]").click();
  await page.locator('[data-plugin-open="cotree.feishu-dingtalk"]').click({ timeout: 15000 });
}
try {
  await launch();
  let connection = await page.evaluate(workspace => window.cotreeDesktop.kernelBridge.getConnection(workspace), workspace);
  assert.equal(connection.ok, true);
  const api = async (route, body, method = body === undefined ? "GET" : "POST") => {
    const response = await fetch(`${connection.url}/w/${encodeURIComponent(connection.workspace)}/registry/plugins${route}`, {
      method, headers: { authorization: `Bearer ${connection.token}`, "content-type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(60000) });
    const result = await response.json(); assert.equal(result.ok, true, JSON.stringify(result.error)); return result.data;
  };
  await api("/contributions");
  if (values["cross-workspace"]) {
    const otherWorkspace = path.join(directory, "other-workspace"); mkdirSync(otherWorkspace);
    connection = await page.evaluate(workspace => window.cotreeDesktop.kernelBridge.getConnection(workspace), otherWorkspace);
  }
  const initialArchive = path.resolve(values["upgrade-from"] ?? archive);
  report.initialArchive = { path: initialArchive, sha256: hash(initialArchive) };
  await api("/import", { source: initialArchive, scope: "global" });
  const imported = await api("/contributions");
  assert.ok(!imported.views.some(view => view.pluginId === "cotree.feishu-dingtalk" && view.status === "active"));
  report.checks.push("import-disabled");
  await api("/cotree.feishu-dingtalk/enabled", { enabled: true, permissionConsent: ["nativeExecutables:messaging-node", "services:messaging.bridge", "ui.customViews"] });
  const snapshot = await api("/contributions");
  report.contributions = { views: snapshot.views.filter(view => view.pluginId === "cotree.feishu-dingtalk"), diagnostics: snapshot.diagnostics.filter(item => item.pluginId === "cotree.feishu-dingtalk") };
  console.log(JSON.stringify(report.contributions, null, 2));
  if (values["cross-workspace"]) {
    connection = await page.evaluate(workspace => window.cotreeDesktop.kernelBridge.getConnection(workspace), workspace);
    const commonSnapshot = await api("/contributions");
    report.commonContributions = { views: commonSnapshot.views.filter(view => view.pluginId === "cotree.feishu-dingtalk"), diagnostics: commonSnapshot.diagnostics.filter(item => item.pluginId === "cotree.feishu-dingtalk") };
    console.log(JSON.stringify(report.commonContributions, null, 2));
    // Fixture-only workspace selection. Neither transport nor contribution data is mocked.
    await page.evaluate(otherWorkspace => {
      const key = "cotree.agentWorkbench.v1", doc = JSON.parse(localStorage.getItem(key));
      const id = "workspace-plugin-verification";
      doc.workspaces[id] = { id, name: "other-workspace", pathLabel: otherWorkspace, updatedAt: new Date().toISOString() };
      doc.drafts[id] = ""; doc.activeWorkspaceId = id; doc.activeTaskId = null;
      doc.expandedWorkspaceIds.push(id);
      localStorage.setItem(key, JSON.stringify(doc));
    }, path.join(directory, "other-workspace"));
    await page.reload();
    await page.locator('[data-window-shell="agent"]').waitFor({ timeout: 30000 });
    if (values.recovery) {
      assert.equal(report.commonContributions.views[0]?.status, "disabled", "Recovery fixture expects the existing cross-workspace bug.");
      await openFromMenu();
      await page.getByText("扩展视图不可用：cotree.feishu-dingtalk.panel", { exact: true }).waitFor({ timeout: 15000 });
      await page.screenshot({ path: path.join(directory, "before-recovery.png") });
      report.checks.push("cross-workspace-unavailable-toast-reproduced");
      await app.close(); app = undefined;
      await launch();
      connection = await page.evaluate(workspace => window.cotreeDesktop.kernelBridge.getConnection(workspace), workspace);
      const recovered = await api("/contributions");
      assert.equal(recovered.views.find(view => view.pluginId === "cotree.feishu-dingtalk")?.status, "active");
      report.checks.push(`common-workspace-recovered-by-${values.recovery}`);
    } else {
      assert.equal(report.commonContributions.views[0]?.status, "active", "Global enable did not refresh the already-open common workspace.");
    }
  }
  await openFromMenu();
  await page.locator('[data-plugin-view-panel="desktop.surface.primary"]').waitFor({ timeout: 15000 });
  report.checks.push("renderer-opens-panel");
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    report.panel = await app.evaluate(async ({ webContents }) => {
      const view = webContents.getAllWebContents().find(w => w.getURL().includes("cotree.feishu-dingtalk") && w.getURL().endsWith("/ui/index.html"));
      return view ? { id: view.id, text: await view.executeJavaScript("document.body.innerText"), ready: await view.executeJavaScript("!!document.querySelector('#refresh') && !document.querySelector('#refresh').disabled") } : null;
    });
    if (report.panel?.ready) break;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert.ok(report.panel?.ready, "Custom View did not finish its real service initialization.");
  assert.ok(!report.panel.text.includes("操作失败"), report.panel.text);
  report.checks.push("native-webcontents-and-service-initialized");
  if (values["upgrade-from"]) {
    const oldId = report.panel.id;
    const pid = app.process().pid;
    connection = await page.evaluate(workspace => window.cotreeDesktop.kernelBridge.getConnection(workspace), path.join(directory, "other-workspace"));
    const installed = await api("/import", { source: archive, scope: "global" });
    await api("/cotree.feishu-dingtalk/enabled", { enabled: true, version: installed.version });
    connection = await page.evaluate(workspace => window.cotreeDesktop.kernelBridge.getConnection(workspace), workspace);
    const upgraded = await api("/contributions");
    assert.ok(upgraded.views.some(view => view.pluginId === "cotree.feishu-dingtalk" && view.pluginVersion === installed.version && view.status === "active"));
    // Import deliberately disables a package. Reopen through the normal menu if
    // the panel observed that transition; never reload the renderer or restart.
    if (!await page.locator('[data-plugin-view-panel="desktop.surface.primary"]').isVisible()) await openFromMenu();
    const readyDeadline = Date.now() + 30000;
    while (Date.now() < readyDeadline) {
      report.panel = await app.evaluate(async ({ webContents }, version) => {
        const view = webContents.getAllWebContents().find(w => w.getURL().includes(`cotree.feishu-dingtalk/versions/${version}/`) && w.getURL().endsWith("/ui/index.html"));
        return view ? { id: view.id, text: await view.executeJavaScript("document.body.innerText"), ready: await view.executeJavaScript("!!document.querySelector('#refresh') && !document.querySelector('#refresh').disabled") } : null;
      }, installed.version);
      if (report.panel?.ready) break;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    assert.ok(report.panel?.ready, "Upgraded native panel did not initialize.");
    assert.ok(!report.panel.text.includes("操作失败"), report.panel.text);
    assert.equal(await app.evaluate(({ webContents }, id) => !!webContents.fromId(id), oldId), false, "Superseded renderer was retained.");
    assert.equal(app.process().pid, pid);
    report.checks.push("cross-workspace-live-upgrade", "superseded-native-renderer-disposed", "upgrade-without-renderer-reload-or-app-restart");
  }
  const panelScript = source => app.evaluate(({ webContents }, { id, source }) => webContents.fromId(id).executeJavaScript(source), { id: report.panel.id, source });
  const waitForFeedback = async expected => {
    const timeout = Date.now() + 15000;
    while (Date.now() < timeout) {
      const feedback = await panelScript("({ text: document.querySelector('#feedback').textContent, busy: document.querySelector('#configuration').disabled })");
      if (!feedback.busy && feedback.text.includes(expected)) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.fail(`Bot lookup did not display: ${expected}`);
  };
  // Actual UI -> public SDK -> packaged service -> native worker, without tenant credentials.
  await panelScript("document.querySelector('#feishu-bot-get').click()");
  await waitForFeedback("请先填写飞书 App ID");
  await panelScript("document.querySelector('#feishu-app').value = 'cli_fixture'; document.querySelector('#feishu-bot-get').click()");
  await waitForFeedback("此 App ID 对应的 App Secret");
  assert.equal(await panelScript("document.querySelector('#feishu-bot').value"), "");
  assert.equal(await panelScript("document.querySelector('#feishu-secret').value"), "");
  report.checks.push("bot-lookup-button-reaches-native-worker", "bot-lookup-validation-visible-without-network");
  await panelScript("document.querySelector('#feishu-app').value = ''; document.querySelector('#feedback').hidden = true");
  report.mount = await app.evaluate(({ BrowserWindow }, id) => {
    for (const win of BrowserWindow.getAllWindows()) {
      const child = win.contentView.children.find(child => child.webContents?.id === id);
      if (child) return { bounds: child.getBounds(), visible: child.getVisible() };
    }
    return null;
  }, report.panel.id);
  assert.equal(report.mount?.visible, true, "Native panel was loaded but never made visible.");
  assert.ok(report.mount.bounds.width > 400 && report.mount.bounds.height > 300);
  report.webContents = await app.evaluate(({ webContents }) => webContents.getAllWebContents().map(w => ({ id: w.id, url: w.getURL() })));
  // A renderer-only Playwright screenshot excludes native WebContentsView overlays.
  const nativeScreenshot = await app.evaluate(async ({ webContents }, id) => (await webContents.fromId(id).capturePage()).toPNG().toString("base64"), report.panel.id);
  writeFileSync(path.join(directory, "panel.png"), Buffer.from(nativeScreenshot, "base64"));
  report.checks.push("native-panel-visible-and-captured");
  if (values["upgrade-from"]) {
    const common = connection;
    const project = await page.evaluate(workspace => window.cotreeDesktop.kernelBridge.getConnection(workspace), path.join(directory, "other-workspace"));
    connection = project;
    await api("/cotree.feishu-dingtalk/enabled", { enabled: false });
    connection = common;
    assert.ok(!(await api("/contributions")).views.some(view => view.pluginId === "cotree.feishu-dingtalk" && view.status === "active"));
    await page.locator('[data-plugin-view-panel="desktop.surface.primary"]').waitFor({ state: "hidden", timeout: 15000 });
    connection = project;
    await api("/cotree.feishu-dingtalk/enabled", { enabled: true });
    await openFromMenu();
    await page.locator('[data-plugin-view-panel="desktop.surface.primary"]').waitFor({ timeout: 15000 });
    connection = common;
    assert.ok((await api("/contributions")).views.some(view => view.pluginId === "cotree.feishu-dingtalk" && view.status === "active"));
    connection = project;
    await api("/cotree.feishu-dingtalk", undefined, "DELETE");
    connection = common;
    assert.ok(!(await api("/contributions")).views.some(view => view.pluginId === "cotree.feishu-dingtalk"));
    await page.locator('[data-plugin-view-panel="desktop.surface.primary"]').waitFor({ state: "hidden", timeout: 15000 });
    report.checks.push("cross-workspace-disable-reenable-uninstall");
  }
  assert.deepEqual(report.errors, []);
  report.ok = true;
} catch (error) {
  report.error = error.message;
  if (page) { report.toasts = await page.locator("[data-sonner-toast]").allTextContents().catch(() => []); await page.screenshot({ path: path.join(directory, "failure.png") }).catch(() => {}); }
  process.exitCode = 1;
} finally {
  if (app) await app.close();
  writeFileSync(path.join(directory, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
