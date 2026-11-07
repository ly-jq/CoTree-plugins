import { applyPluginViewAppearance, createPluginViewClient } from "../../../../packages/plugin-sdk/src/ui.js";
import type { PluginJsonValue } from "../../../../packages/plugin-sdk/src/index.js";
import type { Config, ChannelConfig } from "../src/config.js";
import type { PanelState, SecretField } from "../src/control.js";

const view = createPluginViewClient();
const element = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const field = (id: string) => element<HTMLInputElement>(id);
const button = (id: string) => element<HTMLButtonElement>(id);
const form = element<HTMLFormElement>("config-form");
let state: PanelState | undefined, busy = false, visible = true, confirmation: string | undefined;
const errors: Record<string, string> = {
  NODE_REQUIRED: "未找到 Node.js。请安装 Node.js 22.13 或更新版本，再重启 CoTree；插件会自动启动后台程序。",
  CONTROL_PROCESS_EXITED: "后台程序未能启动或已退出。请确认本机 Node.js 版本至少为 22.13，然后重新刷新状态。",
  CONTROL_PROCESS_FAILED: "后台连接失败，请刷新状态后重试。",
  CONTROL_CANCELLED: "操作已取消，请刷新状态确认当前服务状态。",
  CONFIG_REQUIRED: "请先填写并保存配置。", SECRET_REQUIRED: "凭据不完整，请填写来源 Key 和已启用平台的应用密钥。",
  INVALID_CONFIG: "配置不完整，请检查应用 ID、目标工作区和用户 ID。", INVALID_CREDENTIAL: "密钥格式不正确，不能包含换行或超过 4096 字符。",
  FEISHU_APP_ID_REQUIRED: "请先填写飞书 App ID，再点击自动获取。",
  FEISHU_APP_SECRET_REQUIRED: "请先填写此 App ID 对应的 App Secret；修改 App ID 后需要重新填写密钥。",
  FEISHU_AUTH_REJECTED: "飞书应用验证失败，请检查 App ID 和 App Secret 是否属于同一个应用且填写正确。",
  FEISHU_BOT_UNAVAILABLE: "未能获取机器人 ID。请在飞书开发者后台为此应用开启机器人能力并发布，再重新获取。",
  FEISHU_LOOKUP_UNAVAILABLE: "暂时无法查询飞书机器人信息，请检查网络后重试，也可手动填写机器人 Open ID。",
  FEISHU_APP_ID_INVALID: "飞书 App ID 格式不正确，请复制凭证页面中 cli_ 开头的应用 ID。",
  FEISHU_WS_AUTH_FAILED: "飞书长连接认证失败，请检查 App ID 和 App Secret，保存后重新启动服务。",
  FEISHU_WS_FORBIDDEN: "飞书拒绝建立长连接。请检查企业自建应用是否已启用、发布，并配置了长连接事件订阅。处理后停止服务，再重新启动。",
  FEISHU_WS_CONNECTION_LIMIT: "此飞书应用的长连接数量已达上限。请关闭其他重复运行的接入实例，再重新启动服务。",
  FEISHU_WS_RETRIES_EXHAUSTED: "飞书连接重试次数已用尽。请检查网络，恢复后停止服务，再重新启动。",
  FEISHU_WS_FAILED: "飞书长连接建立失败。请检查应用凭据、发布状态和网络，然后停止服务再重新启动。",
  INVALID_COTREE_URL: "请使用本机 HTTP 地址或 HTTPS 地址，地址中不要包含路径、参数或凭据。",
  NO_CHANNEL_CONFIGURED: "请至少启用飞书或钉钉中的一个平台。", EXACT_USER_IDS_REQUIRED: "允许列表需要填写具体用户 ID，不能使用 *。",
  STOP_BRIDGE_BEFORE_CONFIGURE: "请先停止服务，再修改配置。", BRIDGE_ALREADY_RUNNING: "当前配置已由其他进程使用，请先停止该进程。",
  COTREE_UNAVAILABLE: "无法连接 CoTree。请确认本机 Agent 接入已开启、重启已完成，且地址与端口正确。",
  AUTHORIZATION_REVOKED: "来源 Key 已撤销，请在 CoTree 创建有效的来源 Key。",
  STATE_SCOPE_CHANGED: "来源 Key、CoTree 地址或工作区已改变，旧收据不能跨身份使用。请恢复原配置处理旧投递，或在新的 CoTree 工作区创建接入。",
  CONTROL_TIMEOUT: "操作超时，请刷新状态确认结果后再决定是否重试。",
  BRIDGE_NOT_STARTED: "请先启动服务，再处理投递。"
};

function feedback(text: string, error = false) {
  const target = element("feedback"); target.hidden = false; target.textContent = text; target.dataset.error = String(error);
  target.setAttribute("role", error ? "alert" : "status");
}
async function call<T>(method: string, input: unknown = {}): Promise<T> {
  const result = await view.services.call("messaging.bridge", method, input as PluginJsonValue, { timeoutMs: 60000 }) as { ok: boolean; data?: T; code?: string };
  if (!result.ok) throw new Error(result.code ?? "CONTROL_PROCESS_FAILED");
  return result.data as T;
}
function controls() {
  const running = state?.status.running === true;
  element<HTMLFieldSetElement>("configuration").disabled = busy || running;
  button("save").disabled = busy || running;
  button("start").disabled = busy || running;
  button("stop").disabled = busy || !running;
  button("refresh").disabled = busy;
  element("save-hint").textContent = running ? "服务运行中，停止后可修改配置" : "配置保存在本机当前工作区的私有目录";
}
async function action(task: () => Promise<void>) {
  if (busy) return;
  busy = true; controls();
  try { await task(); }
  catch (error) {
    const code = error instanceof Error ? error.message : "CONTROL_PROCESS_FAILED";
    feedback(errors[code] ?? `操作失败（${/^[A-Z_0-9]+$/.test(code) ? code : "PLUGIN_SERVICE_UNAVAILABLE"}）。请检查配置或重新启用插件。`, true);
  } finally { busy = false; controls(); }
}
function platforms() {
  for (const platform of ["feishu", "dingtalk"] as const) {
    const enabled = field(`${platform}-enabled`).checked;
    element(`${platform}-fields`).hidden = !enabled;
    field(`${platform}-app`).required = enabled;
  }
  element("dingtalk-disabled-note").hidden = field("dingtalk-enabled").checked;
}
const ids = (id: string) => field(id).value.split(/[\s,，]+/).filter(Boolean);
function configuration(): Config {
  const config: Config = { schemaVersion: 1, cotreeUrl: field("cotree-url").value.trim(), workspaceId: field("workspace").value,
    tokenEnv: state?.config?.tokenEnv ?? "COTREE_INPUT_TOKEN" };
  for (const platform of ["feishu", "dingtalk"] as const) {
    if (!field(`${platform}-enabled`).checked) continue;
    const channel: ChannelConfig = { appId: field(`${platform}-app`).value.trim(), secretEnv: state?.config?.[platform]?.secretEnv ?? (platform === "feishu" ? "FEISHU_APP_SECRET" : "DINGTALK_CLIENT_SECRET"),
      allowUsers: ids(`${platform}-users`), allowChats: ids(`${platform}-chats`), requireMention: field(`${platform}-mention`).checked };
    const bot = field(`${platform}-bot`).value.trim();
    if (bot) { if (platform === "feishu") channel.botOpenId = bot; else channel.robotCode = bot; }
    config[platform] = channel;
  }
  return config;
}
function credentials(): Record<SecretField, string> {
  return { sourceToken: field("source-token").value, feishuSecret: field("feishu-secret").value, dingtalkSecret: field("dingtalk-secret").value };
}
function workspaceOption(id: string, label = id) {
  const select = element<HTMLSelectElement>("workspace");
  if (Array.from(select.options).some(option => option.value === id)) return;
  const option = document.createElement("option"); option.value = id; option.textContent = label; select.append(option);
}
function fill(config: Config | null) {
  if (!config) return;
  field("cotree-url").value = config.cotreeUrl;
  workspaceOption(config.workspaceId); field("workspace").value = config.workspaceId;
  for (const platform of ["feishu", "dingtalk"] as const) {
    const channel = config[platform]; field(`${platform}-enabled`).checked = Boolean(channel);
    field(`${platform}-app`).value = channel?.appId ?? "";
    field(`${platform}-bot`).value = (platform === "feishu" ? channel?.botOpenId : channel?.robotCode) ?? "";
    field(`${platform}-users`).value = channel?.allowUsers.join("\n") ?? "";
    field(`${platform}-chats`).value = channel?.allowChats.join("\n") ?? "";
    field(`${platform}-mention`).checked = channel?.requireMention !== false;
  }
  platforms();
}
function connectionErrorText(code: string): string {
  const platformCode = /^FEISHU_WS_REJECTED_(\d{1,12})$/.exec(code)?.[1];
  return platformCode ? `飞书拒绝长连接（错误码 ${platformCode}）。请检查应用配置，处理后停止服务，再重新启动。` : errors[code] ?? code;
}
const statusLabels: Record<string, string> = { connected: "已连接", connecting: "连接中", reconnecting: "重新连接中", disconnected: "连接断开", failed: "连接失败", closed: "连接已关闭", idle: "未连接", stopped: "未启动", pending: "待投递", accepted: "执行中", attention: "需处理", reply: "待回传", done: "已回传" };
function render(next: PanelState, populate = false) {
  state = next;
  if (populate) fill(next.config);
  for (const name of Object.keys(next.credentials) as SecretField[]) {
    element(`${name}-state`).textContent = next.credentials[name] ? "已配置 · 留空保留" : "未配置";
  }
  const running = next.status.running;
  element("service-state").textContent = running ? "服务运行中" : "服务已停止";
  element("status-dot").dataset.running = String(running);
  const channelError = (platform: "feishu" | "dingtalk") => {
    const channel = next.status.channels.find(item => item.platform === platform);
    return channel?.lastError ?? next.status.channelErrors[platform] ?? (platform === "feishu" && channel?.state === "failed" ? "FEISHU_WS_FAILED" : undefined);
  };
  const channelErrors = (["feishu", "dingtalk"] as const).map(channelError).filter((code): code is string => Boolean(code)).map(connectionErrorText);
  element("service-detail").textContent = channelErrors.length || next.status.lastError ? `需要处理：${[...channelErrors, next.status.lastError].filter(Boolean).join(" / ")}`
    : running ? next.status.channels.some(channel => channel.state === "connected") ? "正在接收消息；平台连接状态见下方。" : "正在建立平台连接，请稍候。" : "保存配置后，点击「启动服务」开始接收消息。";
  const inbox = (next.status.inbox ?? []) as { stage: string; count: number }[];
  element("pending").textContent = String(inbox.filter(row => row.stage !== "done").reduce((sum, row) => sum + row.count, 0));
  const uncertain = (next.status.uncertainDeliveries ?? []) as { id: string; event_id: string; error?: string }[];
  element("uncertain").textContent = String(uncertain.length);
  for (const platform of ["feishu", "dingtalk"] as const) {
    const channel = next.status.channels.find(item => item.platform === platform);
    element(`${platform}-status`).textContent = channel ? statusLabels[String(channel.state)] ?? String(channel.state) : next.config?.[platform] ? "未启动" : "未启用";
    const issue = channelError(platform), detail = element(`${platform}-error`);
    detail.hidden = !issue; detail.textContent = issue ? connectionErrorText(issue) : "";
  }
  const receipts = element("receipts"); receipts.replaceChildren();
  const recent = (next.status.recent ?? []) as { id: string; stage: string; error?: string }[];
  if (!recent.length && !uncertain.length) receipts.textContent = running ? "还没有收到消息。请用允许列表中的账号单聊或在群中 @ 机器人。" : "启动服务后显示消息收据。";
  for (const row of [...uncertain.map(item => ({ ...item, stage: "unknown" })), ...recent]) {
    const line = document.createElement("div"); line.className = "receipt";
    const label = document.createElement("span"); label.textContent = row.stage === "unknown" ? "回复待核查" : statusLabels[row.stage] ?? row.stage;
    const code = document.createElement("code"); code.textContent = row.id.slice(0, 16); code.title = row.id;
    line.append(label, code);
    if (row.error) { const detail = document.createElement("span"); detail.textContent = row.error; line.append(detail); }
    if (row.stage === "attention" || row.stage === "unknown") {
      const retry = document.createElement("button"); retry.type = "button";
      retry.textContent = row.stage === "attention" ? "重试投递" : confirmation === row.id ? "确认重发（可能重复）" : "已核查，准备重发";
      retry.addEventListener("click", () => {
        if (row.stage === "unknown" && confirmation !== row.id) { confirmation = row.id; render(next); return; }
        void action(async () => {
          await call(row.stage === "unknown" ? "messaging_retry_delivery" : "messaging_retry_input", { id: row.id, ...(row.stage === "unknown" ? { acceptDuplicateRisk: true } : {}) });
          confirmation = undefined; await refresh(); feedback("已加入重试队列。");
        });
      });
      line.append(retry);
    }
    receipts.append(line);
  }
  controls();
}
async function refresh(populate = false) { render(await call<PanelState>("panel.state"), populate); }
async function save() {
  const next = await call<PanelState>("config.save", { config: configuration(), credentials: credentials() });
  for (const id of ["source-token", "feishu-secret", "dingtalk-secret"]) field(id).value = "";
  render(next, true);
}
form.addEventListener("submit", event => { event.preventDefault(); void action(async () => { await save(); feedback("配置已保存，密钥不会回显。"); }); });
button("start").addEventListener("click", () => {
  if (!form.reportValidity()) return;
  void action(async () => { await save(); render(await call<PanelState>("messaging_start")); feedback("服务已启动，正在建立平台连接。请查看各平台状态。"); });
});
button("stop").addEventListener("click", () => { void action(async () => { render(await call<PanelState>("messaging_stop")); feedback("服务已停止。CoTree 已受理的任务继续执行，重新启动后可恢复回传。"); }); });
button("refresh").addEventListener("click", () => { void action(() => refresh()); });
button("feishu-bot-get").addEventListener("click", () => { void action(async () => {
  button("feishu-bot-get").textContent = "获取中…";
  try {
    const result = await call<{ openId: string }>("feishu.bot-info", { appId: field("feishu-app").value.trim(), appSecret: field("feishu-secret").value });
    field("feishu-bot").value = result.openId;
    feedback("机器人 Open ID 已自动填入。点击「保存配置」或「启动服务」后生效。");
  } finally { button("feishu-bot-get").textContent = "自动获取"; }
}); });
button("check").addEventListener("click", () => { void action(async () => {
  const result = await call<{ workspaces?: Array<Record<string, unknown>>; items?: Array<Record<string, unknown>> }>("connection.check", { cotreeUrl: field("cotree-url").value.trim(), sourceToken: field("source-token").value });
  const selected = field("workspace").value;
  const select = element<HTMLSelectElement>("workspace"); select.replaceChildren(); workspaceOption("", "请选择目标工作区");
  const rows = result.workspaces ?? result.items ?? [];
  for (const row of rows) if (typeof row.workspaceId === "string") workspaceOption(row.workspaceId, `${String(row.displayName ?? row.name ?? row.workspace ?? row.path ?? row.workspaceId)}`);
  if (selected && rows.some(row => row.workspaceId === selected)) select.value = selected;
  else if (rows.length === 1) select.value = String(rows[0]!.workspaceId);
  feedback(rows.length ? "CoTree 连接正常，请选择目标工作区并填写平台信息。" : "CoTree 连接正常，但没有可用工作区。请先在 CoTree 打开并配置一个工作区。");
}); });
for (const platform of ["feishu", "dingtalk"]) field(`${platform}-enabled`).addEventListener("change", platforms);
platforms();
const apply = (context: Awaited<ReturnType<typeof view.context.get>>) => { applyPluginViewAppearance(context); visible = context.visible; };
const dispose = view.context.subscribe(apply);
const timer = setInterval(() => { if (visible && !busy && state?.status.running && document.visibilityState !== "hidden") void action(() => refresh()); }, 5000);
window.addEventListener("beforeunload", () => { clearInterval(timer); dispose(); }, { once: true });
void action(async () => { apply(await view.context.get()); await refresh(true); });
