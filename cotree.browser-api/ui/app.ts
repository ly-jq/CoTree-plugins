/// <reference lib="dom" />
import { createPluginViewClient, applyPluginViewAppearance } from "../../../packages/plugin-sdk/src/ui.js";
import type { PluginJsonValue } from "../../../packages/plugin-sdk/src/index.js";
import { browserApiAgentPrompt } from "./agent-prompt.js";
import { createWorkflowPanel } from "./workflows.js";
import "@cotree/plugin-sdk/theme.css";
import "./style.css";

type Entry = { id: string; name: string; description: string; method: string; origin: string; url: string; favorite: boolean; headers: Record<string, string>; body?: unknown; seen: number; replayable: boolean };
type Summary = Pick<Entry, "id" | "name" | "method" | "origin" | "favorite" | "replayable">;
type Receipt = { ok?: boolean; status?: number | null; authRequired?: boolean; redirectBlocked?: boolean; effect?: string };
const view = createPluginViewClient();
const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const field = (id: string) => el<HTMLInputElement>(id);
let entries: Summary[] = [], selected: Entry | undefined, dirty = false, busy = false;
let profile = "managed", recording = false, ready = false, visible = false;
let profiles = ["managed"];
let guidePreference: boolean | undefined, lastHandoff = "";
function notice(message: string, error = false) { el("notice").textContent = message; el("notice").dataset.error = String(error); }
async function command<T = unknown>(input: Record<string, unknown>): Promise<T> {
  let result: PluginJsonValue = await view.commands.execute("cotree.browser-api.manage", JSON.parse(JSON.stringify({ profile, ...input })) as PluginJsonValue);
  for (let i = 0; i < 5; i++) {
    if (!result || typeof result !== "object" || Array.isArray(result) || result.effect !== undefined) break;
    if (result.ok === false && result.output === undefined) {
      const error = result.error;
      throw new Error(String(error && typeof error === "object" && !Array.isArray(error) ? error.message || result.summary || "操作失败" : result.summary || "操作失败"));
    }
    if (result.output !== undefined) result = result.output;
    else if (result.result !== undefined) result = result.result;
    else break;
  }
  return result as T;
}
function handoffKey() { return JSON.stringify([profile, selected?.id, field("objective").value.trim()]); }
function updateControls() {
  document.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("button,input,textarea,select").forEach(control => { if (!control.closest("#workflows")) control.disabled = busy; });
  el<HTMLButtonElement>("create-environment").disabled = busy || !ready || !field("environment-input").value.trim();
  const reusable = !!selected?.favorite && selected.replayable && !dirty;
  el<HTMLButtonElement>("call").disabled = busy || !reusable;
  el<HTMLButtonElement>("agent").disabled = busy || !reusable || !field("objective").value.trim() || lastHandoff === handoffKey();
  el<HTMLButtonElement>("save").disabled = busy || !dirty;
  field("recording").checked = recording;
  el("recording-label").textContent = !ready ? "连接中…" : recording ? "正在自动记录" : "已暂停记录";
  field("recording").disabled = busy || !ready;
  const reason = !selected?.replayable ? "该请求仅可查看，上传或二进制接口暂不能直接复用。" : dirty ? "有未保存的修改，请先保存定义。" : !selected.favorite ? "勾选收藏并保存后，即可交给 Agent 或手动调用。" : "已可复用 · 浏览器会附带当前登录态。";
  el("request-note").textContent = reason;
  el("agent-note").textContent = lastHandoff === handoffKey() ? "已填入对话草稿。请检查并发送，Agent 才会执行。" : "填入接口引用和任务目标，保留原草稿；由你确认后发送。";
}
async function run(action: () => Promise<void>) {
  if (busy) return;
  busy = true; updateControls();
  try { await action(); } catch (error) { notice(error instanceof Error ? error.message : String(error), true); }
  finally { busy = false; updateControls(); }
}
function setGuide(open: boolean) {
  el("guide").hidden = !open;
  el("help").setAttribute("aria-expanded", String(open));
}
function showDirectory() {
  document.body.classList.remove("detail-mode");
  selected = undefined; dirty = false; lastHandoff = "";
  el("editor").hidden = true; el("directory").hidden = false;
  field("objective").value = "";
  updateControls();
}
function choose(entry: Entry) {
  document.body.classList.add("detail-mode");
  const changed = selected?.id !== entry.id;
  selected = entry; dirty = false;
  el("directory").hidden = true; el("editor").hidden = false;
  for (const key of ["name", "description", "url"] as const) field(key).value = entry[key] || "";
  field("headers").value = JSON.stringify(entry.headers || {}, null, 2);
  field("body").value = entry.body === undefined ? "" : JSON.stringify(entry.body, null, 2);
  field("favorite").checked = entry.favorite;
  el("method").textContent = entry.method; el("origin").textContent = entry.origin;
  el("seen").textContent = `记录 ${entry.seen} 次`;
  if (changed) {
    field("objective").value = ""; lastHandoff = "";
    el<HTMLDetailsElement>("advanced").open = false;
    el("result").textContent = "尚未调用接口。";
  }
  updateControls();
}
function renderList() {
  el("list").replaceChildren(); el("count").textContent = `${entries.length} 个`; el("empty").hidden = entries.length > 0;
  const filtered = !!field("search").value.trim() || field("favorites").checked;
  el("empty-title").textContent = filtered ? "没有符合筛选条件的接口" : recording ? "还没有记录到接口" : "自动记录已暂停";
  el("empty-note").textContent = filtered ? "清空搜索或取消“只看收藏”后再查看。" : recording ? "在内置浏览器操作网站后刷新。查询、筛选或翻页更容易产生接口请求；静态页面可能不会产生可记录请求。" : "打开上方自动记录开关，再操作网站。已有接口和登录态会保留。";
  setGuide(guidePreference ?? (entries.length === 0 && !filtered));
  for (const entry of entries) {
    const button = document.createElement("button"); button.className = "entry";
    const title = document.createElement("strong"); title.textContent = `${entry.favorite ? "已收藏 · " : ""}${entry.name}`;
    const detail = document.createElement("small"); detail.textContent = `${entry.method} · ${entry.origin}${entry.replayable ? "" : " · 仅记录"}`;
    button.append(title, detail);
    button.onclick = () => void run(async () => { choose(await command<Entry>({ action: "get", id: entry.id })); notice(""); });
    el("list").append(button);
  }
}
async function refresh() {
  const status = await command<{ recording: boolean; persistent: boolean; storageError?: string; profiles: string[] }>({ action: "status" });
  recording = status.recording; ready = true;
  profiles = [...new Set(["managed", ...(status.profiles || []), profile])];
  renderEnvironments();
  el("storage").textContent = status.persistent ? "跨工作目录共享 · 加密保存" : "仅当前运行保存";
  if (status.storageError) notice(status.storageError, true);
  const list = await command<{ entries: Summary[] }>({ action: "list", search: field("search").value, favoritesOnly: field("favorites").checked });
  entries = list.entries || []; renderList();
}
function environmentLabel(value: string) { return value === "managed" ? "默认浏览器" : value; }
function renderEnvironments() {
  el("environment-name").textContent = environmentLabel(profile);
  const select = el<HTMLSelectElement>("profile");
  select.replaceChildren(...profiles.map(value => {
    const option = document.createElement("option"); option.value = value; option.textContent = environmentLabel(value); return option;
  }));
  select.value = profile;
}
async function openEnvironment(next: string) {
  if (dirty && !confirm("当前修改尚未保存，切换浏览器环境？")) { renderEnvironments(); return; }
  // Commit the selection only after the owning Desktop has opened that session.
  // A failed host action keeps the previous environment and its API records.
  try { await view.commands.execute("cotree.browser-api.browser", { profile: next }); }
  catch (error) { renderEnvironments(); throw error; }
  profile = next; profiles = [...new Set([...profiles, next])]; renderEnvironments();
  entries = []; showDirectory(); renderList(); await refresh();
  notice(`已打开${environmentLabel(profile)}。请在该浏览器登录并操作网站，再返回查看接口。`);
}
el("refresh").onclick = () => void run(async () => { notice(""); await refresh(); });
el("help").onclick = () => {
  if (selected && dirty && !confirm("当前修改尚未保存，返回使用指南？")) return;
  const fromDetail = !!selected;
  showDirectory(); guidePreference = fromDetail || el("guide").hidden; setGuide(guidePreference);
};
el("back").onclick = () => {
  if (dirty && !confirm("当前修改尚未保存，返回目录？")) return;
  showDirectory(); notice("");
};
el("open-browser").onclick = () => void run(async () => {
  await view.commands.execute("cotree.browser-api.browser", { profile });
});
for (const id of ["search", "favorites"]) field(id).onchange = () => void run(refresh);
el<HTMLSelectElement>("profile").onchange = () => void run(async () => {
  const next = el<HTMLSelectElement>("profile").value;
  if (!profiles.includes(next)) { renderEnvironments(); throw new Error("请选择已有浏览器环境。"); }
  await openEnvironment(next);
});
field("environment-input").oninput = updateControls;
el("create-environment").onclick = () => void run(async () => {
  const next = field("environment-input").value.trim();
  if (!next || next.length > 64 || /[\u0000-\u001f\u007f]/.test(next) || ["__proto__", "constructor", "prototype"].includes(next)) throw new Error("请输入 1–64 个字符的环境名称。");
  if (profiles.includes(next)) throw new Error("该环境已存在，请从上方列表选择。");
  await openEnvironment(next);
  field("environment-input").value = ""; el<HTMLDetailsElement>("new-environment").open = false;
});
field("recording").onchange = () => {
  const next = field("recording").checked;
  void run(async () => {
    const result = await command<{ recording: boolean }>({ action: "configure", recording: next });
    recording = result.recording; renderList();
    notice(recording ? "已开启自动记录。操作网站后，回到此面板刷新目录。" : "已暂停记录，已有接口仍可使用。");
  });
};
for (const id of ["name", "description", "url", "headers", "body", "favorite"]) field(id).oninput = () => { dirty = true; lastHandoff = ""; updateControls(); };
field("objective").oninput = updateControls;
el("save").onclick = () => void run(async () => {
  if (!selected) return;
  const patch = { name: field("name").value, description: field("description").value, url: field("url").value,
    headers: JSON.parse(field("headers").value || "{}"), ...(field("body").value ? { body: JSON.parse(field("body").value) } : {}), favorite: field("favorite").checked };
  choose(await command<Entry>({ action: "update", id: selected.id, patch })); await refresh(); notice("接口定义已保存，所有工作目录均可使用。");
});
el("agent").onclick = () => void run(async () => {
  if (!selected || dirty || !selected.favorite || !selected.replayable) return;
  const text = browserApiAgentPrompt(profile, selected.id, field("objective").value);
  await view.commands.execute("cotree.browser-api.agent", { text });
  lastHandoff = handoffKey();
  notice("已填入当前对话草稿，请检查任务目标后发送。");
});
el("delete").onclick = () => void run(async () => {
  if (!selected || !confirm(`删除接口“${selected.name}”？浏览器登录态不受影响。`)) return;
  await command({ action: "delete", id: selected.id }); showDirectory(); await refresh(); notice("接口已删除。");
});
el("call").onclick = () => void run(async () => {
  if (!selected || dirty || !selected.favorite || !selected.replayable) return;
  if (!["GET", "HEAD"].includes(selected.method) && !confirm(`执行 ${selected.method} ${selected.name}？这可能修改网站数据。`)) return;
  const result = await command<Receipt>({ action: "call", id: selected.id, operationId: crypto.randomUUID() });
  el("result").textContent = JSON.stringify(result, null, 2);
  notice(result.authRequired ? "登录已失效，请在内置浏览器重新登录后再使用。" : result.redirectBlocked ? "已阻止接口跳转，请在浏览器检查登录或目标地址。" : result.effect === "unknown" ? "请求结果未知，请先核对网站状态，不要重复提交。" : result.ok ? "接口调用完成。" : `接口返回 HTTP ${result.status}。`, !result.ok);
});
function contextChanged(context: Parameters<typeof applyPluginViewAppearance>[0]) {
  applyPluginViewAppearance(context);
  const returning = context.visible && !visible; visible = context.visible;
  workflows.setHostVisible(context.visible);
  workflows.setHandoffSupported(context.hostActions?.version === 1 && context.hostActions.kinds.includes("composer.attach"));
  if (returning && ready && !busy && !workflows.isShown()) void run(refresh);
  if (returning) workflows.refreshOnReturn();
}
const workflows = createWorkflowPanel({ root: el("workflows"), command, notice, host: async <T>(id: string, input?: Record<string, unknown>) => await view.commands.execute(id, input as PluginJsonValue) as T });
el("show-workflows").onclick = () => { document.body.classList.add("workflow-mode"); el("api-sections").hidden = true; el("show-workflows").setAttribute("aria-pressed", "true"); el("show-apis").setAttribute("aria-pressed", "false"); void workflows.show(true); };
el("show-apis").onclick = () => { document.body.classList.remove("workflow-mode"); el("api-sections").hidden = false; el("show-workflows").setAttribute("aria-pressed", "false"); el("show-apis").setAttribute("aria-pressed", "true"); void workflows.show(false); };
void view.context.get().then(contextChanged).catch(() => {});
const unsubscribe = view.context.subscribe(contextChanged);
window.addEventListener("unload", unsubscribe, { once: true });
void run(refresh);
