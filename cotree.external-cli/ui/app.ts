/// <reference lib="dom" />
import { applyPluginViewAppearance, createPluginViewClient } from "../../../packages/plugin-sdk/src/ui.js";
import "@cotree/plugin-sdk/theme.css";
import "./style.css";
import {
  ALL_CLI_ENGINES,
  PLUGIN_ID,
  PRIMARY_CLI_ENGINES,
  SERVICE_ID,
  formatSilenceDuration,
  formatWorkspaceLabel,
  isAgentOwnedSession,
  isTerminalCliStatus,
  type CliEngine,
  type CliEnginePreference,
  type CliFollowUpMode,
  type CliInteractionMode,
  type CliPendingIntervention,
  type CliPermissionMode,
  type CliQueuedMessage,
  type CliRailSessionSummary,
  type CliSessionSummary,
  type CliSessionTranscript,
  type CliTimelineEvent,
  type CliTranscriptDelta,
  type CliTranscriptTurn
} from "../src/shared.js";
import {
  createTurnDomHandle,
  engineDisplayName,
  formatPreciseTime,
  formatShortTime,
  formatUsageSummary,
  permissionModeDisplay,
  renderChangedFilesBar,
  renderInterventionCard,
  statusDisplay,
  type BlockActionCallbacks,
  type TurnDomHandle
} from "./render-blocks.js";
import {
  formatCatalogHint,
  formatModelBadge,
  populateEffortSelect,
  populateModelSelect,
  resolveSelectedModel,
  syncModelCustomInputVisibility,
  type EnginesInspectMap
} from "./model-picker.js";
import {
  cycleNotificationPref,
  getNotificationPref,
  handleNotificationHint,
  notificationPrefIcon,
  notificationPrefLabel,
  setNotificationPref,
  type NotificationHintPayload
} from "./notifications.js";
import { createProviderIcon, createUiIcon, setIconAndText, setOnlyIcon, type UiIconName } from "./icons.js";

type InspectResult = {
  controlWorkspace?: string;
  engines: EnginesInspectMap;
  enginePreferences?: Partial<Record<CliEngine, CliEnginePreference>>;
  sessions: CliSessionSummary[];
  focusedCliSessionId?: string | null;
  focusedByRequest?: boolean;
};

type TranscriptResponse = {
  controlWorkspace?: string;
  focusedCliSessionId?: string | null;
  engines?: EnginesInspectMap;
  enginePreferences?: Partial<Record<CliEngine, CliEnginePreference>>;
  sessions?: CliSessionSummary[];
  transcript?: CliSessionTranscript | null;
  incremental?: boolean;
  latestSeq?: number;
  summary?: CliSessionSummary;
  deltas?: CliTranscriptDelta[];
};

type FilterMode = "all" | "active" | "intervention" | "history";
type SidecarPage = "list" | "detail";

type CachedDetailEntry = {
  transcript: CliSessionTranscript;
  scrollTop: number;
  cachedAt: number;
};

type CardHandle = {
  cliSessionId: string;
  card: HTMLElement;
  iconHost: HTMLSpanElement;
  titleEl: HTMLSpanElement;
  agentPill: HTMLSpanElement;
  silencePill: HTMLSpanElement;
  statusPill: HTMLSpanElement;
  activityEl: HTMLDivElement;
  metaEl: HTMLDivElement;
  steerBox: HTMLDivElement;
  steerInput: HTMLInputElement;
  toggleSteerBtn: HTMLButtonElement;
  stopBtn: HTMLButtonElement;
  killBtn: HTMLButtonElement;
  deleteBtn: HTMLButtonElement;
};

const CACHE_TTL_MS = 5 * 60_000;
const view = createPluginViewClient();
const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

let sessions: CliSessionSummary[] = [];
let enginesMap: EnginesInspectMap = {};
let enginePreferences: Partial<Record<CliEngine, CliEnginePreference>> = {};
let filterMode: FilterMode = "all";
const openSteerIds = new Set<string>();
const cardNodes = new Map<string, CardHandle>();
let launcherTouchedEngine: CliEngine | undefined;
let lastSseEventAt = Date.now();
let lastReconcileAt = 0;
let reconciling = false;
let wasViewVisible = true;
let initialInspectHandled = false;

// Inline Detail View state
let activePage: SidecarPage = "list";
let detailSessionId: string | undefined;
let detailTranscript: CliSessionTranscript | null = null;
let detailViewMode: "readable" | "raw" = "readable";
let detailFollowUpMode: CliFollowUpMode = "queue";
let detailComposerTouchedId: string | undefined;
let detailScrollScheduled = false;
let detailLightboxFilePath: string | undefined;
let armedCardDeleteId: string | undefined;
let armedCardDeleteTimer: number | undefined;
let detailDeleteArmed = false;
let detailDeleteTimer: number | undefined;

const detailCache = new Map<string, CachedDetailEntry>();
const detailDrafts = new Map<string, string>();
const detailTurnNodes = new Map<number, TurnDomHandle>();
const detailOptimisticNodes = new Map<string, HTMLElement>();

// ============================================================================
// Static Chrome Hydration
// ============================================================================

function createMenuRowContent(icon: UiIconName, label: string, rightText?: string): DocumentFragment {
  const frag = document.createDocumentFragment();
  const left = document.createElement("span");
  left.className = "menu-left";
  left.append(createUiIcon(icon, 14), document.createTextNode(label));
  frag.append(left);
  if (rightText) {
    const right = document.createElement("span");
    right.className = "menu-right";
    right.textContent = rightText;
    frag.append(right);
  }
  return frag;
}

function hydrateStaticChrome(): void {
  // List page chrome
  setIconAndText(el("open-transcript"), "maximize2", "全屏会话", 13);
  setOnlyIcon(el("refresh"), "refresh", 14);
  el("approvals-title").replaceChildren(createUiIcon("shield", 14), document.createTextNode("待审批 / 待确认"));
  el("launcher-summary-left").replaceChildren(
    createUiIcon("plus", 14),
    document.createTextNode("启动外部 Agent CLI")
  );
  el("launcher-chevron").replaceChildren(createUiIcon("chevronDown", 14));
  setIconAndText(el("start-refresh-models"), "refresh", "刷新模型", 12);
  el("empty-icon").replaceChildren(createUiIcon("terminal", 18));

  // Inline detail page chrome
  setIconAndText(el("detail-back"), "arrowLeft", "列表", 13);
  setOnlyIcon(el("detail-review"), "gitCompare", 14);
  setOnlyIcon(el("detail-fullscreen"), "maximize2", 14);
  setOnlyIcon(el("detail-more"), "moreHorizontal", 15);
  syncDetailRawMenuLabel();
  el("detail-autoscroll-label").replaceChildren(createUiIcon("arrowDown", 14), document.createTextNode("自动滚动到底部"));
  el("detail-fork").replaceChildren(createMenuRowContent("gitBranch", "从当前状态分支", "Fork"));
  el("detail-handoff").replaceChildren(createMenuRowContent("arrowLeftRight", "跨引擎交接", "Handoff"));
  el("detail-compact").replaceChildren(createMenuRowContent("layers", "压缩上下文", "Compact"));
  el("detail-interrupt").replaceChildren(createMenuRowContent("pause", "软中断当前轮次"));
  el("detail-kill").replaceChildren(createMenuRowContent("stopCircle", "终止 CLI 进程"));
  el("detail-delete").replaceChildren(createMenuRowContent("trash2", "删除此会话"));

  setIconAndText(el("detail-load-older"), "chevronUp", "加载更早轮次", 14);
  el("detail-interventions-title").replaceChildren(
    createUiIcon("shield", 14),
    document.createTextNode("待处理审批 / 问答")
  );

  el("detail-model-icon").replaceChildren(createUiIcon("sparkles", 13));
  el("detail-effort-icon").replaceChildren(createUiIcon("brain", 13));
  el("detail-perm-icon").replaceChildren(createUiIcon("shield", 13));
  setIconAndText(el("detail-plan-toggle"), "compass", "Plan", 12);
  setOnlyIcon(el("detail-stop-side"), "square", 11);
  setOnlyIcon(el("detail-send"), "arrowUp", 15);

  for (const chev of Array.from(document.querySelectorAll<HTMLElement>("[data-detail-chevron]"))) {
    chev.replaceChildren(createUiIcon("chevronDown", 12));
  }

  setOnlyIcon(el("detail-handoff-close"), "x", 15);
  setOnlyIcon(el("detail-lightbox-close"), "x", 15);
}

function syncDetailRawMenuLabel(): void {
  el("detail-toggle-raw").replaceChildren(
    createMenuRowContent(
      detailViewMode === "raw" ? "messageSquare" : "terminal",
      detailViewMode === "raw" ? "切回会话视图" : "查看原始协议 / 日志",
      detailViewMode === "raw" ? "对话" : "Raw"
    )
  );
}

function setStartStatus(message: string, isError = false): void {
  const node = el("start-status");
  if (!node) return;
  node.textContent = message;
  node.dataset.error = String(isError);
}

function setNotice(message: string, isError = false): void {
  const node = el("notice");
  if (!node) return;
  node.textContent = message;
  node.dataset.error = String(isError);
}

function setDetailNotice(message: string, isError = false): void {
  const node = el("detail-notice");
  if (!node) return;
  node.textContent = message;
  node.dataset.error = String(isError);
}

function isLiveActive(session: CliSessionSummary): boolean {
  return session.origin === "live" && !session.executionSettled && !isTerminalCliStatus(session.status);
}

function disarmDetailDelete(): void {
  detailDeleteArmed = false;
  if (detailDeleteTimer !== undefined) {
    window.clearTimeout(detailDeleteTimer);
    detailDeleteTimer = undefined;
  }
  const delBtn = el("detail-delete");
  if (delBtn) delBtn.replaceChildren(createMenuRowContent("trash2", "删除此会话"));
}

function disarmCardDelete(): void {
  const prevId = armedCardDeleteId;
  armedCardDeleteId = undefined;
  if (armedCardDeleteTimer !== undefined) {
    window.clearTimeout(armedCardDeleteTimer);
    armedCardDeleteTimer = undefined;
  }
  if (prevId) {
    const handle = cardNodes.get(prevId);
    if (handle) {
      handle.deleteBtn.dataset.armed = "false";
      handle.deleteBtn.title = "删除会话";
      setOnlyIcon(handle.deleteBtn, "trash2", 13);
    }
  }
}

function closeDetailMoreMenu(): void {
  el("detail-more-menu").hidden = true;
  el("detail-more").setAttribute("aria-expanded", "false");
  disarmDetailDelete();
}

function setSidecarPage(page: SidecarPage): void {
  activePage = page;
  el("sidecar-list-view").hidden = page !== "list";
  el("sidecar-detail").hidden = page !== "detail";
  if (page === "list") {
    closeDetailMoreMenu();
  }
}

async function openTranscriptFor(cliSessionId?: string): Promise<void> {
  try {
    if (cliSessionId) {
      await view.services.call(SERVICE_ID, "view.focus", { cliSessionId });
    }
    await view.commands.execute(`${PLUGIN_ID}.open-transcript`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (activePage === "detail") setDetailNotice(msg, true);
    else setNotice(msg, true);
  }
}

function openLocalFile(filePath: string, line?: number): void {
  void view.commands
    .execute(`${PLUGIN_ID}.open-file`, {
      path: filePath,
      ...(line !== undefined ? { line } : {})
    })
    .catch((err) => {
      setDetailNotice(`打开文件失败: ${err instanceof Error ? err.message : String(err)}`, true);
    });
}

function openReviewPanel(): void {
  void view.commands.execute(`${PLUGIN_ID}.open-review`).catch((err) => {
    setDetailNotice(`打开 Review 面板失败: ${err instanceof Error ? err.message : String(err)}`, true);
  });
}

async function loadWorkspaceImageBlobUrl(filePath: string): Promise<string | undefined> {
  if (/^[A-Za-z]:[\\/]/.test(filePath) || filePath.startsWith("/")) {
    return undefined;
  }
  try {
    const res = await view.files.read({ path: filePath, encoding: "base64", maxBytes: 4 * 1024 * 1024 });
    const binary = atob(res.content);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    const lower = filePath.toLowerCase();
    const mime =
      lower.endsWith(".jpg") || lower.endsWith(".jpeg")
        ? "image/jpeg"
        : lower.endsWith(".webp")
          ? "image/webp"
          : lower.endsWith(".gif")
            ? "image/gif"
            : "image/png";
    return URL.createObjectURL(new Blob([bytes], { type: mime }));
  } catch {
    return undefined;
  }
}

function openDetailLightbox(src: string, caption: string, filePath?: string): void {
  detailLightboxFilePath = filePath;
  el<HTMLImageElement>("detail-lightbox-img").src = src;
  el("detail-lightbox-caption").textContent = caption;
  el<HTMLButtonElement>("detail-lightbox-open-file").hidden = !filePath;
  el("detail-lightbox-modal").hidden = false;
}

// ============================================================================
// List Page Rendering & Launcher Model Picker
// ============================================================================

function syncStartModelPicker(options: { preserveCurrentSelection?: boolean } = {}): void {
  const engine = el<HTMLSelectElement>("start-engine").value as CliEngine;
  const catalog = enginesMap[engine]?.modelCatalog;
  const selectEl = el<HTMLSelectElement>("start-model-select");
  const customEl = el<HTMLInputElement>("start-model-custom");
  const effortSelect = el<HTMLSelectElement>("start-effort");
  const effortWrap = el("start-effort-wrap");

  const currentModel = options.preserveCurrentSelection
    ? resolveSelectedModel(selectEl, customEl)
    : enginePreferences[engine]?.model;
  const currentEffort = options.preserveCurrentSelection
    ? effortSelect.value || undefined
    : enginePreferences[engine]?.reasoningEffort;

  populateModelSelect(selectEl, customEl, catalog, {
    ...(currentModel ? { selectedModel: currentModel } : {})
  });
  populateEffortSelect(effortSelect, effortWrap, catalog, resolveSelectedModel(selectEl, customEl), currentEffort);
  el("start-model-hint").textContent = formatCatalogHint(catalog);
}

function renderWorkspaceContextBar(controlWorkspace?: string): void {
  const bar = el("sidecar-workspace");
  if (!bar) return;
  if (!controlWorkspace) {
    bar.hidden = true;
    return;
  }
  bar.hidden = false;
  bar.title = `当前绑定工作区：${controlWorkspace}`;
  const label = document.createElement("span");
  label.textContent = `工作区 · ${formatWorkspaceLabel(controlWorkspace)}`;
  bar.replaceChildren(createUiIcon("folder", 12), label);
}

function renderEngines(): void {
  const bar = el("engines");
  bar.replaceChildren();
  for (const engine of ALL_CLI_ENGINES) {
    const info = enginesMap[engine];
    const isPrimary = PRIMARY_CLI_ENGINES.includes(engine);
    if (!isPrimary && !info?.available) continue;
    const item = document.createElement("span");
    item.className = `engine-status-item${info?.available ? " ready" : ""}`;
    item.title = info?.available
      ? `${engineDisplayName(engine)} 已就绪 (${info.command})`
      : `${engineDisplayName(engine)} 未安装`;
    const dot = document.createElement("span");
    dot.className = "engine-status-dot";
    item.append(dot, createProviderIcon(engine, 12), document.createTextNode(engineDisplayName(engine)));
    bar.append(item);
  }
}

function renderApprovalsBanner(): void {
  const banner = el("approvals-banner");
  const list = el("approvals-list");
  const count = el("approvals-count");
  const pending: Array<{ cliSessionId: string; label: string; item: CliSessionSummary["pendingInterventions"][number] }> = [];
  for (const s of sessions) {
    for (const item of s.pendingInterventions) {
      pending.push({ cliSessionId: s.cliSessionId, label: s.label ?? s.cliSessionId, item });
    }
  }
  count.textContent = String(pending.length);
  banner.hidden = pending.length === 0;
  list.replaceChildren();
  for (const entry of pending) {
    list.append(
      renderInterventionCard(entry.cliSessionId, entry.item, async (payload) => {
        try {
          await view.services.call(SERVICE_ID, "view.respond", payload);
          setNotice(`已响应 ${entry.label}`);
        } catch (err) {
          setNotice(err instanceof Error ? err.message : String(err), true);
        }
      })
    );
  }
}

function matchesFilter(session: CliSessionSummary): boolean {
  switch (filterMode) {
    case "active":
      return isLiveActive(session);
    case "intervention":
      return session.pendingInterventions.length > 0;
    case "history":
      return !isLiveActive(session);
    case "all":
    default:
      return true;
  }
}

function createCardHandle(session: CliSessionSummary): CardHandle {
  const card = document.createElement("article");
  card.dataset.sessionId = session.cliSessionId;

  const head = document.createElement("div");
  head.className = "cli-row cli-between";
  const left = document.createElement("div");
  left.className = "session-head-left";
  const iconHost = document.createElement("span");
  iconHost.className = "cli-row";
  const titleEl = document.createElement("span");
  titleEl.className = "session-title";
  const agentPill = document.createElement("span");
  agentPill.className = "agent-origin-pill";
  agentPill.textContent = "智能体";
  agentPill.hidden = true;
  left.append(iconHost, titleEl, agentPill);

  const pills = document.createElement("div");
  pills.className = "session-head-pills";
  const silencePill = document.createElement("span");
  silencePill.className = "cli-pill warn silence-pill";
  silencePill.hidden = true;
  const statusPill = document.createElement("span");
  pills.append(silencePill, statusPill);
  head.append(left, pills);

  const activityEl = document.createElement("div");
  activityEl.className = "session-activity";

  const metaEl = document.createElement("div");
  metaEl.className = "session-meta";

  const actions = document.createElement("div");
  actions.className = "session-actions";
  const actionsLeft = document.createElement("div");
  actionsLeft.className = "session-actions-left";
  const actionsRight = document.createElement("div");
  actionsRight.className = "session-actions-right";

  const viewInlineBtn = document.createElement("button");
  viewInlineBtn.type = "button";
  viewInlineBtn.className = "cotree-button compact-btn";
  viewInlineBtn.dataset.variant = "primary";
  setIconAndText(viewInlineBtn, "messageSquare", "查看内容", 13);
  viewInlineBtn.title = "直接在右侧栏展开会话详情与全部控制";
  viewInlineBtn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    void openDetailSession(session.cliSessionId);
  });

  const toggleSteerBtn = document.createElement("button");
  toggleSteerBtn.type = "button";
  toggleSteerBtn.className = "cotree-button compact-btn";
  toggleSteerBtn.dataset.variant = "ghost";
  toggleSteerBtn.textContent = "快速追问";

  const fullscreenBtn = document.createElement("button");
  fullscreenBtn.type = "button";
  fullscreenBtn.className = "reui-icon-btn";
  fullscreenBtn.title = "在全屏视图打开此会话";
  fullscreenBtn.setAttribute("aria-label", "全屏打开会话");
  setOnlyIcon(fullscreenBtn, "maximize2", 13);
  fullscreenBtn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    void openTranscriptFor(session.cliSessionId);
  });

  const stopBtn = document.createElement("button");
  stopBtn.type = "button";
  stopBtn.className = "reui-icon-btn";
  stopBtn.title = "软中断";
  stopBtn.setAttribute("aria-label", "软中断会话");
  setOnlyIcon(stopBtn, "pause", 14);
  stopBtn.addEventListener("click", async (ev) => {
    ev.stopPropagation();
    await view.services.call(SERVICE_ID, "view.stop", { cliSessionId: session.cliSessionId, mode: "interrupt" });
  });

  const killBtn = document.createElement("button");
  killBtn.type = "button";
  killBtn.className = "reui-icon-btn danger";
  killBtn.title = "终止进程";
  killBtn.setAttribute("aria-label", "终止会话进程");
  setOnlyIcon(killBtn, "stopCircle", 14);
  killBtn.addEventListener("click", async (ev) => {
    ev.stopPropagation();
    await view.services.call(SERVICE_ID, "view.stop", { cliSessionId: session.cliSessionId, mode: "kill" });
  });

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "reui-icon-btn danger";
  deleteBtn.dataset.armed = "false";
  deleteBtn.title = "删除会话";
  deleteBtn.setAttribute("aria-label", `删除会话 ${session.label ?? session.cliSessionId}`);
  setOnlyIcon(deleteBtn, "trash2", 13);
  deleteBtn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    const latest = sessions.find((s) => s.cliSessionId === session.cliSessionId);
    if (latest && isLiveActive(latest) && armedCardDeleteId !== session.cliSessionId) {
      disarmCardDelete();
      armedCardDeleteId = session.cliSessionId;
      deleteBtn.dataset.armed = "true";
      deleteBtn.title = "该会话正在运行，再次点击确认终止并删除";
      setIconAndText(deleteBtn, "trash2", "确认?", 12);
      armedCardDeleteTimer = window.setTimeout(() => disarmCardDelete(), 4_000);
      return;
    }
    disarmCardDelete();
    void deleteSidecarSession(session.cliSessionId, deleteBtn);
  });

  actionsLeft.append(viewInlineBtn, toggleSteerBtn);
  actionsRight.append(fullscreenBtn, stopBtn, killBtn, deleteBtn);
  actions.append(actionsLeft, actionsRight);

  const steerBox = document.createElement("div");
  steerBox.className = "quick-steer-box";
  steerBox.hidden = !openSteerIds.has(session.cliSessionId);
  steerBox.addEventListener("click", (ev) => ev.stopPropagation());
  const steerRow = document.createElement("div");
  steerRow.className = "cli-row";
  const steerInput = document.createElement("input");
  steerInput.className = "cotree-input cli-flex-1 quick-steer-input";
  steerInput.placeholder = "输入追问或运行中插话… (Enter 发送)";
  const sendBtn = document.createElement("button");
  sendBtn.type = "button";
  sendBtn.className = "cotree-button compact-btn";
  sendBtn.dataset.variant = "primary";
  setOnlyIcon(sendBtn, "arrowUp", 14);
  sendBtn.setAttribute("aria-label", "发送追问");

  const sendSteer = async () => {
    const msg = steerInput.value.trim();
    if (!msg) return;
    sendBtn.disabled = true;
    try {
      await view.services.call(SERVICE_ID, "view.steer", {
        cliSessionId: session.cliSessionId,
        message: msg,
        strategy: "auto"
      });
      steerInput.value = "";
      setNotice(`已发送给 ${session.label ?? session.cliSessionId}`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : String(err), true);
    } finally {
      sendBtn.disabled = false;
    }
  };
  sendBtn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    void sendSteer();
  });
  steerInput.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && !ev.isComposing) {
      ev.preventDefault();
      void sendSteer();
    }
  });
  steerRow.append(steerInput, sendBtn);
  steerBox.append(steerRow);

  toggleSteerBtn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    if (openSteerIds.has(session.cliSessionId)) openSteerIds.delete(session.cliSessionId);
    else openSteerIds.add(session.cliSessionId);
    steerBox.hidden = !openSteerIds.has(session.cliSessionId);
    if (!steerBox.hidden) steerInput.focus();
  });

  // Clicking anywhere on card body/header opens Inline Detail right inside the sidecar
  card.addEventListener("click", () => {
    void openDetailSession(session.cliSessionId);
  });

  card.append(head, activityEl, metaEl, actions, steerBox);
  const handle: CardHandle = {
    cliSessionId: session.cliSessionId,
    card,
    iconHost,
    titleEl,
    agentPill,
    silencePill,
    statusPill,
    activityEl,
    metaEl,
    steerBox,
    steerInput,
    toggleSteerBtn,
    stopBtn,
    killBtn,
    deleteBtn
  };
  patchCardHandle(handle, session);
  return handle;
}

function syncCardSilence(handle: CardHandle, session: CliSessionSummary): void {
  const activeWaiting =
    !session.executionSettled &&
    (session.status === "running" || session.status === "starting") &&
    session.pendingInterventions.length === 0;
  const duration = activeWaiting ? formatSilenceDuration(session.updatedAt) : undefined;
  if (!duration) {
    handle.silencePill.hidden = true;
    return;
  }
  handle.silencePill.hidden = false;
  handle.silencePill.replaceChildren(createUiIcon("clock", 11), document.createTextNode(`已静默 ${duration}`));
  handle.silencePill.title = `CLI 进程仍在运行，但已连续 ${duration} 未收到新的上游输出。可继续等待或点击暂停按钮发起软中断。`;
}

function hasAnyRunningSession(): boolean {
  return sessions.some(
    (s) =>
      s.origin === "live" &&
      !s.executionSettled &&
      (s.status === "running" || s.status === "starting" || s.status === "interrupting")
  );
}

function patchCardHandle(handle: CardHandle, session: CliSessionSummary): void {
  const st = statusDisplay(session.status);
  const active = isLiveActive(session);
  handle.card.className = `session-card clickable ${session.status}${session.origin === "history" ? " history" : ""}`;

  if (handle.iconHost.dataset.engine !== session.engine) {
    handle.iconHost.dataset.engine = session.engine;
    handle.iconHost.replaceChildren(createProviderIcon(session.engine, 15));
  }

  handle.titleEl.textContent = session.label ?? session.cliSessionId;
  const agentOwned = isAgentOwnedSession(session);
  handle.agentPill.hidden = !agentOwned;
  if (agentOwned) {
    handle.agentPill.title = [
      "由 CoTree 智能体启动的 CLI 会话",
      session.ownerAgentId ? `agent: ${session.ownerAgentId}` : "",
      session.ownerSessionId ? `session: ${session.ownerSessionId}` : ""
    ].filter(Boolean).join("\n");
  }
  syncCardSilence(handle, session);

  handle.statusPill.className = `cli-pill ${st.tone}`;
  handle.statusPill.replaceChildren();
  const dot = document.createElement("span");
  dot.className = `status-dot ${st.tone}`;
  handle.statusPill.append(dot, document.createTextNode(st.label));

  handle.activityEl.textContent =
    session.lastError || session.lastAssistantText || session.lastActivitySummary || "等待指令…";

  const metaBits = [
    engineDisplayName(session.engine),
    `Turn ${session.turnCount}`,
    formatModelBadge(session.model, session.reasoningEffort),
    permissionModeDisplay(session.permissionMode).short,
    session.interactionMode === "plan" ? "Plan" : "",
    session.queuedCount ? `队列 ${session.queuedCount}` : "",
    formatShortTime(session.updatedAt),
    formatUsageSummary(session.totalUsage, session.totalCostUsd)
  ].filter(Boolean);
  handle.metaEl.textContent = metaBits.join(" · ");

  setIconAndText(handle.toggleSteerBtn, "cornerUpRight", active ? "追问" : "续聊", 13);
  handle.stopBtn.hidden = !active;
  handle.killBtn.hidden = !active;
  handle.deleteBtn.setAttribute("aria-label", `删除会话 ${session.label ?? session.cliSessionId}`);
  if (armedCardDeleteId !== session.cliSessionId) {
    handle.deleteBtn.dataset.armed = "false";
    handle.deleteBtn.title = active ? "终止并删除会话" : "删除会话";
  }
}

function syncSessionListIncremental(): void {
  const activeCount = sessions.filter(isLiveActive).length;
  const intCount = sessions.filter((s) => s.pendingInterventions.length > 0).length;
  const histCount = sessions.length - activeCount;

  const counter = el("live-counter");
  counter.className = `cli-pill ${activeCount > 0 ? "run" : "idle"}`;
  counter.replaceChildren();
  const dot = document.createElement("span");
  dot.className = `status-dot ${activeCount > 0 ? "run" : "idle"}`;
  counter.append(dot, document.createTextNode(`${activeCount} 活跃`));

  el("cnt-all").textContent = String(sessions.length);
  el("cnt-active").textContent = String(activeCount);
  el("cnt-int").textContent = String(intCount);
  el("cnt-hist").textContent = String(histCount);

  renderApprovalsBanner();
  syncDetailSessionSelect();

  const list = el("session-list");
  const filtered = sessions.filter(matchesFilter);
  el("session-empty").hidden = filtered.length > 0;

  const visibleIds = new Set(filtered.map((s) => s.cliSessionId));
  for (const [id, handle] of [...cardNodes.entries()]) {
    if (!visibleIds.has(id)) {
      handle.card.remove();
      cardNodes.delete(id);
    }
  }

  filtered.forEach((session, idx) => {
    let handle = cardNodes.get(session.cliSessionId);
    if (!handle) {
      handle = createCardHandle(session);
      cardNodes.set(session.cliSessionId, handle);
    } else {
      patchCardHandle(handle, session);
    }
    const existingAtIdx = list.children[idx];
    if (existingAtIdx !== handle.card) {
      list.insertBefore(handle.card, existingAtIdx ?? null);
    }
  });
}

// ============================================================================
// Inline Detail View (Live 60fps Transcript + Full Interactive Controls)
// ============================================================================

function autoResizeDetailTextarea(): void {
  const ta = el<HTMLTextAreaElement>("detail-input");
  ta.style.height = "auto";
  ta.style.height = `${Math.min(140, Math.max(36, ta.scrollHeight))}px`;
}

function scheduleDetailAutoScroll(): void {
  if (activePage !== "detail" || !el<HTMLInputElement>("detail-auto-scroll")?.checked || detailScrollScheduled) {
    return;
  }
  detailScrollScheduled = true;
  requestAnimationFrame(() => {
    detailScrollScheduled = false;
    const viewport = el("detail-stream-viewport");
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
  });
}

function syncDetailSessionSelect(): void {
  const select = el<HTMLSelectElement>("detail-session-select");
  if (!select) return;
  select.replaceChildren();
  for (const s of sessions) {
    const opt = document.createElement("option");
    opt.value = s.cliSessionId;
    const st = statusDisplay(s.status);
    const title = s.label ?? s.cliSessionId;
    opt.textContent = `${engineDisplayName(s.engine)} · ${title} (${st.label})`;
    select.append(opt);
  }
  if (detailSessionId) {
    select.value = detailSessionId;
  }
}

function syncDetailSilenceIndicator(summary?: CliSessionSummary | null): void {
  const pill = el("detail-silence");
  if (!pill) return;
  const activeWaiting =
    Boolean(summary) &&
    !summary!.executionSettled &&
    (summary!.status === "running" || summary!.status === "starting") &&
    summary!.pendingInterventions.length === 0;
  const duration = activeWaiting ? formatSilenceDuration(summary!.updatedAt) : undefined;
  if (!duration) {
    pill.hidden = true;
    return;
  }
  pill.hidden = false;
  pill.replaceChildren(createUiIcon("clock", 11), document.createTextNode(`已静默 ${duration}`));
  pill.title = `CLI 进程仍在运行，但已连续 ${duration} 未收到新的上游输出。可继续等待或从右上角菜单软中断。`;
}

function renderDetailContextMeter(summary: CliSessionSummary): void {
  const meter = el("detail-ctx-meter");
  const fill = el("detail-ctx-fill");
  const text = el("detail-ctx-text");
  const usage = summary.contextUsage;
  if (!usage || !usage.totalTokens || !usage.contextWindow) {
    meter.hidden = true;
    return;
  }
  meter.hidden = false;
  const pct = Math.min(100, Math.round((usage.totalTokens / usage.contextWindow) * 100));
  fill.style.width = `${pct}%`;
  meter.className = `ctx-meter detail-ctx-meter${pct >= 90 ? " danger" : pct >= 80 ? " warn" : ""}`;
  text.textContent = `${pct}%`;
  const usedK = (usage.totalTokens / 1000).toFixed(usage.totalTokens >= 100_000 ? 0 : 1);
  const maxK = Math.round(usage.contextWindow / 1000);
  meter.title = `上下文占用 ${usedK}k / ${maxK}k (${pct}%) · 点击触发压缩`;
}

function syncDetailComposerPillLabels(): void {
  const modelSel = el<HTMLSelectElement>("detail-model-select");
  const modelOpt = modelSel.selectedOptions[0];
  el("detail-model-label").textContent = modelOpt?.textContent?.replace(/\s*\(默认\)$/, "") ?? "默认模型";

  const effortSel = el<HTMLSelectElement>("detail-effort");
  const effortOpt = effortSel.selectedOptions[0];
  el("detail-effort-label").textContent = effortOpt?.textContent ?? "默认";

  const permSel = el<HTMLSelectElement>("detail-permission");
  const perm = (permSel.value as CliPermissionMode) || "supervised";
  el("detail-perm-label").textContent = permissionModeDisplay(perm).short;
  el("detail-perm-icon").replaceChildren(createUiIcon(permissionModeDisplay(perm).icon, 13));
}

function syncDetailModelPicker(summary: CliSessionSummary, forceReset = false): void {
  const catalog = enginesMap[summary.engine]?.modelCatalog;
  const selectEl = el<HTMLSelectElement>("detail-model-select");
  const customEl = el<HTMLInputElement>("detail-model-custom");
  const effortSelect = el<HTMLSelectElement>("detail-effort");
  const effortWrap = el("detail-effort-wrap");

  const preserve = !forceReset && detailComposerTouchedId === summary.cliSessionId;
  const desiredModel = preserve ? resolveSelectedModel(selectEl, customEl) : summary.model;
  const desiredEffort = preserve ? effortSelect.value || undefined : summary.reasoningEffort;

  populateModelSelect(selectEl, customEl, catalog, {
    ...(desiredModel ? { selectedModel: desiredModel } : {}),
    defaultLabel: catalog?.defaultModel ? `${catalog.defaultModel}` : "默认模型"
  });
  populateEffortSelect(effortSelect, effortWrap, catalog, resolveSelectedModel(selectEl, customEl), desiredEffort);
  syncDetailComposerPillLabels();
}

function syncDetailPrimaryAction(): void {
  const summary = detailTranscript?.summary;
  const sendBtn = el<HTMLButtonElement>("detail-send");
  const sideStopBtn = el<HTMLButtonElement>("detail-stop-side");
  const hint = el("detail-composer-hint");
  if (!summary) return;

  const isRunning = summary.status === "running" || summary.status === "starting";
  const hasText = el<HTMLTextAreaElement>("detail-input").value.trim().length > 0;

  if (isRunning && !hasText) {
    sendBtn.className = "composer-send-circle is-stop";
    sendBtn.dataset.action = "stop";
    sendBtn.title = "停止当前生成 (软中断)";
    sendBtn.setAttribute("aria-label", "停止当前生成");
    setOnlyIcon(sendBtn, "square", 11);
    sideStopBtn.hidden = true;
    hint.textContent = "运行中 · 输入可排队或插话";
  } else {
    sendBtn.className = "composer-send-circle";
    sendBtn.dataset.action = "send";
    sideStopBtn.hidden = !isRunning;
    if (isRunning) {
      const icon: UiIconName = detailFollowUpMode === "queue" ? "listPlus" : "cornerUpRight";
      setOnlyIcon(sendBtn, icon, 14);
      sendBtn.title = detailFollowUpMode === "queue" ? "加入发送队列 (Enter)" : "运行中直接插话 (Enter)";
      sendBtn.setAttribute("aria-label", sendBtn.title);
      hint.textContent =
        detailFollowUpMode === "queue" ? "Enter 排队 · Ctrl+Enter 插话" : "Enter 插话 · Ctrl+Enter 排队";
    } else {
      setOnlyIcon(sendBtn, "arrowUp", 15);
      const settled = summary.executionSettled || isTerminalCliStatus(summary.status);
      sendBtn.title = settled ? "恢复并发送 (Enter)" : "发送指令 (Enter)";
      sendBtn.setAttribute("aria-label", sendBtn.title);
      hint.textContent = "Enter 发送 · Shift+Enter 换行";
    }
  }
}

function syncDetailHeader(summary: CliSessionSummary): void {
  const st = statusDisplay(summary.status);
  const iconHost = el("detail-engine-icon");
  if (iconHost.dataset.engine !== summary.engine) {
    iconHost.dataset.engine = summary.engine;
    iconHost.replaceChildren(createProviderIcon(summary.engine, 14));
  }
  el("detail-switcher-label").textContent = summary.label ?? summary.cliSessionId;
  syncDetailSessionSelect();

  const statusEl = el("detail-status");
  statusEl.className = `cli-pill ${st.tone}`;
  statusEl.replaceChildren();
  const dot = document.createElement("span");
  dot.className = `status-dot ${st.tone}`;
  statusEl.append(dot, document.createTextNode(st.label));

  const agentBadge = el("detail-agent-badge");
  const agentOwned = isAgentOwnedSession(summary);
  agentBadge.hidden = !agentOwned;
  if (agentOwned) {
    agentBadge.replaceChildren(createUiIcon("sparkles", 10), document.createTextNode("智能体"));
    agentBadge.title = [
      "由 CoTree 智能体启动的 CLI 会话",
      summary.ownerAgentId ? `agent: ${summary.ownerAgentId}` : "",
      summary.ownerSessionId ? `session: ${summary.ownerSessionId}` : ""
    ].filter(Boolean).join("\n");
  }

  syncDetailSilenceIndicator(summary);
  el("detail-plan-badge").hidden = summary.interactionMode !== "plan";

  const metaParts = [
    engineDisplayName(summary.engine),
    `Turn ${summary.turnCount}`,
    formatModelBadge(summary.model, summary.reasoningEffort),
    summary.cwdRelative !== "." ? summary.cwdRelative : "",
    formatUsageSummary(summary.totalUsage, summary.totalCostUsd)
  ].filter(Boolean);
  el("detail-meta").textContent = metaParts.join(" · ");
  el("detail-meta").title = `cwd: ${summary.cwdRelative} · id: ${summary.cliSessionId}`;

  renderDetailContextMeter(summary);

  const settled = summary.executionSettled || isTerminalCliStatus(summary.status);
  el<HTMLButtonElement>("detail-interrupt").disabled = settled;
  el<HTMLButtonElement>("detail-kill").disabled = settled;

  el<HTMLSelectElement>("detail-permission").value = summary.permissionMode ?? "supervised";
  syncDetailComposerPillLabels();

  el<HTMLButtonElement>("detail-plan-toggle").classList.toggle("active", summary.interactionMode === "plan");
  const followBtn = el<HTMLButtonElement>("detail-followup-mode");
  setIconAndText(
    followBtn,
    detailFollowUpMode === "queue" ? "listPlus" : "cornerUpRight",
    detailFollowUpMode === "queue" ? "排队" : "插话",
    12
  );
  followBtn.classList.toggle("active", detailFollowUpMode === "steer");

  syncDetailPrimaryAction();
}

function renderDetailInterventions(cliSessionId: string, items: CliPendingIntervention[]): void {
  const dock = el("detail-interventions-dock");
  const list = el("detail-interventions-list");
  list.replaceChildren();
  dock.hidden = items.length === 0;
  for (const item of items) {
    list.append(
      renderInterventionCard(cliSessionId, item, async (payload) => {
        try {
          await view.services.call(SERVICE_ID, "view.respond", payload);
          setDetailNotice(`已响应干预 ${item.id}`);
        } catch (err) {
          setDetailNotice(err instanceof Error ? err.message : String(err), true);
        }
      })
    );
  }
}

function renderDetailQueueDock(queue: CliQueuedMessage[], paused: boolean): void {
  const dock = el("detail-queue-dock");
  dock.replaceChildren();
  if (queue.length === 0) {
    dock.hidden = true;
    return;
  }
  dock.hidden = false;

  const head = document.createElement("div");
  head.className = "cli-row cli-between";
  const title = document.createElement("span");
  title.className = "queue-dock-title";
  title.textContent = paused ? `发送队列已暂停 (${queue.length})` : `待发送队列 (${queue.length})`;
  head.append(title);

  if (paused) {
    const resumeBtn = document.createElement("button");
    resumeBtn.type = "button";
    resumeBtn.className = "cli-mini-btn accent";
    resumeBtn.textContent = "恢复队列";
    resumeBtn.addEventListener("click", () => {
      if (!detailSessionId) return;
      void view.services
        .call(SERVICE_ID, "view.queue", { cliSessionId: detailSessionId, action: "resume" })
        .catch((err) => setDetailNotice(err instanceof Error ? err.message : String(err), true));
    });
    head.append(resumeBtn);
  }
  dock.append(head);

  for (const item of queue) {
    const row = document.createElement("div");
    row.className = "queue-item-card";

    const text = document.createElement("span");
    text.className = "queue-item-text";
    text.textContent = item.message;
    text.title = item.message;

    const btns = document.createElement("div");
    btns.className = "cli-row";

    const sendNowBtn = document.createElement("button");
    sendNowBtn.type = "button";
    sendNowBtn.className = "cli-mini-btn accent";
    sendNowBtn.textContent = "立即发";
    sendNowBtn.addEventListener("click", () => {
      if (!detailSessionId) return;
      void view.services
        .call(SERVICE_ID, "view.queue", { cliSessionId: detailSessionId, action: "promote", queueId: item.id })
        .catch((err) => setDetailNotice(err instanceof Error ? err.message : String(err), true));
    });

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "cli-mini-btn";
    editBtn.textContent = "编辑";
    editBtn.addEventListener("click", () => {
      if (!detailSessionId) return;
      const ta = el<HTMLTextAreaElement>("detail-input");
      ta.value = item.message;
      autoResizeDetailTextarea();
      syncDetailPrimaryAction();
      ta.focus();
      void view.services
        .call(SERVICE_ID, "view.queue", { cliSessionId: detailSessionId, action: "remove", queueId: item.id })
        .catch(() => undefined);
    });

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "reui-icon-btn danger";
    delBtn.title = "移除排队消息";
    delBtn.setAttribute("aria-label", "移除排队消息");
    setOnlyIcon(delBtn, "x", 12);
    delBtn.addEventListener("click", () => {
      if (!detailSessionId) return;
      void view.services
        .call(SERVICE_ID, "view.queue", { cliSessionId: detailSessionId, action: "remove", queueId: item.id })
        .catch((err) => setDetailNotice(err instanceof Error ? err.message : String(err), true));
    });

    btns.append(sendNowBtn, editBtn, delBtn);
    row.append(text, btns);
    dock.append(row);
  }
}

function renderDetailRawView(transcript: CliSessionTranscript): void {
  const rawEvents = el("detail-raw-events");
  rawEvents.replaceChildren();
  for (const ev of [...transcript.events].reverse()) {
    const row = document.createElement("div");
    row.className = "raw-event-row cli-mono";
    const s = document.createElement("span");
    s.textContent = `#${ev.seq}`;
    const t = document.createElement("span");
    t.textContent = `${formatPreciseTime(ev.at)} ${ev.type}`;
    const m = document.createElement("span");
    m.textContent = ev.summary;
    row.append(s, t, m);
    rawEvents.append(row);
  }
  el("detail-raw-stdout").textContent = transcript.rawTail?.stdout || "(无原始 stdout 缓存)";
  el("detail-raw-stderr").textContent = transcript.rawTail?.stderr || "(无原始 stderr 缓存)";
}

function clearDetailMountedTurns(): void {
  for (const handle of detailTurnNodes.values()) handle.dispose();
  detailTurnNodes.clear();
  detailOptimisticNodes.clear();
  el("detail-turns-container").replaceChildren();
}

function makeDetailBlockCallbacks(cliSessionId: string, engine?: CliEngine): BlockActionCallbacks {
  return {
    ...(engine ? { engine } : {}),
    onOpenFile: (p, line) => openLocalFile(p, line),
    onOpenReview: () => openReviewPanel(),
    onLoadBlockDetail: async (blockId) => {
      const res = (await view.services.call(SERVICE_ID, "view.blockDetail", {
        cliSessionId,
        blockId
      })) as unknown as { text: string };
      return res.text;
    },
    onLoadWorkspaceImage: (p) => loadWorkspaceImageBlobUrl(p),
    onOpenLightbox: (src, caption, p) => openDetailLightbox(src, caption, p),
    onImplementPlan: async () => {
      try {
        await applyDetailModeChange({ interactionMode: "default" });
        await sendPromptToDetailSession("方案已确认，请按上述规划开始实施并验证。");
      } catch (err) {
        setDetailNotice(err instanceof Error ? err.message : String(err), true);
      }
    },
    onRevisePlan: () => {
      const ta = el<HTMLTextAreaElement>("detail-input");
      ta.value = "请调整上述方案：";
      autoResizeDetailTextarea();
      syncDetailPrimaryAction();
      ta.focus();
    },
    onForkAtTurn: async (turnIndex) => {
      await forkDetailSession(turnIndex);
    },
    onUndoTurn: async (turnIndex, canUndoFiles, hasCheckpoint) => {
      await undoDetailTurn(turnIndex, canUndoFiles, hasCheckpoint);
    }
  };
}

function mountDetailTranscript(
  transcript: CliSessionTranscript,
  options: { restoreScrollTop?: number } = {}
): void {
  detailTranscript = transcript;
  syncDetailHeader(transcript.summary);
  syncDetailModelPicker(transcript.summary, true);
  renderDetailInterventions(transcript.summary.cliSessionId, transcript.summary.pendingInterventions);
  renderDetailQueueDock(transcript.queue ?? [], transcript.summary.queuePaused === true);

  clearDetailMountedTurns();
  const container = el("detail-turns-container");
  const callbacks = makeDetailBlockCallbacks(transcript.summary.cliSessionId, transcript.summary.engine);
  if (transcript.turns.length === 0) {
    const empty = document.createElement("div");
    empty.className = "detail-empty-turns";
    empty.textContent = "会话已就绪，输入下方指令即可开始交互…";
    container.append(empty);
  } else {
    for (const turn of transcript.turns) {
      const handle = createTurnDomHandle(turn, callbacks);
      detailTurnNodes.set(turn.turnIndex, handle);
      container.append(handle.element);
    }
  }

  el("detail-older-wrap").hidden = !transcript.hasOlderTurns || detailViewMode === "raw";
  renderChangedFilesBar(el("detail-changed-files"), transcript.turns, {
    onOpenFile: (p) => openLocalFile(p),
    onOpenReview: () => openReviewPanel()
  });

  el("detail-turns-container").hidden = detailViewMode === "raw";
  el("detail-raw-view").hidden = detailViewMode !== "raw";
  if (detailViewMode === "raw") {
    renderDetailRawView(transcript);
  }

  if (transcript.summary.lastError) {
    setDetailNotice(transcript.summary.lastError, true);
  } else {
    setDetailNotice("");
  }

  if (options.restoreScrollTop !== undefined) {
    el("detail-stream-viewport").scrollTop = options.restoreScrollTop;
  } else {
    scheduleDetailAutoScroll();
  }
}

function applyDeltasToDetail(
  cliSessionId: string,
  deltas: CliTranscriptDelta[],
  latestSeq?: number,
  event?: CliTimelineEvent
): void {
  if (!detailTranscript || detailTranscript.summary.cliSessionId !== cliSessionId) return;
  if (latestSeq !== undefined) detailTranscript.summary.latestSeq = latestSeq;
  if (deltas.length > 0 || event) {
    detailTranscript.summary.updatedAt = event?.at ?? new Date().toISOString();
    syncDetailSilenceIndicator(detailTranscript.summary);
  }
  if (event) {
    detailTranscript.events.push(event);
    if (detailTranscript.events.length > 200) detailTranscript.events.shift();
  }

  const container = el("detail-turns-container");
  const callbacks = makeDetailBlockCallbacks(cliSessionId, detailTranscript.summary.engine);
  let changedFilesDirty = false;

  for (const delta of deltas) {
    switch (delta.kind) {
      case "turn.upsert": {
        const placeholder = container.querySelector(".detail-empty-turns");
        if (placeholder) placeholder.remove();
        if (delta.clientMsgId && detailOptimisticNodes.has(delta.clientMsgId)) {
          detailOptimisticNodes.get(delta.clientMsgId)?.remove();
          detailOptimisticNodes.delete(delta.clientMsgId);
        }
        const existingIdx = detailTranscript.turns.findIndex((t) => t.turnIndex === delta.turn.turnIndex);
        if (existingIdx >= 0) detailTranscript.turns[existingIdx] = delta.turn;
        else detailTranscript.turns.push(delta.turn);

        const existingNode = detailTurnNodes.get(delta.turn.turnIndex);
        if (existingNode) {
          existingNode.syncTurn(delta.turn);
        } else {
          const handle = createTurnDomHandle(delta.turn, callbacks);
          detailTurnNodes.set(delta.turn.turnIndex, handle);
          container.append(handle.element);
        }
        changedFilesDirty = true;
        break;
      }
      case "block.upsert": {
        let turnHandle = detailTurnNodes.get(delta.turnIndex);
        if (!turnHandle) {
          const turnObj = detailTranscript.turns.find((t) => t.turnIndex === delta.turnIndex);
          if (turnObj) {
            const placeholder = container.querySelector(".detail-empty-turns");
            if (placeholder) placeholder.remove();
            turnHandle = createTurnDomHandle(turnObj, callbacks);
            detailTurnNodes.set(delta.turnIndex, turnHandle);
            container.append(turnHandle.element);
          }
        }
        if (turnHandle) {
          turnHandle.upsertBlock(delta.block);
        }
        if (delta.block.kind === "file_change") changedFilesDirty = true;
        break;
      }
      case "block.append": {
        const turnHandle = detailTurnNodes.get(delta.turnIndex);
        if (turnHandle) {
          turnHandle.appendBlockDelta(delta.blockId, delta.delta, delta.updatedAt);
        }
        const turnObj = detailTranscript.turns.find((t) => t.turnIndex === delta.turnIndex);
        const blkObj = turnObj?.blocks.find((b) => b.id === delta.blockId);
        if (blkObj) {
          blkObj.text += delta.delta;
          blkObj.updatedAt = delta.updatedAt;
        }
        break;
      }
      case "block.status": {
        const turnHandle = detailTurnNodes.get(delta.turnIndex);
        if (turnHandle) {
          turnHandle.updateBlockStatus(delta.blockId, delta.status, delta.title, delta.meta, delta.updatedAt);
        }
        break;
      }
      case "queue.set": {
        detailTranscript.queue = delta.queue;
        detailTranscript.summary.queuedCount = delta.queue.length;
        detailTranscript.summary.queuePaused = delta.paused;
        renderDetailQueueDock(delta.queue, delta.paused);
        syncDetailHeader(detailTranscript.summary);
        break;
      }
      case "interventions.set": {
        detailTranscript.summary.pendingInterventions = delta.items;
        renderDetailInterventions(cliSessionId, delta.items);
        syncDetailHeader(detailTranscript.summary);
        break;
      }
      case "checkpoint.updated": {
        const turnObj = detailTranscript.turns.find((t) => t.turnIndex === delta.turnIndex);
        if (turnObj) {
          turnObj.checkpoint = delta.checkpoint;
          detailTurnNodes.get(delta.turnIndex)?.updateCheckpoint(turnObj);
          changedFilesDirty = true;
        }
        break;
      }
      case "session.status": {
        const merged: CliSessionSummary = {
          ...detailTranscript.summary,
          ...delta.summary,
          lastAssistantText: delta.summary.lastAssistantPreview || detailTranscript.summary.lastAssistantText
        };
        detailTranscript.summary = merged;
        syncDetailHeader(merged);
        if (merged.lastError) setDetailNotice(merged.lastError, true);
        break;
      }
    }
  }

  if (changedFilesDirty) {
    renderChangedFilesBar(el("detail-changed-files"), detailTranscript.turns, {
      onOpenFile: (p) => openLocalFile(p),
      onOpenReview: () => openReviewPanel()
    });
  }
  if (detailViewMode === "raw") {
    renderDetailRawView(detailTranscript);
  }
  scheduleDetailAutoScroll();
}

function saveActiveDetailState(): void {
  if (!detailSessionId) return;
  detailDrafts.set(detailSessionId, el<HTMLTextAreaElement>("detail-input").value);
  if (detailTranscript && detailTranscript.summary.cliSessionId === detailSessionId) {
    detailCache.set(detailSessionId, {
      transcript: detailTranscript,
      scrollTop: el("detail-stream-viewport").scrollTop,
      cachedAt: Date.now()
    });
  }
}

async function openDetailSession(
  targetId: string,
  options: { forceFull?: boolean; refreshModels?: boolean } = {}
): Promise<void> {
  if (detailSessionId && detailSessionId !== targetId) {
    saveActiveDetailState();
  }
  detailSessionId = targetId;
  detailComposerTouchedId = undefined;
  setSidecarPage("detail");

  const ta = el<HTMLTextAreaElement>("detail-input");
  ta.value = detailDrafts.get(targetId) ?? "";
  autoResizeDetailTextarea();

  const cached = !options.forceFull ? detailCache.get(targetId) : undefined;
  const cacheValid = Boolean(cached && Date.now() - cached.cachedAt < CACHE_TTL_MS);
  if (cacheValid && cached) {
    mountDetailTranscript(cached.transcript, { restoreScrollTop: cached.scrollTop });
  } else {
    const summaryFallback = sessions.find((s) => s.cliSessionId === targetId);
    if (summaryFallback) syncDetailHeader(summaryFallback);
    clearDetailMountedTurns();
    const loading = document.createElement("div");
    loading.className = "detail-empty-turns";
    loading.textContent = "正在加载会话内容…";
    el("detail-turns-container").append(loading);
  }

  try {
    const res = (await view.services.call(SERVICE_ID, "view.transcript", {
      cliSessionId: targetId,
      focus: false,
      ...(cacheValid && cached && cached.transcript.summary.latestSeq > 0
        ? { afterSeq: cached.transcript.summary.latestSeq }
        : {}),
      includeRawTail: detailViewMode === "raw",
      refreshModels: options.refreshModels === true
    })) as unknown as TranscriptResponse;

    if (detailSessionId !== targetId) return;
    if (res.engines) {
      enginesMap = res.engines;
      renderEngines();
    }
    if (res.enginePreferences) enginePreferences = res.enginePreferences;
    if (res.sessions) {
      sessions = res.sessions;
      syncSessionListIncremental();
    }

    if (res.incremental && res.deltas) {
      if (res.summary && detailTranscript) {
        detailTranscript.summary = res.summary;
        syncDetailHeader(res.summary);
      }
      applyDeltasToDetail(targetId, res.deltas, res.latestSeq);
    } else if (res.transcript) {
      mountDetailTranscript(res.transcript);
      detailCache.set(targetId, {
        transcript: res.transcript,
        scrollTop: el("detail-stream-viewport").scrollTop,
        cachedAt: Date.now()
      });
    } else {
      setDetailNotice("该会话已不存在。", true);
    }
  } catch (err) {
    setDetailNotice(err instanceof Error ? err.message : String(err), true);
  }
}

async function sendPromptToDetailSession(message: string, useOppositeMode = false): Promise<void> {
  if (!detailSessionId || !detailTranscript) return;
  const trimmed = message.trim();
  if (!trimmed) return;
  const targetSessionId = detailSessionId;
  const summary = detailTranscript.summary;
  const isRunning = summary.status === "running" || summary.status === "needs_intervention";
  const effectiveMode: CliFollowUpMode = useOppositeMode
    ? detailFollowUpMode === "queue"
      ? "steer"
      : "queue"
    : detailFollowUpMode;
  const strategy = isRunning ? (effectiveMode === "queue" ? "queue" : "auto") : "auto";

  const model = resolveSelectedModel(el<HTMLSelectElement>("detail-model-select"), el<HTMLInputElement>("detail-model-custom"));
  const effort = el<HTMLSelectElement>("detail-effort").value || undefined;
  const permissionMode = el<HTMLSelectElement>("detail-permission").value as CliPermissionMode;
  const interactionMode: CliInteractionMode = el<HTMLButtonElement>("detail-plan-toggle").classList.contains("active")
    ? "plan"
    : "default";

  const clientMsgId = `opt_sc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  if (strategy !== "queue") {
    const container = el("detail-turns-container");
    const placeholder = container.querySelector(".detail-empty-turns");
    if (placeholder) placeholder.remove();
    const row = document.createElement("div");
    row.className = "cli-user-row user";
    const bubble = document.createElement("div");
    bubble.className = "cli-bubble user optimistic";
    const body = document.createElement("div");
    body.className = "cli-bubble-body";
    body.textContent = trimmed;
    bubble.append(body);
    const meta = document.createElement("div");
    meta.className = "cli-bubble-meta";
    meta.textContent = "发送中…";
    row.append(bubble, meta);
    container.append(row);
    detailOptimisticNodes.set(clientMsgId, row);
    scheduleDetailAutoScroll();
  }

  try {
    const res = (await view.services.call(SERVICE_ID, "view.steer", {
      cliSessionId: targetSessionId,
      message: trimmed,
      strategy,
      clientMsgId,
      permissionMode,
      interactionMode,
      ...(model ? { model } : {}),
      ...(effort ? { reasoningEffort: effort } : {})
    })) as unknown as { queued?: boolean };
    detailComposerTouchedId = undefined;
    if (res.queued) {
      detailOptimisticNodes.get(clientMsgId)?.remove();
      detailOptimisticNodes.delete(clientMsgId);
      setDetailNotice("已加入队列，本轮结束后将自动发送。");
    } else {
      setDetailNotice("");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setDetailNotice(msg, true);
    const optEl = detailOptimisticNodes.get(clientMsgId);
    if (optEl) {
      const meta = optEl.querySelector(".cli-bubble-meta");
      if (meta) meta.textContent = `发送失败: ${msg}`;
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "cli-mini-btn accent";
      retry.textContent = "重试";
      retry.addEventListener("click", () => {
        optEl.remove();
        detailOptimisticNodes.delete(clientMsgId);
        void sendPromptToDetailSession(trimmed, useOppositeMode);
      });
      optEl.append(retry);
    }
  }
}

async function applyDetailModeChange(patch: {
  permissionMode?: CliPermissionMode;
  interactionMode?: CliInteractionMode;
  model?: string;
  reasoningEffort?: string;
}): Promise<void> {
  if (!detailSessionId) return;
  try {
    const res = (await view.services.call(SERVICE_ID, "view.setModes", {
      cliSessionId: detailSessionId,
      ...patch
    })) as unknown as { appliedLive?: boolean; summary?: CliSessionSummary };
    if (res.summary && detailTranscript && detailTranscript.summary.cliSessionId === detailSessionId) {
      detailTranscript.summary = res.summary;
      syncDetailHeader(res.summary);
    }
    setDetailNotice(res.appliedLive ? "模式已实时生效" : "模式已更新（下一轮生效）");
  } catch (err) {
    setDetailNotice(err instanceof Error ? err.message : String(err), true);
  }
}

async function forkDetailSession(atTurnIndex?: number): Promise<void> {
  if (!detailSessionId) return;
  closeDetailMoreMenu();
  try {
    setDetailNotice("正在创建分支会话…");
    const res = (await view.services.call(SERVICE_ID, "view.fork", {
      cliSessionId: detailSessionId,
      ...(atTurnIndex !== undefined ? { atTurnIndex } : {})
    })) as unknown as { cliSessionId?: string; forkMode?: string };
    if (res.cliSessionId) {
      setDetailNotice(`分支会话已就绪 (${res.forkMode ?? "fork"})`);
      await openDetailSession(res.cliSessionId, { forceFull: true });
    }
  } catch (err) {
    setDetailNotice(err instanceof Error ? err.message : String(err), true);
  }
}

async function undoDetailTurn(turnIndex: number, canUndoFiles: boolean, hasCheckpoint: boolean): Promise<void> {
  if (!detailSessionId) return;
  let revertFiles = false;
  let forceRevertFiles = false;
  if (hasCheckpoint) {
    if (canUndoFiles) {
      if (
        !window.confirm(
          `确定撤回 Turn #${turnIndex} 及之后的轮次？\n点击「确定」同时还原 worktree 磁盘文件；点击「取消」取消操作。`
        )
      ) {
        return;
      }
      revertFiles = true;
    } else {
      if (!window.confirm(`确认撤回 Turn #${turnIndex} 的对话上下文？`)) return;
      if (window.confirm("是否同时强制将主工作区磁盘文件回滚到该轮次之前？（不可撤销）")) {
        revertFiles = true;
        forceRevertFiles = true;
      }
    }
  } else {
    if (!window.confirm(`确认撤回 Turn #${turnIndex} 及之后的对话上下文？`)) return;
  }

  try {
    await view.services.call(SERVICE_ID, "view.undoTurn", {
      cliSessionId: detailSessionId,
      turnIndex,
      revertFiles,
      forceRevertFiles
    });
    setDetailNotice(`已撤回至 Turn #${Math.max(0, turnIndex - 1)}${revertFiles ? "（并还原文件）" : ""}`);
    await openDetailSession(detailSessionId, { forceFull: true });
  } catch (err) {
    setDetailNotice(err instanceof Error ? err.message : String(err), true);
  }
}

async function compactDetailSession(): Promise<void> {
  if (!detailSessionId) return;
  closeDetailMoreMenu();
  try {
    const res = (await view.services.call(SERVICE_ID, "view.compact", {
      cliSessionId: detailSessionId
    })) as unknown as { ok?: boolean; note?: string };
    setDetailNotice(res.note ?? (res.ok ? "已触发上下文压缩。" : "无法压缩上下文。"));
  } catch (err) {
    setDetailNotice(err instanceof Error ? err.message : String(err), true);
  }
}

// ============================================================================
// Inspection & Resilient Reconciliation
// ============================================================================

async function loadInspect(refreshModels = false, silentError = false): Promise<void> {
  try {
    const res = (await view.services.call(SERVICE_ID, "view.inspect", {
      includeModels: true,
      refreshModels
    })) as unknown as InspectResult;
    enginesMap = res.engines ?? {};
    enginePreferences = res.enginePreferences ?? {};
    sessions = res.sessions ?? [];
    renderWorkspaceContextBar(res.controlWorkspace);
    renderEngines();
    syncStartModelPicker({ preserveCurrentSelection: Boolean(launcherTouchedEngine) });
    syncSessionListIncremental();
    setNotice("");

    if (!initialInspectHandled) {
      initialInspectHandled = true;
      if (res.focusedByRequest && res.focusedCliSessionId) {
        void openDetailSession(res.focusedCliSessionId);
      }
    }
  } catch (err) {
    if (!silentError) {
      setNotice(err instanceof Error ? err.message : String(err), true);
    }
  }
}

async function reconcileActiveDetail(): Promise<void> {
  if (activePage !== "detail" || !detailSessionId || !detailTranscript) return;
  const targetId = detailSessionId;
  const afterSeq = detailTranscript.summary.latestSeq;
  const vp = el("detail-stream-viewport");
  const prevScrollTop = vp.scrollTop;
  const nearBottom = vp.scrollHeight - vp.scrollTop - vp.clientHeight < 64;

  const res = (await view.services.call(SERVICE_ID, "view.transcript", {
    cliSessionId: targetId,
    focus: false,
    ...(afterSeq > 0 ? { afterSeq } : {}),
    includeRawTail: detailViewMode === "raw",
    refreshModels: false
  })) as unknown as TranscriptResponse;

  if (detailSessionId !== targetId) return;
  if (res.engines) {
    enginesMap = res.engines;
    renderEngines();
  }
  if (res.enginePreferences) enginePreferences = res.enginePreferences;
  if (res.sessions) {
    sessions = res.sessions;
    syncSessionListIncremental();
  }

  if (res.incremental && res.deltas) {
    if (res.summary && detailTranscript) {
      detailTranscript.summary = res.summary;
      syncDetailHeader(res.summary);
    }
    if (
      res.deltas.length > 0 ||
      (res.latestSeq !== undefined && detailTranscript && res.latestSeq > detailTranscript.summary.latestSeq)
    ) {
      applyDeltasToDetail(targetId, res.deltas, res.latestSeq);
    }
  } else if (res.transcript) {
    mountDetailTranscript(res.transcript, nearBottom ? {} : { restoreScrollTop: prevScrollTop });
    detailCache.set(targetId, {
      transcript: res.transcript,
      scrollTop: el("detail-stream-viewport").scrollTop,
      cachedAt: Date.now()
    });
  }
}

async function reconcileSidecar(force = false): Promise<void> {
  if (reconciling) return;
  const now = Date.now();
  if (!force && now - lastReconcileAt < 1_500) return;
  reconciling = true;
  lastReconcileAt = now;
  try {
    if (activePage === "detail" && detailSessionId && detailTranscript) {
      await reconcileActiveDetail();
    } else {
      await loadInspect(false, true);
    }
  } catch {
    // Background reconciliation retries on next event or watchdog tick.
  } finally {
    reconciling = false;
  }
}

function refreshAllSilenceBadges(): void {
  for (const session of sessions) {
    const handle = cardNodes.get(session.cliSessionId);
    if (handle) syncCardSilence(handle, session);
  }
  if (activePage === "detail" && detailTranscript) {
    syncDetailSilenceIndicator(detailTranscript.summary);
  }
}

// ============================================================================
// Wire DOM Events
// ============================================================================

hydrateStaticChrome();

el("open-transcript").addEventListener("click", () => void openTranscriptFor(detailSessionId));
el("refresh").addEventListener("click", () => void loadInspect(true));

const notifyBtn = el<HTMLButtonElement>("btn-notify");
const syncNotifyIcon = () => {
  const pref = getNotificationPref();
  setOnlyIcon(notifyBtn, notificationPrefIcon(pref), 14);
  notifyBtn.title = `提醒偏好: ${notificationPrefLabel(pref)}（点击切换）`;
};
syncNotifyIcon();
notifyBtn.addEventListener("click", () => {
  setNotificationPref(cycleNotificationPref(getNotificationPref()));
  syncNotifyIcon();
});

for (const btn of Array.from(document.querySelectorAll<HTMLButtonElement>(".tab-btn[data-filter]"))) {
  btn.addEventListener("click", () => {
    filterMode = (btn.dataset.filter as FilterMode) ?? "all";
    for (const b of Array.from(document.querySelectorAll<HTMLButtonElement>(".tab-btn[data-filter]"))) {
      b.classList.toggle("active", b === btn);
      b.setAttribute("aria-selected", String(b === btn));
    }
    syncSessionListIncremental();
  });
}

el("start-engine").addEventListener("change", () => {
  launcherTouchedEngine = el<HTMLSelectElement>("start-engine").value as CliEngine;
  syncStartModelPicker();
});
el("start-model-select").addEventListener("change", () => {
  syncModelCustomInputVisibility(el<HTMLSelectElement>("start-model-select"), el<HTMLInputElement>("start-model-custom"));
  const engine = el<HTMLSelectElement>("start-engine").value as CliEngine;
  populateEffortSelect(
    el<HTMLSelectElement>("start-effort"),
    el("start-effort-wrap"),
    enginesMap[engine]?.modelCatalog,
    resolveSelectedModel(el<HTMLSelectElement>("start-model-select"), el<HTMLInputElement>("start-model-custom")),
    el<HTMLSelectElement>("start-effort").value || undefined
  );
});
el("start-refresh-models").addEventListener("click", async () => {
  const engine = el<HTMLSelectElement>("start-engine").value as CliEngine;
  const res = (await view.services.call(SERVICE_ID, "view.models", { engine, refresh: true })) as unknown as {
    engines?: EnginesInspectMap;
  };
  if (res.engines) {
    enginesMap = { ...enginesMap, ...res.engines };
    renderEngines();
    syncStartModelPicker({ preserveCurrentSelection: true });
  }
});

el("start-submit").addEventListener("click", async () => {
  const btn = el<HTMLButtonElement>("start-submit");
  btn.disabled = true;
  setStartStatus("正在启动外部 CLI…");
  try {
    const engine = el<HTMLSelectElement>("start-engine").value as CliEngine;
    const model = resolveSelectedModel(el<HTMLSelectElement>("start-model-select"), el<HTMLInputElement>("start-model-custom"));
    const effort = el<HTMLSelectElement>("start-effort").value || undefined;
    const prompt = el<HTMLTextAreaElement>("start-prompt").value.trim();
    const started = (await view.services.call(SERVICE_ID, "view.start", {
      engine,
      permissionMode: el<HTMLSelectElement>("start-permission").value,
      interactionMode: el<HTMLSelectElement>("start-interaction").value,
      cwd: el<HTMLInputElement>("start-cwd").value.trim() || ".",
      ...(el<HTMLInputElement>("start-label").value.trim() ? { label: el<HTMLInputElement>("start-label").value.trim() } : {}),
      ...(model ? { model } : {}),
      ...(effort ? { reasoningEffort: effort } : {}),
      rememberPreference: el<HTMLInputElement>("start-remember-model").checked,
      ...(prompt ? { prompt } : {})
    })) as unknown as { cliSessionId?: string };
    el<HTMLTextAreaElement>("start-prompt").value = "";
    el<HTMLDetailsElement>("launcher").open = false;
    setStartStatus("");
    if (started.cliSessionId) {
      await loadInspect(false);
      await openDetailSession(started.cliSessionId, { forceFull: true });
    }
  } catch (err) {
    setStartStatus(err instanceof Error ? err.message : String(err), true);
  } finally {
    btn.disabled = false;
  }
});

// Detail Page Controls
el("detail-back").addEventListener("click", () => {
  saveActiveDetailState();
  setSidecarPage("list");
  syncSessionListIncremental();
});

el("detail-session-select").addEventListener("change", () => {
  const nextId = el<HTMLSelectElement>("detail-session-select").value;
  if (nextId && nextId !== detailSessionId) {
    void openDetailSession(nextId);
  }
});

el("detail-review").addEventListener("click", () => openReviewPanel());
el("detail-fullscreen").addEventListener("click", () => void openTranscriptFor(detailSessionId));
el("detail-ctx-meter").addEventListener("click", () => void compactDetailSession());

el("detail-more").addEventListener("click", (ev) => {
  ev.stopPropagation();
  const menu = el("detail-more-menu");
  const nextOpen = menu.hidden;
  menu.hidden = !nextOpen;
  el("detail-more").setAttribute("aria-expanded", String(nextOpen));
});

document.addEventListener("click", (ev) => {
  const target = ev.target as HTMLElement | null;
  if (!el("detail-more-menu").hidden && !target?.closest(".reui-menu-wrap")) {
    closeDetailMoreMenu();
  }
});

document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape") {
    closeDetailMoreMenu();
    el("detail-handoff-modal").hidden = true;
    el("detail-lightbox-modal").hidden = true;
  }
});

el("detail-toggle-raw").addEventListener("click", () => {
  closeDetailMoreMenu();
  detailViewMode = detailViewMode === "readable" ? "raw" : "readable";
  syncDetailRawMenuLabel();
  el("detail-turns-container").hidden = detailViewMode === "raw";
  el("detail-raw-view").hidden = detailViewMode !== "raw";
  el("detail-older-wrap").hidden = detailViewMode === "raw" || !detailTranscript?.hasOlderTurns;
  if (detailViewMode === "raw" && detailSessionId) {
    void openDetailSession(detailSessionId, { forceFull: true });
  }
});

el("detail-autoscroll-row").addEventListener("click", (ev) => {
  ev.stopPropagation();
  const cb = el<HTMLInputElement>("detail-auto-scroll");
  cb.checked = !cb.checked;
  el("detail-autoscroll-row").setAttribute("aria-checked", String(cb.checked));
});

el("detail-fork").addEventListener("click", () => void forkDetailSession());
el("detail-compact").addEventListener("click", () => void compactDetailSession());

el("detail-handoff").addEventListener("click", () => {
  closeDetailMoreMenu();
  if (!detailTranscript) return;
  const currentEngine = detailTranscript.summary.engine;
  const select = el<HTMLSelectElement>("detail-handoff-engine");
  if (select.value === currentEngine) {
    select.value = currentEngine === "claude" ? "codex" : "claude";
  }
  el("detail-handoff-modal").hidden = false;
});
el("detail-handoff-close").addEventListener("click", () => {
  el("detail-handoff-modal").hidden = true;
});
el("detail-handoff-cancel").addEventListener("click", () => {
  el("detail-handoff-modal").hidden = true;
});
el("detail-handoff-modal").addEventListener("click", (ev) => {
  if (ev.target === el("detail-handoff-modal")) el("detail-handoff-modal").hidden = true;
});
el("detail-handoff-submit").addEventListener("click", async () => {
  if (!detailSessionId) return;
  const btn = el<HTMLButtonElement>("detail-handoff-submit");
  btn.disabled = true;
  try {
    const promptVal = el<HTMLTextAreaElement>("detail-handoff-prompt").value.trim();
    const res = (await view.services.call(SERVICE_ID, "view.handoff", {
      cliSessionId: detailSessionId,
      targetEngine: el<HTMLSelectElement>("detail-handoff-engine").value,
      ...(promptVal ? { prompt: promptVal } : {})
    })) as unknown as { cliSessionId?: string; includedTurns?: number };
    el("detail-handoff-modal").hidden = true;
    el<HTMLTextAreaElement>("detail-handoff-prompt").value = "";
    setDetailNotice(`已完成跨引擎交接 (${res.includedTurns ?? 0} 轮上下文)`);
    if (res.cliSessionId) {
      await openDetailSession(res.cliSessionId, { forceFull: true });
    }
  } catch (err) {
    setDetailNotice(err instanceof Error ? err.message : String(err), true);
  } finally {
    btn.disabled = false;
  }
});

// Lightbox modal
el("detail-lightbox-close").addEventListener("click", () => {
  el("detail-lightbox-modal").hidden = true;
});
el("detail-lightbox-modal").addEventListener("click", (ev) => {
  if (ev.target === el("detail-lightbox-modal")) el("detail-lightbox-modal").hidden = true;
});
el("detail-lightbox-open-file").addEventListener("click", () => {
  if (detailLightboxFilePath) openLocalFile(detailLightboxFilePath);
});

const triggerDetailInterrupt = async () => {
  if (!detailSessionId) return;
  closeDetailMoreMenu();
  try {
    await view.services.call(SERVICE_ID, "view.stop", { cliSessionId: detailSessionId, mode: "interrupt" });
  } catch (err) {
    setDetailNotice(err instanceof Error ? err.message : String(err), true);
  }
};

el("detail-interrupt").addEventListener("click", () => void triggerDetailInterrupt());
el("detail-stop-side").addEventListener("click", () => void triggerDetailInterrupt());
function applySidecarSessionDeleted(deletedId: string): void {
  if (armedCardDeleteId === deletedId) disarmCardDelete();
  sessions = sessions.filter((s) => s.cliSessionId !== deletedId);
  openSteerIds.delete(deletedId);
  detailCache.delete(deletedId);
  detailDrafts.delete(deletedId);
  if (detailComposerTouchedId === deletedId) detailComposerTouchedId = undefined;
  syncSessionListIncremental();

  if (detailSessionId === deletedId) {
    detailSessionId = undefined;
    detailTranscript = null;
    detailTurnNodes.clear();
    detailOptimisticNodes.clear();
    el("detail-turns-container").replaceChildren();
    el("detail-interventions-list").replaceChildren();
    el("detail-interventions-dock").hidden = true;
    if (activePage === "detail") {
      setSidecarPage("list");
    }
  }
}

async function deleteSidecarSession(targetId: string, triggerBtn?: HTMLButtonElement): Promise<void> {
  const target = sessions.find((s) => s.cliSessionId === targetId);
  const label = target?.label ?? targetId;
  if (triggerBtn) triggerBtn.disabled = true;
  try {
    await view.services.call(SERVICE_ID, "view.delete", { cliSessionId: targetId });
    applySidecarSessionDeleted(targetId);
    setNotice(`已删除会话 ${label}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (activePage === "detail") setDetailNotice(msg, true);
    else setNotice(msg, true);
  } finally {
    if (triggerBtn && triggerBtn.isConnected) triggerBtn.disabled = false;
  }
}

el("detail-kill").addEventListener("click", async () => {
  if (!detailSessionId) return;
  closeDetailMoreMenu();
  try {
    await view.services.call(SERVICE_ID, "view.stop", { cliSessionId: detailSessionId, mode: "kill" });
  } catch (err) {
    setDetailNotice(err instanceof Error ? err.message : String(err), true);
  }
});
el("detail-delete").addEventListener("click", (ev) => {
  if (!detailSessionId) return;
  const current = detailTranscript?.summary ?? sessions.find((s) => s.cliSessionId === detailSessionId);
  if (current && isLiveActive(current) && !detailDeleteArmed) {
    ev.stopPropagation();
    detailDeleteArmed = true;
    el("detail-delete").replaceChildren(createMenuRowContent("trash2", "再次点击确认终止并删除"));
    detailDeleteTimer = window.setTimeout(() => disarmDetailDelete(), 4_000);
    return;
  }
  const targetId = detailSessionId;
  closeDetailMoreMenu();
  void deleteSidecarSession(targetId);
});

el("detail-load-older").addEventListener("click", async () => {
  if (!detailSessionId || !detailTranscript || !detailTranscript.oldestTurnIndex) return;
  const btn = el<HTMLButtonElement>("detail-load-older");
  btn.disabled = true;
  try {
    const res = (await view.services.call(SERVICE_ID, "view.transcriptPage", {
      cliSessionId: detailSessionId,
      beforeTurnIndex: detailTranscript.oldestTurnIndex,
      limit: 24
    })) as unknown as { turns: CliTranscriptTurn[]; hasOlderTurns: boolean; oldestTurnIndex?: number };
    if (res.turns.length > 0) {
      const viewport = el("detail-stream-viewport");
      const prevScrollHeight = viewport.scrollHeight;
      const container = el("detail-turns-container");
      const firstChild = container.firstChild;
      const callbacks = makeDetailBlockCallbacks(detailSessionId, detailTranscript.summary.engine);
      for (const turn of res.turns) {
        const handle = createTurnDomHandle(turn, callbacks);
        detailTurnNodes.set(turn.turnIndex, handle);
        container.insertBefore(handle.element, firstChild);
      }
      detailTranscript.turns = [...res.turns, ...detailTranscript.turns];
      detailTranscript.hasOlderTurns = res.hasOlderTurns;
      detailTranscript.oldestTurnIndex = res.oldestTurnIndex;
      viewport.scrollTop += viewport.scrollHeight - prevScrollHeight;
    }
    el("detail-older-wrap").hidden = !res.hasOlderTurns;
  } catch (err) {
    setDetailNotice(err instanceof Error ? err.message : String(err), true);
  } finally {
    btn.disabled = false;
  }
});

// Detail Composer Controls
const detailInput = el<HTMLTextAreaElement>("detail-input");
detailInput.addEventListener("input", () => {
  autoResizeDetailTextarea();
  syncDetailPrimaryAction();
});

const submitDetailComposer = async (useOppositeMode = false): Promise<void> => {
  const sendBtn = el<HTMLButtonElement>("detail-send");
  const text = detailInput.value.trim();
  if (!text) {
    if (sendBtn.dataset.action === "stop") {
      await triggerDetailInterrupt();
    }
    return;
  }
  detailInput.value = "";
  if (detailSessionId) detailDrafts.delete(detailSessionId);
  autoResizeDetailTextarea();
  syncDetailPrimaryAction();
  await sendPromptToDetailSession(text, useOppositeMode);
};

el("detail-send").addEventListener("click", () => void submitDetailComposer(false));
detailInput.addEventListener("keydown", (ev) => {
  if (ev.key === "Enter" && !ev.shiftKey && !ev.isComposing) {
    ev.preventDefault();
    void submitDetailComposer(ev.ctrlKey || ev.metaKey);
  }
});

el("detail-model-select").addEventListener("change", () => {
  if (!detailTranscript) return;
  detailComposerTouchedId = detailTranscript.summary.cliSessionId;
  const selectEl = el<HTMLSelectElement>("detail-model-select");
  const customEl = el<HTMLInputElement>("detail-model-custom");
  syncModelCustomInputVisibility(selectEl, customEl);
  const selectedModel = resolveSelectedModel(selectEl, customEl);
  populateEffortSelect(
    el<HTMLSelectElement>("detail-effort"),
    el("detail-effort-wrap"),
    enginesMap[detailTranscript.summary.engine]?.modelCatalog,
    selectedModel,
    el<HTMLSelectElement>("detail-effort").value || undefined
  );
  syncDetailComposerPillLabels();
  if (selectedModel) {
    void applyDetailModeChange({ model: selectedModel });
  }
});

el("detail-model-custom").addEventListener("change", () => {
  if (!detailTranscript) return;
  detailComposerTouchedId = detailTranscript.summary.cliSessionId;
  const customVal = el<HTMLInputElement>("detail-model-custom").value.trim();
  if (customVal) void applyDetailModeChange({ model: customVal });
});

el("detail-effort").addEventListener("change", () => {
  if (!detailTranscript) return;
  detailComposerTouchedId = detailTranscript.summary.cliSessionId;
  syncDetailComposerPillLabels();
  const effort = el<HTMLSelectElement>("detail-effort").value || undefined;
  if (effort) void applyDetailModeChange({ reasoningEffort: effort });
});

el("detail-permission").addEventListener("change", () => {
  syncDetailComposerPillLabels();
  const perm = el<HTMLSelectElement>("detail-permission").value as CliPermissionMode;
  void applyDetailModeChange({ permissionMode: perm });
});

el("detail-plan-toggle").addEventListener("click", () => {
  if (!detailTranscript) return;
  const next: CliInteractionMode = detailTranscript.summary.interactionMode === "plan" ? "default" : "plan";
  void applyDetailModeChange({ interactionMode: next });
});

el("detail-followup-mode").addEventListener("click", () => {
  detailFollowUpMode = detailFollowUpMode === "queue" ? "steer" : "queue";
  if (detailTranscript) syncDetailHeader(detailTranscript.summary);
});

// ============================================================================
// Live SSE (Split Protocol: Rail + Live 60fps Transcript Deltas + Focus)
// ============================================================================

view.services.subscribe(SERVICE_ID, (event) => {
  lastSseEventAt = Date.now();
  const payload = (event.payload ?? {}) as Record<string, unknown>;
  switch (event.topic) {
    case "rail.updated": {
      const rail = payload.summary as CliRailSessionSummary | undefined;
      if (!rail) return;
      const idx = sessions.findIndex((s) => s.cliSessionId === rail.cliSessionId);
      const merged: CliSessionSummary = {
        ...(idx >= 0 ? sessions[idx]! : ({} as CliSessionSummary)),
        ...rail,
        lastAssistantText: rail.lastAssistantPreview
      };
      if (idx >= 0) sessions[idx] = merged;
      else sessions.unshift(merged);
      sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      syncSessionListIncremental();
      if (detailTranscript && detailTranscript.summary.cliSessionId === merged.cliSessionId) {
        detailTranscript.summary = {
          ...detailTranscript.summary,
          ...merged
        };
        syncDetailHeader(detailTranscript.summary);
      }
      break;
    }
    case "transcript.delta": {
      const cliSessionId = typeof payload.cliSessionId === "string" ? payload.cliSessionId : undefined;
      const deltas = Array.isArray(payload.deltas) ? (payload.deltas as CliTranscriptDelta[]) : [];
      const latestSeq = typeof payload.latestSeq === "number" ? payload.latestSeq : undefined;
      const timelineEvent = payload.event as CliTimelineEvent | undefined;
      if (cliSessionId && detailSessionId === cliSessionId && detailTranscript) {
        applyDeltasToDetail(cliSessionId, deltas, latestSeq, timelineEvent);
      } else if (cliSessionId && detailCache.has(cliSessionId)) {
        detailCache.delete(cliSessionId);
      }
      break;
    }
    case "focus.changed": {
      const targetId = typeof payload.focusedCliSessionId === "string" ? payload.focusedCliSessionId : undefined;
      const explicit = payload.explicit === true;
      if (targetId && explicit) {
        void openDetailSession(targetId);
      }
      break;
    }
    case "session.deleted": {
      const deletedId = typeof payload.cliSessionId === "string" ? payload.cliSessionId : undefined;
      if (deletedId) {
        applySidecarSessionDeleted(deletedId);
      }
      break;
    }
    case "engines.updated": {
      if (payload.engines && typeof payload.engines === "object") {
        enginesMap = payload.engines as EnginesInspectMap;
        renderEngines();
        syncStartModelPicker({ preserveCurrentSelection: true });
        if (detailTranscript) syncDetailModelPicker(detailTranscript.summary);
      }
      break;
    }
    case "preferences.updated": {
      if (payload.enginePreferences && typeof payload.enginePreferences === "object") {
        enginePreferences = payload.enginePreferences as Partial<Record<CliEngine, CliEnginePreference>>;
      }
      break;
    }
    case "notification.hint": {
      handleNotificationHint(view, payload as unknown as NotificationHintPayload);
      break;
    }
    case "service.ready": {
      void reconcileSidecar(true);
      break;
    }
    case "service.resync": {
      void reconcileSidecar(true);
      break;
    }
  }
});

// Reconciliation on tab visibility / window focus / SSE silence watchdog (15s)
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    refreshAllSilenceBadges();
    void reconcileSidecar(false);
  }
});
window.addEventListener("focus", () => {
  if (!document.hidden) {
    refreshAllSilenceBadges();
    void reconcileSidecar(false);
  }
});
window.setInterval(() => {
  refreshAllSilenceBadges();
  if (!document.hidden && hasAnyRunningSession() && Date.now() - lastSseEventAt >= 10_000) {
    void reconcileSidecar(false);
  }
}, 15_000);

void view.context
  .get()
  .then((ctx) => {
    wasViewVisible = ctx.visible;
    applyPluginViewAppearance(ctx);
  })
  .catch(() => undefined);
view.context.subscribe((ctx) => {
  applyPluginViewAppearance(ctx);
  if (ctx.visible && !wasViewVisible) {
    refreshAllSilenceBadges();
    void reconcileSidecar(false);
  }
  wasViewVisible = ctx.visible;
});
void loadInspect(false);
