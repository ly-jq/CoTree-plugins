/// <reference lib="dom" />
import { applyPluginViewAppearance, createPluginViewClient } from "../../../packages/plugin-sdk/src/ui.js";
import "@cotree/plugin-sdk/theme.css";
import "./transcript.css";
import {
  ALL_CLI_ENGINES,
  PLUGIN_ID,
  PRIMARY_CLI_ENGINES,
  SERVICE_ID,
  formatSilenceDuration,
  formatWorkspaceLabel,
  isAcpEngine,
  isAgentOwnedSession,
  isTerminalCliStatus,
  type CliAttachmentRef,
  type CliEngine,
  type CliEnginePreference,
  type CliFollowUpMode,
  type CliInteractionMode,
  type CliNativeSessionEntry,
  type CliPendingIntervention,
  type CliPermissionMode,
  type CliRailSessionSummary,
  type CliServiceTier,
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
import { ProComposerController } from "./composer.js";
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

type TranscriptResponse = {
  controlWorkspace: string;
  focusedCliSessionId: string | null;
  engines: EnginesInspectMap;
  enginePreferences?: Partial<Record<CliEngine, CliEnginePreference>>;
  sessions: CliSessionSummary[];
  transcript?: CliSessionTranscript | null;
  incremental?: boolean;
  latestSeq?: number;
  summary?: CliSessionSummary;
  deltas?: CliTranscriptDelta[];
};

type CachedTranscriptEntry = {
  transcript: CliSessionTranscript;
  scrollTop: number;
  cachedAt: number;
};

type RailRowHandle = {
  cliSessionId: string;
  button: HTMLDivElement;
  iconHost: HTMLSpanElement;
  titleEl: HTMLSpanElement;
  agentPill: HTMLSpanElement;
  timeEl: HTMLSpanElement;
  deleteBtn: HTMLButtonElement;
  dot: HTMLSpanElement;
  subText: HTMLSpanElement;
  attentionPill: HTMLSpanElement;
};

const CACHE_TTL_MS = 5 * 60_000;
const view = createPluginViewClient();
const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

let sessions: CliSessionSummary[] = [];
let enginesMap: EnginesInspectMap = {};
let enginePreferences: Partial<Record<CliEngine, CliEnginePreference>> = {};
let selectedId: string | undefined;
let currentTranscript: CliSessionTranscript | null = null;
let engineFilter: "all" | "acp_more" | CliEngine = "all";
let searchQuery = "";
let viewMode: "readable" | "raw" = "readable";
let followUpMode: CliFollowUpMode = "queue";
let composerTouchedSessionId: string | undefined;
let newDrawerTouchedEngine: CliEngine | undefined;
let lightboxFilePath: string | undefined;

const sessionCache = new Map<string, CachedTranscriptEntry>();
const railNodes = new Map<string, RailRowHandle>();
const turnNodes = new Map<number, TurnDomHandle>();
const optimisticNodes = new Map<string, HTMLElement>();
let findMatches: HTMLElement[] = [];
let findCursor = -1;
let scrollScheduled = false;
let lastSseEventAt = Date.now();
let lastReconcileAt = 0;
let reconciling = false;
let wasViewVisible = true;
let armedRailDeleteId: string | undefined;
let armedRailDeleteTimer: number | undefined;
let headerDeleteArmed = false;
let headerDeleteTimer: number | undefined;

// ============================================================================
// Hydrate Static Chrome Icons (Zero Raw Emojis!)
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

function hydrateStaticChromeIcons(): void {
  setOnlyIcon(el("btn-import-native"), "import", 15);
  setOnlyIcon(el("refresh"), "refresh", 14);
  setIconAndText(el("toggle-new"), "plus", "新建", 14);
  el("rail-search-icon").replaceChildren(createUiIcon("search", 13));

  // Empty canvas showcase
  const emptyProviders = el("empty-provider-row");
  emptyProviders.replaceChildren();
  for (const eng of ["codex", "claude", "antigravity", "gemini", "opencode", "qwen"] as CliEngine[]) {
    const box = document.createElement("span");
    box.className = "empty-provider-badge";
    box.title = engineDisplayName(eng);
    box.append(createProviderIcon(eng, 18));
    emptyProviders.append(box);
  }
  setIconAndText(el("empty-new-btn"), "plus", "新建外部 CLI 会话", 14);
  setIconAndText(el("empty-import-btn"), "import", "导入本机历史会话", 14);

  // Header controls & overflow menu
  setIconAndText(el("btn-review"), "gitCompare", "审阅", 14);
  setOnlyIcon(el("btn-header-more"), "moreHorizontal", 15);
  el("btn-fork").replaceChildren(createMenuRowContent("gitBranch", "从当前状态分支", "Fork"));
  el("btn-handoff").replaceChildren(createMenuRowContent("arrowLeftRight", "跨引擎无损交接", "Handoff"));
  el("menu-autoscroll-label").replaceChildren(createUiIcon("arrowDown", 14), document.createTextNode("自动滚动到底部"));
  el("btn-interrupt").replaceChildren(createMenuRowContent("pause", "软中断当前轮次"));
  el("btn-kill").replaceChildren(createMenuRowContent("stopCircle", "终止 CLI 进程"));
  el("btn-delete").replaceChildren(createMenuRowContent("trash2", "删除此会话"));

  // Find bar & older turns & interventions dock
  el("find-icon").replaceChildren(createUiIcon("search", 14));
  setOnlyIcon(el("find-prev"), "chevronUp", 14);
  setOnlyIcon(el("find-next"), "chevronDown", 14);
  setOnlyIcon(el("find-close"), "x", 14);
  setIconAndText(el("btn-load-older"), "chevronUp", "加载更早轮次", 14);
  el("interventions-dock-title").replaceChildren(
    createUiIcon("shield", 14),
    document.createTextNode("待处理审批 / 问答")
  );

  // Composer controls
  setOnlyIcon(el("btn-attach"), "paperclip", 15);
  setOnlyIcon(el("steer-refresh-models"), "refresh", 13);
  el("composer-model-icon").replaceChildren(createUiIcon("sparkles", 13));
  el("composer-effort-icon").replaceChildren(createUiIcon("brain", 13));
  el("composer-perm-icon").replaceChildren(createUiIcon("shield", 13));
  setIconAndText(el("btn-plan-toggle"), "compass", "Plan", 13);
  setIconAndText(el("btn-fast-tier"), "zap", "Fast", 13);
  setOnlyIcon(el("btn-composer-stop"), "square", 12);
  setOnlyIcon(el("btn-steer"), "arrowUp", 16);

  for (const chev of Array.from(document.querySelectorAll<HTMLElement>("[data-chevron]"))) {
    chev.replaceChildren(createUiIcon("chevronDown", 12));
  }

  // Modal close / action buttons
  setOnlyIcon(el("new-close-x"), "x", 15);
  setIconAndText(el("new-refresh-models"), "refresh", "刷新模型", 12);
  setOnlyIcon(el("handoff-close"), "x", 15);
  setOnlyIcon(el("import-close"), "x", 15);
  setIconAndText(el("import-refresh"), "refresh", "重新扫描", 13);
  setOnlyIcon(el("lightbox-close"), "x", 15);
}

// ============================================================================
// Notices & Scroll helpers
// ============================================================================

function setNotice(message: string, isError = false): void {
  const node = el("notice");
  if (!node) return;
  node.textContent = message;
  node.dataset.error = String(isError);
}

function setRailNotice(message: string, isError = false): void {
  const node = el("rail-notice");
  if (!node) return;
  node.textContent = message;
  node.dataset.error = String(isError);
}

function setNewDrawerStatus(message: string, isError = false): void {
  const node = el("new-status");
  if (!node) return;
  node.textContent = message;
  node.dataset.error = String(isError);
}

function scheduleAutoScroll(): void {
  if (!el<HTMLInputElement>("auto-scroll")?.checked || scrollScheduled) return;
  scrollScheduled = true;
  requestAnimationFrame(() => {
    scrollScheduled = false;
    const viewport = el("stream-viewport");
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
  });
}

function disarmHeaderDelete(): void {
  headerDeleteArmed = false;
  if (headerDeleteTimer !== undefined) {
    window.clearTimeout(headerDeleteTimer);
    headerDeleteTimer = undefined;
  }
  const delBtn = el("btn-delete");
  if (delBtn) delBtn.replaceChildren(createMenuRowContent("trash2", "删除此会话"));
}

function disarmRailDelete(): void {
  const prevId = armedRailDeleteId;
  armedRailDeleteId = undefined;
  if (armedRailDeleteTimer !== undefined) {
    window.clearTimeout(armedRailDeleteTimer);
    armedRailDeleteTimer = undefined;
  }
  if (prevId) {
    const handle = railNodes.get(prevId);
    if (handle) {
      handle.deleteBtn.dataset.armed = "false";
      handle.deleteBtn.title = "删除此会话";
      setOnlyIcon(handle.deleteBtn, "trash2", 13);
    }
  }
}

function isLiveUnsettledSession(session: CliSessionSummary): boolean {
  return session.origin === "live" && !session.executionSettled && !isTerminalCliStatus(session.status);
}

function closeHeaderMenu(): void {
  el("header-more-menu").hidden = true;
  el("btn-header-more").setAttribute("aria-expanded", "false");
  disarmHeaderDelete();
}

function openNewSessionModal(): void {
  el("new-drawer").hidden = false;
  renderNewEngineGrid();
  syncNewModelPicker();
}

function openLocalFile(filePath: string, line?: number): void {
  void view.commands
    .execute(`${PLUGIN_ID}.open-file`, {
      path: filePath,
      ...(line !== undefined ? { line } : {})
    })
    .catch((err) => {
      setNotice(`打开文件失败: ${err instanceof Error ? err.message : String(err)}`, true);
    });
}

function openReviewPanel(): void {
  void view.commands.execute(`${PLUGIN_ID}.open-review`).catch((err) => {
    setNotice(`打开 Review 面板失败: ${err instanceof Error ? err.message : String(err)}`, true);
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

function openLightbox(src: string, caption: string, filePath?: string): void {
  lightboxFilePath = filePath;
  el<HTMLImageElement>("lightbox-img").src = src;
  el("lightbox-caption").textContent = caption;
  el<HTMLButtonElement>("lightbox-open-file").hidden = !filePath;
  el("lightbox-modal").hidden = false;
}

function makeBlockCallbacks(cliSessionId: string, engine?: CliEngine): BlockActionCallbacks {
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
    onOpenLightbox: (src, caption, p) => openLightbox(src, caption, p),
    onImplementPlan: async () => {
      try {
        await applyModeChange({ interactionMode: "default" });
        await sendPromptToCurrentSession({
          message: "方案已确认，请按上述规划开始实施并验证。",
          attachments: []
        });
      } catch (err) {
        setNotice(err instanceof Error ? err.message : String(err), true);
      }
    },
    onRevisePlan: () => {
      const ta = el<HTMLTextAreaElement>("steer-input");
      ta.value = "请调整上述方案：";
      composer.autoResizeTextarea();
      syncComposerPrimaryAction();
      ta.focus();
    },
    onForkAtTurn: async (turnIndex) => {
      await forkCurrentSession(turnIndex);
    },
    onUndoTurn: async (turnIndex, canUndoFiles, hasCheckpoint) => {
      await undoTurn(turnIndex, canUndoFiles, hasCheckpoint);
    }
  };
}

// ============================================================================
// Engine Status Strip, Visual Engine Picker Grid & Model Pickers
// ============================================================================

const ENGINE_SUBTITLES: Record<CliEngine, string> = {
  codex: "app-server",
  claude: "Agent SDK",
  antigravity: "agy CLI",
  gemini: "ACP / stream",
  opencode: "ACP / run",
  qwen: "ACP / stream",
  kiro: "ACP",
  goose: "ACP",
  acp: "Custom ACP"
};

function renderEngines(): void {
  const bar = el("engines");
  bar.replaceChildren();
  let hasExtraAcp = false;
  for (const engine of ALL_CLI_ENGINES) {
    const info = enginesMap[engine];
    const isPrimary = PRIMARY_CLI_ENGINES.includes(engine);
    if (!isPrimary && !info?.available) continue;
    if (!isPrimary && engine !== "opencode" && engine !== "qwen" && info?.available) hasExtraAcp = true;

    const item = document.createElement("span");
    item.className = `engine-status-item${info?.available ? " ready" : ""}`;
    item.title = info?.available
      ? `${engineDisplayName(engine)} 已就绪 (${info.command})`
      : `${engineDisplayName(engine)} 未检测到`;
    const dot = document.createElement("span");
    dot.className = "engine-status-dot";
    item.append(dot, document.createTextNode(engineDisplayName(engine)));
    bar.append(item);
  }
  const hasOpencode = Boolean(enginesMap.opencode?.available || sessions.some((s) => s.engine === "opencode"));
  const hasQwen = Boolean(enginesMap.qwen?.available || sessions.some((s) => s.engine === "qwen"));
  const ocChip = document.querySelector<HTMLButtonElement>('[data-engine="opencode"]');
  if (ocChip) ocChip.hidden = !hasOpencode;
  const qwenChip = document.querySelector<HTMLButtonElement>('[data-engine="qwen"]');
  if (qwenChip) qwenChip.hidden = !hasQwen;
  const acpChip = document.querySelector<HTMLButtonElement>('[data-engine="acp_more"]');
  if (acpChip) acpChip.hidden = !hasExtraAcp;
  if (!el("new-drawer").hidden) renderNewEngineGrid();
}

function renderNewEngineGrid(): void {
  const grid = el("new-engine-grid");
  const select = el<HTMLSelectElement>("new-engine");
  const activeEngine = select.value as CliEngine;
  grid.replaceChildren();

  for (const engine of ALL_CLI_ENGINES) {
    const info = enginesMap[engine];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.role = "radio";
    btn.setAttribute("aria-checked", String(engine === activeEngine));
    btn.className = `engine-card-btn${engine === activeEngine ? " selected" : ""}`;

    const top = document.createElement("div");
    top.className = "engine-card-top";
    const dot = document.createElement("span");
    dot.className = `status-dot ${info?.available ? "ok" : "idle"}`;
    dot.title = info?.available ? "本机已就绪" : "未安装";
    top.append(createProviderIcon(engine, 16), dot);

    const name = document.createElement("span");
    name.className = "engine-card-name";
    name.textContent = engineDisplayName(engine);

    const sub = document.createElement("span");
    sub.className = "engine-card-sub";
    sub.textContent = ENGINE_SUBTITLES[engine];

    btn.append(top, name, sub);
    btn.addEventListener("click", () => {
      select.value = engine;
      newDrawerTouchedEngine = engine;
      renderNewEngineGrid();
      syncNewModelPicker();
    });
    grid.append(btn);
  }
}

function syncNewModelPicker(options: { preserveCurrentSelection?: boolean } = {}): void {
  const engine = el<HTMLSelectElement>("new-engine").value as CliEngine;
  const catalog = enginesMap[engine]?.modelCatalog;
  const selectEl = el<HTMLSelectElement>("new-model-select");
  const customEl = el<HTMLInputElement>("new-model-custom");
  const effortSelect = el<HTMLSelectElement>("new-effort");
  const effortWrap = el("new-effort-wrap");

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
  el("new-model-hint").textContent = formatCatalogHint(catalog);
}

function syncComposerPillLabels(): void {
  const modelSel = el<HTMLSelectElement>("steer-model-select");
  const modelOpt = modelSel.selectedOptions[0];
  const rawModelText = modelOpt?.textContent?.replace(/\s*\(默认\)$/, "") ?? "默认模型";
  el("composer-model-label").textContent = rawModelText;

  const effortSel = el<HTMLSelectElement>("steer-effort");
  const effortOpt = effortSel.selectedOptions[0];
  el("composer-effort-label").textContent = effortOpt?.textContent ?? "默认";

  const permSel = el<HTMLSelectElement>("steer-permission");
  const perm = (permSel.value as CliPermissionMode) || "supervised";
  el("composer-perm-label").textContent = permissionModeDisplay(perm).short;
  el("composer-perm-icon").replaceChildren(createUiIcon(permissionModeDisplay(perm).icon, 13));
}

function syncComposerModelPicker(summary: CliSessionSummary, forceReset = false): void {
  const catalog = enginesMap[summary.engine]?.modelCatalog;
  const selectEl = el<HTMLSelectElement>("steer-model-select");
  const customEl = el<HTMLInputElement>("steer-model-custom");
  const effortSelect = el<HTMLSelectElement>("steer-effort");
  const effortWrap = el("steer-effort-wrap");

  const preserve = !forceReset && composerTouchedSessionId === summary.cliSessionId;
  const desiredModel = preserve ? resolveSelectedModel(selectEl, customEl) : summary.model;
  const desiredEffort = preserve ? effortSelect.value || undefined : summary.reasoningEffort;

  populateModelSelect(selectEl, customEl, catalog, {
    ...(desiredModel ? { selectedModel: desiredModel } : {}),
    defaultLabel: catalog?.defaultModel ? `${catalog.defaultModel}` : "默认模型"
  });
  populateEffortSelect(effortSelect, effortWrap, catalog, resolveSelectedModel(selectEl, customEl), desiredEffort);
  syncComposerPillLabels();
}

// ============================================================================
// Incremental Sidebar Rail (t3code airy thread rows, zero replaceChildren!)
// ============================================================================

function matchesRailFilter(session: CliSessionSummary): boolean {
  if (engineFilter === "acp_more") {
    if (
      !isAcpEngine(session.engine) ||
      session.engine === "gemini" ||
      session.engine === "opencode" ||
      session.engine === "qwen"
    ) {
      return false;
    }
  } else if (engineFilter !== "all" && session.engine !== engineFilter) {
    return false;
  }
  const q = searchQuery.trim().toLowerCase();
  if (!q) return true;
  return (
    session.cliSessionId.toLowerCase().includes(q) ||
    (session.label ?? "").toLowerCase().includes(q) ||
    session.engine.toLowerCase().includes(q) ||
    session.cwdRelative.toLowerCase().includes(q) ||
    (session.externalSessionId ?? "").toLowerCase().includes(q)
  );
}

function createRailRow(session: CliSessionSummary): RailRowHandle {
  const button = document.createElement("div");
  button.setAttribute("role", "listitem");
  button.tabIndex = 0;
  button.dataset.sessionId = session.cliSessionId;
  button.addEventListener("click", () => {
    void selectSession(session.cliSessionId);
  });
  button.addEventListener("keydown", (ev) => {
    if (ev.target !== button) return;
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      void selectSession(session.cliSessionId);
    }
  });

  const top = document.createElement("div");
  top.className = "rail-item-top";
  const left = document.createElement("div");
  left.className = "rail-item-left";
  const iconHost = document.createElement("span");
  iconHost.className = "cli-row";
  const titleEl = document.createElement("span");
  titleEl.className = "rail-title";
  const agentPill = document.createElement("span");
  agentPill.className = "agent-origin-pill";
  agentPill.textContent = "智能体";
  agentPill.hidden = true;
  left.append(iconHost, titleEl, agentPill);

  const right = document.createElement("div");
  right.className = "rail-item-right";
  const timeEl = document.createElement("span");
  timeEl.className = "rail-time tabular-nums";
  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "rail-delete-btn";
  deleteBtn.dataset.armed = "false";
  deleteBtn.title = "删除此会话";
  deleteBtn.setAttribute("aria-label", `删除会话 ${session.label ?? session.cliSessionId}`);
  setOnlyIcon(deleteBtn, "trash2", 13);
  deleteBtn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    const latest = sessions.find((s) => s.cliSessionId === session.cliSessionId);
    if (latest && isLiveUnsettledSession(latest) && armedRailDeleteId !== session.cliSessionId) {
      disarmRailDelete();
      armedRailDeleteId = session.cliSessionId;
      deleteBtn.dataset.armed = "true";
      deleteBtn.title = "该会话正在运行，再次点击确认终止并删除";
      setIconAndText(deleteBtn, "trash2", "确认?", 12);
      armedRailDeleteTimer = window.setTimeout(() => disarmRailDelete(), 4_000);
      return;
    }
    disarmRailDelete();
    void deleteSessionById(session.cliSessionId, deleteBtn);
  });
  right.append(timeEl, deleteBtn);
  top.append(left, right);

  const subRow = document.createElement("div");
  subRow.className = "rail-sub-row";
  const dot = document.createElement("span");
  const subText = document.createElement("span");
  subText.className = "rail-sub-text tabular-nums";
  const attentionPill = document.createElement("span");
  attentionPill.className = "rail-attention-pill";
  attentionPill.hidden = true;
  subRow.append(dot, subText, attentionPill);

  button.append(top, subRow);
  const handle: RailRowHandle = {
    cliSessionId: session.cliSessionId,
    button,
    iconHost,
    titleEl,
    agentPill,
    timeEl,
    deleteBtn,
    dot,
    subText,
    attentionPill
  };
  patchRailRow(handle, session);
  return handle;
}

function patchRailRow(row: RailRowHandle, session: CliSessionSummary): void {
  const st = statusDisplay(session.status);
  const isSelected = session.cliSessionId === selectedId;
  row.button.className = `rail-item${isSelected ? " selected" : ""}${session.origin === "history" ? " history" : ""}${session.status === "failed" ? " failed" : ""}`;
  if (isSelected) row.button.setAttribute("aria-current", "true");
  else row.button.removeAttribute("aria-current");

  if (row.iconHost.dataset.engine !== session.engine) {
    row.iconHost.dataset.engine = session.engine;
    row.iconHost.replaceChildren(createProviderIcon(session.engine, 15));
  }

  row.dot.className = `status-dot ${st.tone}`;
  row.titleEl.textContent = session.label ?? session.cliSessionId;
  row.deleteBtn.setAttribute("aria-label", `删除会话 ${session.label ?? session.cliSessionId}`);
  if (armedRailDeleteId !== session.cliSessionId) {
    row.deleteBtn.dataset.armed = "false";
    row.deleteBtn.title = isLiveUnsettledSession(session) ? "终止并删除此会话" : "删除此会话";
  }
  const agentOwned = isAgentOwnedSession(session);
  row.agentPill.hidden = !agentOwned;
  if (agentOwned) {
    row.agentPill.title = [
      "由 CoTree 智能体启动的 CLI 会话（支持全部实时查看、审批与干预控制）",
      session.ownerAgentId ? `agent: ${session.ownerAgentId}` : "",
      session.ownerSessionId ? `session: ${session.ownerSessionId}` : ""
    ].filter(Boolean).join("\n");
  }
  row.timeEl.textContent = formatShortTime(session.updatedAt);

  const parts = [
    st.label,
    `Turn ${session.turnCount}`,
    session.interactionMode === "plan" ? "Plan" : "",
    session.queuedCount ? `队列 ${session.queuedCount}` : "",
    formatModelBadge(session.model, session.reasoningEffort)
  ].filter(Boolean);
  row.subText.textContent = parts.join(" · ");

  if (session.pendingInterventions.length > 0) {
    row.attentionPill.hidden = false;
    row.attentionPill.textContent = `待审批 ${session.pendingInterventions.length}`;
  } else {
    row.attentionPill.hidden = true;
  }
}

function syncRailListIncremental(): void {
  const list = el("rail-list");
  const empty = el("rail-empty");
  const filtered = sessions.filter(matchesRailFilter);
  empty.hidden = filtered.length > 0;

  const visibleIds = new Set(filtered.map((s) => s.cliSessionId));
  for (const [id, handle] of [...railNodes.entries()]) {
    if (!visibleIds.has(id)) {
      handle.button.remove();
      railNodes.delete(id);
    }
  }

  filtered.forEach((session, idx) => {
    let handle = railNodes.get(session.cliSessionId);
    if (!handle) {
      handle = createRailRow(session);
      railNodes.set(session.cliSessionId, handle);
    } else {
      patchRailRow(handle, session);
    }
    const currentAtIdx = list.children[idx];
    if (currentAtIdx !== handle.button) {
      list.insertBefore(handle.button, currentAtIdx ?? null);
    }
  });
}

// ============================================================================
// Header, Context Meter, Composer Primary Action & Incremental Turn Stream
// ============================================================================

function renderContextMeter(summary: CliSessionSummary): void {
  const meter = el("ctx-meter");
  const fill = el("ctx-meter-fill");
  const text = el("ctx-meter-text");
  const usage = summary.contextUsage;
  if (!usage || !usage.totalTokens || !usage.contextWindow) {
    meter.hidden = true;
    return;
  }
  meter.hidden = false;
  const pct = Math.min(100, Math.round((usage.totalTokens / usage.contextWindow) * 100));
  fill.style.width = `${pct}%`;
  meter.className = `ctx-meter${pct >= 90 ? " danger" : pct >= 80 ? " warn" : ""}`;
  const usedK = (usage.totalTokens / 1000).toFixed(usage.totalTokens >= 100_000 ? 0 : 1);
  const maxK = Math.round(usage.contextWindow / 1000);
  text.textContent = `${usedK}k/${maxK}k · ${pct}%`;
}

function syncComposerPrimaryAction(): void {
  const summary = currentTranscript?.summary;
  const sendBtn = el<HTMLButtonElement>("btn-steer");
  const sideStopBtn = el<HTMLButtonElement>("btn-composer-stop");
  const hint = el("composer-hint");
  if (!summary) return;

  const isRunning = summary.status === "running" || summary.status === "starting";
  const hasText = composer.hasSendableContent();

  if (isRunning && !hasText) {
    // t3code pattern: empty composer during active run -> circular Stop button!
    sendBtn.className = "composer-send-circle is-stop";
    sendBtn.dataset.action = "stop";
    sendBtn.title = "停止当前生成 (软中断)";
    sendBtn.setAttribute("aria-label", "停止当前生成");
    setOnlyIcon(sendBtn, "square", 12);
    sideStopBtn.hidden = true;
    hint.textContent = "运行中 · 输入可排队或插话";
  } else {
    sendBtn.className = "composer-send-circle";
    sendBtn.dataset.action = "send";
    sideStopBtn.hidden = !isRunning;
    if (isRunning) {
      const icon: UiIconName = followUpMode === "queue" ? "listPlus" : "cornerUpRight";
      setOnlyIcon(sendBtn, icon, 15);
      sendBtn.title = followUpMode === "queue" ? "加入发送队列 (Enter)" : "运行中直接插话 (Enter)";
      sendBtn.setAttribute("aria-label", sendBtn.title);
      hint.textContent =
        followUpMode === "queue" ? "Enter 排队 · Ctrl+Enter 插话" : "Enter 插话 · Ctrl+Enter 排队";
    } else {
      setOnlyIcon(sendBtn, "arrowUp", 16);
      const settled = summary.executionSettled || isTerminalCliStatus(summary.status);
      sendBtn.title = settled ? "恢复并发送 (Enter)" : "发送指令 (Enter)";
      sendBtn.setAttribute("aria-label", sendBtn.title);
      hint.textContent = "Enter 发送 · Shift+Enter 换行";
    }
  }
}

function renderWorkspaceContextBar(controlWorkspace?: string): void {
  const bar = el("rail-workspace");
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

function syncSilenceIndicator(summary?: CliSessionSummary | null): void {
  const pill = el("hdr-silence");
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
  pill.replaceChildren(createUiIcon("clock", 12), document.createTextNode(`等待上游 · 已静默 ${duration}`));
  pill.title = `CLI 进程仍在运行，但已连续 ${duration} 未收到新的上游输出（可能是大模型深度思考或耗时命令执行中）。可继续等待或从右上角菜单发起软中断。`;
}

function hasAnyActiveSession(): boolean {
  return sessions.some(
    (s) =>
      s.origin === "live" &&
      !s.executionSettled &&
      (s.status === "running" || s.status === "starting" || s.status === "interrupting")
  );
}

function syncCanvasHeader(summary: CliSessionSummary): void {
  const st = statusDisplay(summary.status);
  const iconHost = el("hdr-engine-icon");
  if (iconHost.dataset.engine !== summary.engine) {
    iconHost.dataset.engine = summary.engine;
    iconHost.replaceChildren(createProviderIcon(summary.engine, 15));
  }
  el("hdr-engine").textContent = engineDisplayName(summary.engine);
  el("hdr-title").textContent = summary.label ?? summary.cliSessionId;

  const hdrStatus = el("hdr-status");
  hdrStatus.className = `cli-pill ${st.tone}`;
  hdrStatus.replaceChildren();
  const stDot = document.createElement("span");
  stDot.className = `status-dot ${st.tone}`;
  hdrStatus.append(stDot, document.createTextNode(st.label));
  const agentBadge = el("hdr-agent-badge");
  if (agentBadge) {
    const agentOwned = isAgentOwnedSession(summary);
    agentBadge.hidden = !agentOwned;
    if (agentOwned) {
      agentBadge.replaceChildren(createUiIcon("sparkles", 11), document.createTextNode("智能体调用"));
      agentBadge.title = [
        "由 CoTree 智能体启动，支持实时进度查看、审批、插话、排队、暂停/终止、Fork 与 Handoff",
        summary.ownerAgentId ? `agent: ${summary.ownerAgentId}` : "",
        summary.ownerSessionId ? `session: ${summary.ownerSessionId}` : ""
      ].filter(Boolean).join("\n");
    }
  }
  syncSilenceIndicator(summary);

  const modelBadge = formatModelBadge(summary.model, summary.reasoningEffort);
  const hdrModel = el("hdr-model");
  hdrModel.hidden = !modelBadge;
  hdrModel.textContent = modelBadge;

  el("hdr-plan-badge").hidden = summary.interactionMode !== "plan";
  el("hdr-worktree").hidden = !summary.isWorktree;

  const metaParts = [
    `cwd:${summary.cwdRelative}`,
    summary.externalSessionId ? `thread:${summary.externalSessionId.slice(0, 14)}` : `id:${summary.cliSessionId}`,
    summary.forkedFromSessionId ? `fork:${summary.forkedFromSessionId.slice(0, 12)}` : "",
    summary.handoffFromEngine ? `handoff←${engineDisplayName(summary.handoffFromEngine)}` : "",
    formatUsageSummary(summary.totalUsage, summary.totalCostUsd)
  ].filter(Boolean);
  el("hdr-meta").textContent = metaParts.join(" · ");

  renderContextMeter(summary);

  const settled = summary.executionSettled || isTerminalCliStatus(summary.status);
  el<HTMLButtonElement>("btn-interrupt").disabled = settled;
  el<HTMLButtonElement>("btn-kill").disabled = settled;

  // Sync composer pill controls
  const perm = summary.permissionMode ?? "supervised";
  el<HTMLSelectElement>("steer-permission").value = perm;
  syncComposerPillLabels();

  el<HTMLButtonElement>("btn-plan-toggle").classList.toggle("active", summary.interactionMode === "plan");
  const fastBtn = el<HTMLButtonElement>("btn-fast-tier");
  fastBtn.hidden = summary.engine !== "codex";
  fastBtn.classList.toggle("active", summary.serviceTier === "fast");

  const followBtn = el<HTMLButtonElement>("btn-followup-mode");
  setIconAndText(
    followBtn,
    followUpMode === "queue" ? "listPlus" : "cornerUpRight",
    followUpMode === "queue" ? "排队" : "插话",
    13
  );
  followBtn.classList.toggle("active", followUpMode === "steer");

  syncComposerPrimaryAction();
}

function renderInterventions(cliSessionId: string, items: CliPendingIntervention[]): void {
  const dock = el("interventions-dock");
  const list = el("interventions-list");
  list.replaceChildren();
  dock.hidden = items.length === 0;
  for (const item of items) {
    list.append(
      renderInterventionCard(cliSessionId, item, async (payload) => {
        try {
          await view.services.call(SERVICE_ID, "view.respond", payload);
          setNotice(`已响应干预 ${item.id}`);
        } catch (err) {
          setNotice(err instanceof Error ? err.message : String(err), true);
        }
      })
    );
  }
}

function renderRawView(transcript: CliSessionTranscript): void {
  const rawEvents = el("raw-events");
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
  el("raw-stdout").textContent = transcript.rawTail?.stdout || "(无原始 stdout 缓存)";
  el("raw-stderr").textContent = transcript.rawTail?.stderr || "(无原始 stderr 缓存)";
}

function clearMountedTurns(): void {
  for (const handle of turnNodes.values()) handle.dispose();
  turnNodes.clear();
  optimisticNodes.clear();
  el("turns-container").replaceChildren();
}

function mountFullTranscript(transcript: CliSessionTranscript, options: { restoreScrollTop?: number } = {}): void {
  currentTranscript = transcript;
  el("canvas-empty").hidden = true;
  el("canvas-active").hidden = false;

  syncCanvasHeader(transcript.summary);
  syncComposerModelPicker(transcript.summary, true);
  renderInterventions(transcript.summary.cliSessionId, transcript.summary.pendingInterventions);
  composer.renderQueueDock(transcript.queue ?? [], transcript.summary.queuePaused === true);

  clearMountedTurns();
  const container = el("turns-container");
  const callbacks = makeBlockCallbacks(transcript.summary.cliSessionId, transcript.summary.engine);
  for (const turn of transcript.turns) {
    const handle = createTurnDomHandle(turn, callbacks);
    turnNodes.set(turn.turnIndex, handle);
    container.append(handle.element);
  }

  el("older-turns-wrap").hidden = !transcript.hasOlderTurns;
  renderChangedFilesBar(el("changed-files-bar"), transcript.turns, {
    onOpenFile: (p) => openLocalFile(p),
    onOpenReview: () => openReviewPanel()
  });

  if (viewMode === "raw") {
    renderRawView(transcript);
  }
  if (transcript.summary.lastError) {
    setNotice(transcript.summary.lastError, true);
  } else {
    setNotice("");
  }

  if (options.restoreScrollTop !== undefined) {
    el("stream-viewport").scrollTop = options.restoreScrollTop;
  } else {
    scheduleAutoScroll();
  }
}

function applyDeltasToCurrentTranscript(
  cliSessionId: string,
  deltas: CliTranscriptDelta[],
  latestSeq?: number,
  event?: CliTimelineEvent
): void {
  if (!currentTranscript || currentTranscript.summary.cliSessionId !== cliSessionId) return;
  if (latestSeq !== undefined) currentTranscript.summary.latestSeq = latestSeq;
  if (deltas.length > 0 || event) {
    currentTranscript.summary.updatedAt = event?.at ?? new Date().toISOString();
    syncSilenceIndicator(currentTranscript.summary);
  }
  if (event) {
    currentTranscript.events.push(event);
    if (currentTranscript.events.length > 200) currentTranscript.events.shift();
  }

  const container = el("turns-container");
  const callbacks = makeBlockCallbacks(cliSessionId, currentTranscript.summary.engine);
  let changedFilesDirty = false;

  for (const delta of deltas) {
    switch (delta.kind) {
      case "turn.upsert": {
        if (delta.clientMsgId && optimisticNodes.has(delta.clientMsgId)) {
          optimisticNodes.get(delta.clientMsgId)?.remove();
          optimisticNodes.delete(delta.clientMsgId);
        }
        const existingIdx = currentTranscript.turns.findIndex((t) => t.turnIndex === delta.turn.turnIndex);
        if (existingIdx >= 0) currentTranscript.turns[existingIdx] = delta.turn;
        else currentTranscript.turns.push(delta.turn);

        const existingNode = turnNodes.get(delta.turn.turnIndex);
        if (existingNode) {
          existingNode.syncTurn(delta.turn);
        } else {
          const handle = createTurnDomHandle(delta.turn, callbacks);
          turnNodes.set(delta.turn.turnIndex, handle);
          container.append(handle.element);
        }
        changedFilesDirty = true;
        break;
      }
      case "block.upsert": {
        let turnHandle = turnNodes.get(delta.turnIndex);
        if (!turnHandle) {
          const turnObj = currentTranscript.turns.find((t) => t.turnIndex === delta.turnIndex);
          if (turnObj) {
            turnHandle = createTurnDomHandle(turnObj, callbacks);
            turnNodes.set(delta.turnIndex, turnHandle);
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
        const turnHandle = turnNodes.get(delta.turnIndex);
        if (turnHandle) {
          turnHandle.appendBlockDelta(delta.blockId, delta.delta, delta.updatedAt);
        }
        const turnObj = currentTranscript.turns.find((t) => t.turnIndex === delta.turnIndex);
        const blkObj = turnObj?.blocks.find((b) => b.id === delta.blockId);
        if (blkObj) {
          blkObj.text += delta.delta;
          blkObj.updatedAt = delta.updatedAt;
        }
        break;
      }
      case "block.status": {
        const turnHandle = turnNodes.get(delta.turnIndex);
        if (turnHandle) {
          turnHandle.updateBlockStatus(delta.blockId, delta.status, delta.title, delta.meta, delta.updatedAt);
        }
        break;
      }
      case "queue.set": {
        currentTranscript.queue = delta.queue;
        currentTranscript.summary.queuedCount = delta.queue.length;
        currentTranscript.summary.queuePaused = delta.paused;
        composer.renderQueueDock(delta.queue, delta.paused);
        syncCanvasHeader(currentTranscript.summary);
        break;
      }
      case "interventions.set": {
        currentTranscript.summary.pendingInterventions = delta.items;
        renderInterventions(cliSessionId, delta.items);
        syncCanvasHeader(currentTranscript.summary);
        break;
      }
      case "checkpoint.updated": {
        const turnObj = currentTranscript.turns.find((t) => t.turnIndex === delta.turnIndex);
        if (turnObj) {
          turnObj.checkpoint = delta.checkpoint;
          turnNodes.get(delta.turnIndex)?.updateCheckpoint(turnObj);
          changedFilesDirty = true;
        }
        break;
      }
      case "session.status": {
        const merged: CliSessionSummary = {
          ...currentTranscript.summary,
          ...delta.summary,
          lastAssistantText: delta.summary.lastAssistantPreview || currentTranscript.summary.lastAssistantText
        };
        currentTranscript.summary = merged;
        syncCanvasHeader(merged);
        if (merged.lastError) setNotice(merged.lastError, true);
        break;
      }
    }
  }

  if (changedFilesDirty) {
    renderChangedFilesBar(el("changed-files-bar"), currentTranscript.turns, {
      onOpenFile: (p) => openLocalFile(p),
      onOpenReview: () => openReviewPanel()
    });
  }
  if (viewMode === "raw") {
    renderRawView(currentTranscript);
  }
  scheduleAutoScroll();
}

// ============================================================================
// Session Loading & 0ms Warm Switch Cache
// ============================================================================

async function selectSession(targetId: string, options: { forceFull?: boolean; refreshModels?: boolean } = {}): Promise<void> {
  if (selectedId && currentTranscript) {
    composer.saveDraftFor(selectedId);
    sessionCache.set(selectedId, {
      transcript: currentTranscript,
      scrollTop: el("stream-viewport").scrollTop,
      cachedAt: Date.now()
    });
  }

  selectedId = targetId;
  composerTouchedSessionId = undefined;
  syncRailListIncremental();
  composer.restoreDraftFor(targetId);

  const cached = !options.forceFull ? sessionCache.get(targetId) : undefined;
  const cacheValid = Boolean(cached && Date.now() - cached.cachedAt < CACHE_TTL_MS);

  if (cacheValid && cached) {
    mountFullTranscript(cached.transcript, { restoreScrollTop: cached.scrollTop });
  }

  try {
    const res = (await view.services.call(SERVICE_ID, "view.transcript", {
      cliSessionId: targetId,
      focus: true,
      ...(cacheValid && cached && cached.transcript.summary.latestSeq > 0
        ? { afterSeq: cached.transcript.summary.latestSeq }
        : {}),
      includeRawTail: viewMode === "raw",
      refreshModels: options.refreshModels === true
    })) as unknown as TranscriptResponse;

    if (selectedId !== targetId) return;
    if (res.engines) {
      enginesMap = res.engines;
      renderEngines();
    }
    if (res.enginePreferences) enginePreferences = res.enginePreferences;
    if (res.sessions) {
      sessions = res.sessions;
      syncRailListIncremental();
    }

    if (res.incremental && res.deltas) {
      if (res.summary && currentTranscript) {
        currentTranscript.summary = res.summary;
        syncCanvasHeader(res.summary);
      }
      applyDeltasToCurrentTranscript(targetId, res.deltas, res.latestSeq);
    } else if (res.transcript) {
      mountFullTranscript(res.transcript);
      sessionCache.set(targetId, {
        transcript: res.transcript,
        scrollTop: el("stream-viewport").scrollTop,
        cachedAt: Date.now()
      });
    }
  } catch (err) {
    setNotice(err instanceof Error ? err.message : String(err), true);
  }
}

async function loadInitial(options: { refreshModels?: boolean } = {}): Promise<void> {
  try {
    const res = (await view.services.call(SERVICE_ID, "view.transcript", {
      ...(selectedId ? { cliSessionId: selectedId } : {}),
      includeRawTail: viewMode === "raw",
      refreshModels: options.refreshModels === true
    })) as unknown as TranscriptResponse;

    enginesMap = res.engines ?? {};
    enginePreferences = res.enginePreferences ?? {};
    sessions = res.sessions ?? [];
    renderWorkspaceContextBar(res.controlWorkspace);
    renderEngines();
    syncNewModelPicker({ preserveCurrentSelection: Boolean(newDrawerTouchedEngine) });

    if (!selectedId && res.focusedCliSessionId) {
      selectedId = res.focusedCliSessionId;
    } else if (!selectedId && sessions[0]) {
      selectedId = sessions[0].cliSessionId;
    }
    syncRailListIncremental();

    if (res.transcript) {
      selectedId = res.transcript.summary.cliSessionId;
      mountFullTranscript(res.transcript);
      composer.restoreDraftFor(selectedId);
      syncRailListIncremental();
    } else {
      el("canvas-empty").hidden = false;
      el("canvas-active").hidden = true;
    }
    setRailNotice("");
  } catch (err) {
    setRailNotice(err instanceof Error ? err.message : String(err), true);
  }
}

async function reconcileActiveTranscript(force = false): Promise<void> {
  if (reconciling) return;
  const now = Date.now();
  if (!force && now - lastReconcileAt < 1_500) return;
  reconciling = true;
  lastReconcileAt = now;
  try {
    if (!selectedId || !currentTranscript) {
      await loadInitial();
      return;
    }
    const targetId = selectedId;
    const afterSeq = currentTranscript.summary.latestSeq;
    const vp = el("stream-viewport");
    const prevScrollTop = vp.scrollTop;
    const nearBottom = vp.scrollHeight - vp.scrollTop - vp.clientHeight < 64;

    const res = (await view.services.call(SERVICE_ID, "view.transcript", {
      cliSessionId: targetId,
      ...(afterSeq > 0 ? { afterSeq } : {}),
      includeRawTail: viewMode === "raw",
      refreshModels: false
    })) as unknown as TranscriptResponse;

    if (selectedId !== targetId) return;
    if (res.engines) {
      enginesMap = res.engines;
      renderEngines();
    }
    if (res.enginePreferences) enginePreferences = res.enginePreferences;
    if (res.sessions) {
      sessions = res.sessions;
      syncRailListIncremental();
    }

    if (res.incremental && res.deltas) {
      if (res.summary && currentTranscript) {
        currentTranscript.summary = res.summary;
        syncCanvasHeader(res.summary);
      }
      if (
        res.deltas.length > 0 ||
        (res.latestSeq !== undefined && currentTranscript && res.latestSeq > currentTranscript.summary.latestSeq)
      ) {
        applyDeltasToCurrentTranscript(targetId, res.deltas, res.latestSeq);
      }
    } else if (res.transcript) {
      mountFullTranscript(res.transcript, nearBottom ? {} : { restoreScrollTop: prevScrollTop });
      sessionCache.set(targetId, {
        transcript: res.transcript,
        scrollTop: el("stream-viewport").scrollTop,
        cachedAt: Date.now()
      });
    }
  } catch {
    // Background reconciliation fails silently; next SSE or timer tick retries cleanly.
  } finally {
    reconciling = false;
  }
}

// ============================================================================
// 0ms Optimistic Send & Session Actions
// ============================================================================

async function sendPromptToCurrentSession(input: {
  message: string;
  attachments: CliAttachmentRef[];
  useOppositeMode?: boolean;
}): Promise<void> {
  if (!selectedId || !currentTranscript) return;
  const targetSessionId = selectedId;
  const summary = currentTranscript.summary;
  const isRunning = summary.status === "running" || summary.status === "needs_intervention";
  const effectiveMode: CliFollowUpMode = input.useOppositeMode
    ? followUpMode === "queue"
      ? "steer"
      : "queue"
    : followUpMode;
  const strategy = isRunning ? (effectiveMode === "queue" ? "queue" : "auto") : "auto";

  const model = resolveSelectedModel(el<HTMLSelectElement>("steer-model-select"), el<HTMLInputElement>("steer-model-custom"));
  const effort = el<HTMLSelectElement>("steer-effort").value || undefined;
  const permissionMode = el<HTMLSelectElement>("steer-permission").value as CliPermissionMode;
  const interactionMode: CliInteractionMode = el<HTMLButtonElement>("btn-plan-toggle").classList.contains("active")
    ? "plan"
    : "default";
  const serviceTier: CliServiceTier = el<HTMLButtonElement>("btn-fast-tier").classList.contains("active")
    ? "fast"
    : "default";

  const clientMsgId = `opt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  if (strategy !== "queue") {
    const row = document.createElement("div");
    row.className = "cli-user-row user";
    const bubble = document.createElement("div");
    bubble.className = "cli-bubble user optimistic";
    const body = document.createElement("div");
    body.className = "cli-bubble-body";
    body.textContent = input.message;
    bubble.append(body);
    const meta = document.createElement("div");
    meta.className = "cli-bubble-meta";
    meta.textContent = "发送中…";
    row.append(bubble, meta);
    el("turns-container").append(row);
    optimisticNodes.set(clientMsgId, row);
    scheduleAutoScroll();
  }

  try {
    const res = (await view.services.call(SERVICE_ID, "view.steer", {
      cliSessionId: targetSessionId,
      message: input.message,
      strategy,
      clientMsgId,
      permissionMode,
      interactionMode,
      serviceTier,
      ...(model ? { model } : {}),
      ...(effort ? { reasoningEffort: effort } : {}),
      ...(input.attachments.length > 0 ? { attachments: input.attachments } : {})
    })) as unknown as { queued?: boolean; deliveryMode?: string };
    composerTouchedSessionId = undefined;
    if (res.queued) {
      optimisticNodes.get(clientMsgId)?.remove();
      optimisticNodes.delete(clientMsgId);
      setNotice("已加入队列，本轮结束后将自动发送。");
    } else {
      setNotice("");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setNotice(msg, true);
    const optEl = optimisticNodes.get(clientMsgId);
    if (optEl) {
      const meta = optEl.querySelector(".cli-bubble-meta");
      if (meta) meta.textContent = `发送失败: ${msg}`;
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "cli-mini-btn accent";
      retry.textContent = "重试";
      retry.addEventListener("click", () => {
        optEl.remove();
        optimisticNodes.delete(clientMsgId);
        void sendPromptToCurrentSession(input);
      });
      optEl.append(retry);
    }
  }
}

async function applyModeChange(patch: {
  permissionMode?: CliPermissionMode;
  interactionMode?: CliInteractionMode;
  serviceTier?: CliServiceTier;
  model?: string;
  reasoningEffort?: string;
}): Promise<void> {
  if (!selectedId) return;
  try {
    const res = (await view.services.call(SERVICE_ID, "view.setModes", {
      cliSessionId: selectedId,
      ...patch
    })) as unknown as { appliedLive?: boolean; summary?: CliSessionSummary };
    if (res.summary && currentTranscript && currentTranscript.summary.cliSessionId === selectedId) {
      currentTranscript.summary = res.summary;
      syncCanvasHeader(res.summary);
    }
    setNotice(res.appliedLive ? "模式已实时生效" : "模式已更新（下一轮生效）");
  } catch (err) {
    setNotice(err instanceof Error ? err.message : String(err), true);
  }
}

async function forkCurrentSession(atTurnIndex?: number): Promise<void> {
  if (!selectedId) return;
  closeHeaderMenu();
  try {
    setNotice("正在创建分支会话…");
    const res = (await view.services.call(SERVICE_ID, "view.fork", {
      cliSessionId: selectedId,
      ...(atTurnIndex !== undefined ? { atTurnIndex } : {})
    })) as unknown as { cliSessionId?: string; forkMode?: string };
    if (res.cliSessionId) {
      setNotice(`分支会话已就绪 (${res.forkMode ?? "fork"})`);
      await selectSession(res.cliSessionId, { forceFull: true });
    }
  } catch (err) {
    setNotice(err instanceof Error ? err.message : String(err), true);
  }
}

async function undoTurn(turnIndex: number, canUndoFiles: boolean, hasCheckpoint: boolean): Promise<void> {
  if (!selectedId) return;
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
      cliSessionId: selectedId,
      turnIndex,
      revertFiles,
      forceRevertFiles
    });
    setNotice(`已撤回至 Turn #${Math.max(0, turnIndex - 1)}${revertFiles ? "（并还原文件）" : ""}`);
    await selectSession(selectedId, { forceFull: true });
  } catch (err) {
    setNotice(err instanceof Error ? err.message : String(err), true);
  }
}

async function compactCurrentSession(): Promise<void> {
  if (!selectedId) return;
  try {
    const res = (await view.services.call(SERVICE_ID, "view.compact", {
      cliSessionId: selectedId
    })) as unknown as { ok?: boolean; note?: string };
    setNotice(res.note ?? (res.ok ? "已触发上下文压缩。" : "无法压缩上下文。"));
  } catch (err) {
    setNotice(err instanceof Error ? err.message : String(err), true);
  }
}

async function openImportNativeModal(): Promise<void> {
  el("import-modal").hidden = false;
  await scanNativeSessions();
}

async function scanNativeSessions(): Promise<void> {
  const statusEl = el("import-status");
  const listEl = el("import-list");
  statusEl.textContent = "正在扫描本机 Codex / ACP 历史线程…";
  listEl.replaceChildren();
  try {
    const res = (await view.services.call(SERVICE_ID, "view.listNativeSessions", {
      limit: 30
    })) as unknown as { sessions?: CliNativeSessionEntry[] };
    const entries = res.sessions ?? [];
    statusEl.textContent = entries.length > 0 ? `共发现 ${entries.length} 条原生会话` : "未发现可导入的原生线程。";
    for (const entry of entries) {
      const row = document.createElement("div");
      row.className = "import-row";
      const info = document.createElement("div");
      info.className = "cli-flex-1";

      const title = document.createElement("div");
      title.className = "cli-row";
      const engName = document.createElement("span");
      engName.className = "cli-pill idle";
      engName.textContent = engineDisplayName(entry.engine);
      const titleStrong = document.createElement("strong");
      titleStrong.textContent = entry.title;
      title.append(createProviderIcon(entry.engine, 14), engName, titleStrong);

      const meta = document.createElement("div");
      meta.className = "cli-muted cli-mono";
      meta.textContent = [entry.externalSessionId, entry.model, entry.cwd, formatShortTime(entry.updatedAt)]
        .filter(Boolean)
        .join(" · ");
      info.append(title, meta);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cotree-button compact-btn";
      btn.dataset.variant = "primary";
      btn.textContent = "导入续聊";
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        btn.textContent = "导入中…";
        try {
          const imported = (await view.services.call(SERVICE_ID, "view.importNative", {
            engine: entry.engine,
            externalSessionId: entry.externalSessionId,
            title: entry.title,
            ...(entry.model ? { model: entry.model } : {}),
            autoResume: true
          })) as unknown as { cliSessionId?: string };
          el("import-modal").hidden = true;
          if (imported.cliSessionId) {
            await selectSession(imported.cliSessionId, { forceFull: true });
          }
        } catch (err) {
          statusEl.textContent = err instanceof Error ? err.message : String(err);
          btn.disabled = false;
          btn.textContent = "导入续聊";
        }
      });

      row.append(info, btn);
      listEl.append(row);
    }
  } catch (err) {
    statusEl.textContent = err instanceof Error ? err.message : String(err);
  }
}

// ============================================================================
// Find in Transcript (Mod+F)
// ============================================================================

function clearFindHighlights(): void {
  for (const node of findMatches) node.classList.remove("find-hit");
  findMatches = [];
  findCursor = -1;
}

function runTranscriptFind(query: string): void {
  clearFindHighlights();
  const q = query.trim().toLowerCase();
  const countEl = el("find-count");
  if (!q) {
    countEl.textContent = "";
    return;
  }
  const candidates = Array.from(
    el("turns-container").querySelectorAll<HTMLElement>(
      ".cli-md-block, .cli-bubble-body, .cli-tool-title, .cli-pre"
    )
  );
  for (const node of candidates) {
    if ((node.textContent ?? "").toLowerCase().includes(q)) {
      findMatches.push(node);
    }
  }
  if (findMatches.length === 0) {
    countEl.textContent = "0 匹配";
    return;
  }
  findCursor = 0;
  focusFindHit(0);
}

function focusFindHit(idx: number): void {
  if (findMatches.length === 0) return;
  for (const n of findMatches) n.classList.remove("find-hit");
  findCursor = (idx + findMatches.length) % findMatches.length;
  const target = findMatches[findCursor]!;
  target.classList.add("find-hit");
  target.scrollIntoView({ block: "center", behavior: "smooth" });
  el("find-count").textContent = `${findCursor + 1} / ${findMatches.length}`;
}

// ============================================================================
// Pro Composer Integration
// ============================================================================

const composer = new ProComposerController(
  view,
  {
    composerRoot: el("composer-root"),
    textarea: el<HTMLTextAreaElement>("steer-input"),
    popover: el("composer-popover"),
    attachmentsBar: el("attachments-bar"),
    stashBar: el("stash-bar"),
    queueDock: el("queue-dock"),
    attachBtn: el<HTMLButtonElement>("btn-attach"),
    fileInput: el<HTMLInputElement>("composer-file-input")
  },
  {
    getSessionId: () => selectedId,
    getProviderSlashCommands: () => {
      const eng = currentTranscript?.summary.engine;
      return eng ? enginesMap[eng]?.modelCatalog?.slashCommands ?? [] : [];
    },
    getFollowUpMode: () => followUpMode,
    onDraftChanged: () => syncComposerPrimaryAction(),
    onSend: (payload) => sendPromptToCurrentSession(payload),
    onPluginSlashCommand: async (name, args) => {
      switch (name) {
        case "plan": {
          const next: CliInteractionMode =
            currentTranscript?.summary.interactionMode === "plan" ? "default" : "plan";
          await applyModeChange({ interactionMode: next });
          return true;
        }
        case "compact":
          await compactCurrentSession();
          return true;
        case "fork":
          await forkCurrentSession();
          return true;
        case "review":
          openReviewPanel();
          return true;
        case "model":
          el<HTMLSelectElement>("steer-model-select").focus();
          return true;
        case "handoff": {
          const target = args.trim().toLowerCase();
          if (ALL_CLI_ENGINES.includes(target as CliEngine) && selectedId) {
            const res = (await view.services.call(SERVICE_ID, "view.handoff", {
              cliSessionId: selectedId,
              targetEngine: target
            })) as unknown as { cliSessionId?: string };
            if (res.cliSessionId) await selectSession(res.cliSessionId, { forceFull: true });
          } else {
            el("handoff-modal").hidden = false;
          }
          return true;
        }
        case "mode": {
          const candidate = args.trim().toLowerCase() as CliPermissionMode;
          if (["supervised", "accept_edits", "auto", "full_access"].includes(candidate)) {
            await applyModeChange({ permissionMode: candidate });
          } else {
            cyclePermissionMode();
          }
          return true;
        }
        case "clear": {
          if (!currentTranscript) return true;
          const started = (await view.services.call(SERVICE_ID, "view.start", {
            engine: currentTranscript.summary.engine,
            cwd: currentTranscript.summary.cwdRelative,
            permissionMode: currentTranscript.summary.permissionMode ?? "supervised",
            ...(currentTranscript.summary.model ? { model: currentTranscript.summary.model } : {})
          })) as unknown as { cliSessionId?: string };
          if (started.cliSessionId) await selectSession(started.cliSessionId, { forceFull: true });
          return true;
        }
        default:
          return false;
      }
    },
    onQueuePromote: async (queueId) => {
      if (!selectedId) return;
      await view.services.call(SERVICE_ID, "view.queue", {
        cliSessionId: selectedId,
        action: "promote",
        ...(queueId ? { queueId } : {})
      });
    },
    onQueueEdit: async (queueId, newText) => {
      if (!selectedId) return;
      await view.services.call(SERVICE_ID, "view.queue", {
        cliSessionId: selectedId,
        action: "edit",
        queueId,
        message: newText
      });
    },
    onQueueRemove: async (queueId) => {
      if (!selectedId) return;
      await view.services.call(SERVICE_ID, "view.queue", {
        cliSessionId: selectedId,
        action: "remove",
        queueId
      });
    },
    onQueueResume: async () => {
      if (!selectedId) return;
      await view.services.call(SERVICE_ID, "view.queue", {
        cliSessionId: selectedId,
        action: "resume"
      });
    },
    onTogglePlanMode: () => {
      const next: CliInteractionMode =
        currentTranscript?.summary.interactionMode === "plan" ? "default" : "plan";
      void applyModeChange({ interactionMode: next });
    },
    onCyclePermissionMode: () => cyclePermissionMode(),
    onNotice: (m, isErr) => setNotice(m, isErr)
  }
);

function cyclePermissionMode(): void {
  const order: CliPermissionMode[] = ["supervised", "accept_edits", "auto", "full_access"];
  const current = (el<HTMLSelectElement>("steer-permission").value as CliPermissionMode) || "supervised";
  const next = order[(order.indexOf(current) + 1) % order.length]!;
  el<HTMLSelectElement>("steer-permission").value = next;
  syncComposerPillLabels();
  void applyModeChange({ permissionMode: next });
}

// ============================================================================
// Wire DOM Events & SSE Subscriptions
// ============================================================================

hydrateStaticChromeIcons();

document.addEventListener("click", (ev) => {
  const target = ev.target as HTMLElement | null;

  // Close overflow menu on outside click
  if (!target?.closest(".reui-menu-wrap")) {
    closeHeaderMenu();
  }

  const linkBtn = target?.closest<HTMLElement>("[data-local-path]");
  if (!linkBtn) return;
  const filePath = linkBtn.dataset.localPath;
  if (!filePath) return;
  const lineRaw = linkBtn.dataset.localLine;
  const line = lineRaw ? Number.parseInt(lineRaw, 10) : undefined;
  openLocalFile(filePath, Number.isFinite(line) ? line : undefined);
});

document.addEventListener("keydown", (ev) => {
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "f") {
    ev.preventDefault();
    el("find-bar").hidden = false;
    el<HTMLInputElement>("find-input").focus();
    el<HTMLInputElement>("find-input").select();
  } else if (ev.key === "Escape") {
    closeHeaderMenu();
    if (!el("find-bar").hidden) {
      el("find-bar").hidden = true;
      clearFindHighlights();
    }
    el("new-drawer").hidden = true;
    el("handoff-modal").hidden = true;
    el("import-modal").hidden = true;
    el("lightbox-modal").hidden = true;
  }
});

// Header overflow menu toggle
el("btn-header-more").addEventListener("click", (ev) => {
  ev.stopPropagation();
  const menu = el("header-more-menu");
  const open = menu.hidden;
  menu.hidden = !open;
  el("btn-header-more").setAttribute("aria-expanded", String(open));
});

// Find bar bindings
el<HTMLInputElement>("find-input").addEventListener("input", () => runTranscriptFind(el<HTMLInputElement>("find-input").value));
el<HTMLInputElement>("find-input").addEventListener("keydown", (ev) => {
  if (ev.key === "Enter") {
    ev.preventDefault();
    focusFindHit(ev.shiftKey ? findCursor - 1 : findCursor + 1);
  }
});
el("find-prev").addEventListener("click", () => focusFindHit(findCursor - 1));
el("find-next").addEventListener("click", () => focusFindHit(findCursor + 1));
el("find-close").addEventListener("click", () => {
  el("find-bar").hidden = true;
  clearFindHighlights();
});

// New session modal
el("toggle-new").addEventListener("click", () => openNewSessionModal());
el("empty-new-btn").addEventListener("click", () => openNewSessionModal());
el("empty-import-btn").addEventListener("click", () => void openImportNativeModal());
el("new-cancel").addEventListener("click", () => { el("new-drawer").hidden = true; });
el("new-close-x").addEventListener("click", () => { el("new-drawer").hidden = true; });
el("new-drawer").addEventListener("click", (ev) => {
  if (ev.target === el("new-drawer")) el("new-drawer").hidden = true;
});
el("new-engine").addEventListener("change", () => {
  newDrawerTouchedEngine = el<HTMLSelectElement>("new-engine").value as CliEngine;
  renderNewEngineGrid();
  syncNewModelPicker();
});
el("new-model-select").addEventListener("change", () => {
  syncModelCustomInputVisibility(el<HTMLSelectElement>("new-model-select"), el<HTMLInputElement>("new-model-custom"));
  const engine = el<HTMLSelectElement>("new-engine").value as CliEngine;
  populateEffortSelect(
    el<HTMLSelectElement>("new-effort"),
    el("new-effort-wrap"),
    enginesMap[engine]?.modelCatalog,
    resolveSelectedModel(el<HTMLSelectElement>("new-model-select"), el<HTMLInputElement>("new-model-custom")),
    el<HTMLSelectElement>("new-effort").value || undefined
  );
});
el("new-refresh-models").addEventListener("click", async () => {
  const engine = el<HTMLSelectElement>("new-engine").value as CliEngine;
  const res = (await view.services.call(SERVICE_ID, "view.models", { engine, refresh: true })) as unknown as {
    engines?: EnginesInspectMap;
  };
  if (res.engines) {
    enginesMap = { ...enginesMap, ...res.engines };
    renderEngines();
    syncNewModelPicker({ preserveCurrentSelection: true });
  }
});
el("new-submit").addEventListener("click", async () => {
  const btn = el<HTMLButtonElement>("new-submit");
  btn.disabled = true;
  setNewDrawerStatus("正在启动外部 CLI 会话…");
  try {
    const engine = el<HTMLSelectElement>("new-engine").value as CliEngine;
    const model = resolveSelectedModel(el<HTMLSelectElement>("new-model-select"), el<HTMLInputElement>("new-model-custom"));
    const effort = el<HTMLSelectElement>("new-effort").value || undefined;
    const started = (await view.services.call(SERVICE_ID, "view.start", {
      engine,
      permissionMode: el<HTMLSelectElement>("new-permission").value,
      interactionMode: el<HTMLSelectElement>("new-interaction").value,
      cwd: el<HTMLInputElement>("new-cwd").value.trim() || ".",
      ...(el<HTMLInputElement>("new-label").value.trim() ? { label: el<HTMLInputElement>("new-label").value.trim() } : {}),
      ...(model ? { model } : {}),
      ...(effort ? { reasoningEffort: effort } : {}),
      rememberPreference: el<HTMLInputElement>("new-remember-model").checked,
      ...(el<HTMLTextAreaElement>("new-prompt").value.trim() ? { prompt: el<HTMLTextAreaElement>("new-prompt").value.trim() } : {})
    })) as unknown as { cliSessionId?: string };
    el<HTMLTextAreaElement>("new-prompt").value = "";
    el("new-drawer").hidden = true;
    setNewDrawerStatus("");
    if (started.cliSessionId) {
      await selectSession(started.cliSessionId, { forceFull: true });
    }
  } catch (err) {
    setNewDrawerStatus(err instanceof Error ? err.message : String(err), true);
  } finally {
    btn.disabled = false;
  }
});

el("refresh").addEventListener("click", () => void loadInitial({ refreshModels: true }));
el("btn-import-native").addEventListener("click", () => void openImportNativeModal());
el("import-close").addEventListener("click", () => { el("import-modal").hidden = true; });
el("import-cancel").addEventListener("click", () => { el("import-modal").hidden = true; });
el("import-modal").addEventListener("click", (ev) => {
  if (ev.target === el("import-modal")) el("import-modal").hidden = true;
});
el("import-refresh").addEventListener("click", () => void scanNativeSessions());

el<HTMLInputElement>("search").addEventListener("input", () => {
  searchQuery = el<HTMLInputElement>("search").value;
  syncRailListIncremental();
});
for (const btn of Array.from(document.querySelectorAll<HTMLButtonElement>(".filter-chip[data-engine]"))) {
  btn.addEventListener("click", () => {
    engineFilter = (btn.dataset.engine as typeof engineFilter) ?? "all";
    for (const b of Array.from(document.querySelectorAll<HTMLButtonElement>(".filter-chip[data-engine]"))) {
      b.classList.toggle("active", b === btn);
    }
    syncRailListIncremental();
  });
}

// Header controls
el("ctx-meter").addEventListener("click", () => void compactCurrentSession());
el("mode-readable").addEventListener("click", () => {
  viewMode = "readable";
  el("mode-readable").classList.add("active");
  el("mode-readable").setAttribute("aria-selected", "true");
  el("mode-raw").classList.remove("active");
  el("mode-raw").setAttribute("aria-selected", "false");
  el("turns-container").hidden = false;
  el("raw-container").hidden = true;
});
el("mode-raw").addEventListener("click", () => {
  viewMode = "raw";
  el("mode-raw").classList.add("active");
  el("mode-raw").setAttribute("aria-selected", "true");
  el("mode-readable").classList.remove("active");
  el("mode-readable").setAttribute("aria-selected", "false");
  el("turns-container").hidden = true;
  el("raw-container").hidden = false;
  if (selectedId) void selectSession(selectedId, { forceFull: true });
});

el("btn-fork").addEventListener("click", () => void forkCurrentSession());
el("btn-handoff").addEventListener("click", () => {
  closeHeaderMenu();
  el("handoff-modal").hidden = false;
});
el("handoff-close").addEventListener("click", () => { el("handoff-modal").hidden = true; });
el("handoff-cancel").addEventListener("click", () => { el("handoff-modal").hidden = true; });
el("handoff-modal").addEventListener("click", (ev) => {
  if (ev.target === el("handoff-modal")) el("handoff-modal").hidden = true;
});
el("handoff-confirm").addEventListener("click", async () => {
  if (!selectedId) return;
  const btn = el<HTMLButtonElement>("handoff-confirm");
  btn.disabled = true;
  try {
    const res = (await view.services.call(SERVICE_ID, "view.handoff", {
      cliSessionId: selectedId,
      targetEngine: el<HTMLSelectElement>("handoff-engine").value,
      ...(el<HTMLInputElement>("handoff-model").value.trim() ? { targetModel: el<HTMLInputElement>("handoff-model").value.trim() } : {}),
      ...(el<HTMLTextAreaElement>("handoff-prompt").value.trim() ? { prompt: el<HTMLTextAreaElement>("handoff-prompt").value.trim() } : {})
    })) as unknown as { cliSessionId?: string; includedTurns?: number };
    el("handoff-modal").hidden = true;
    el<HTMLTextAreaElement>("handoff-prompt").value = "";
    setNotice(`已完成跨引擎交接 (${res.includedTurns ?? 0} 轮上下文)`);
    if (res.cliSessionId) await selectSession(res.cliSessionId, { forceFull: true });
  } catch (err) {
    setNotice(err instanceof Error ? err.message : String(err), true);
  } finally {
    btn.disabled = false;
  }
});

el("btn-review").addEventListener("click", () => openReviewPanel());

const notifyBtn = el<HTMLButtonElement>("btn-notify-pref");
const syncNotifyBtn = () => {
  const pref = getNotificationPref();
  notifyBtn.replaceChildren(createMenuRowContent(notificationPrefIcon(pref), "提醒偏好", notificationPrefLabel(pref)));
};
syncNotifyBtn();
notifyBtn.addEventListener("click", (ev) => {
  ev.stopPropagation();
  setNotificationPref(cycleNotificationPref(getNotificationPref()));
  syncNotifyBtn();
});

const triggerInterrupt = async () => {
  if (!selectedId) return;
  closeHeaderMenu();
  await view.services.call(SERVICE_ID, "view.stop", { cliSessionId: selectedId, mode: "interrupt" });
};

el("btn-interrupt").addEventListener("click", () => void triggerInterrupt());
el("btn-composer-stop").addEventListener("click", () => void triggerInterrupt());
function applySessionDeletedLocally(deletedId: string, nextFocusedId?: string | null): void {
  if (armedRailDeleteId === deletedId) disarmRailDelete();
  sessions = sessions.filter((s) => s.cliSessionId !== deletedId);
  sessionCache.delete(deletedId);
  if (composerTouchedSessionId === deletedId) composerTouchedSessionId = undefined;
  syncRailListIncremental();

  if (selectedId === deletedId) {
    selectedId = undefined;
    currentTranscript = null;
    turnNodes.clear();
    optimisticNodes.clear();
    el("turns-container").replaceChildren();
    el("interventions-list").replaceChildren();
    el("interventions-dock").hidden = true;
    const candidate =
      (nextFocusedId && sessions.some((s) => s.cliSessionId === nextFocusedId) ? nextFocusedId : undefined) ??
      sessions[0]?.cliSessionId;
    if (candidate) {
      void selectSession(candidate);
    } else {
      el("canvas-empty").hidden = false;
      el("canvas-active").hidden = true;
      setNotice("");
    }
  }
}

async function deleteSessionById(targetId: string, triggerBtn?: HTMLButtonElement): Promise<void> {
  const target = sessions.find((s) => s.cliSessionId === targetId);
  const label = target?.label ?? targetId;
  if (triggerBtn) triggerBtn.disabled = true;
  try {
    const res = (await view.services.call(SERVICE_ID, "view.delete", {
      cliSessionId: targetId
    })) as unknown as { deleted?: boolean; focusedCliSessionId?: string | null };
    applySessionDeletedLocally(targetId, res.focusedCliSessionId);
    setRailNotice(`已删除会话 ${label}`);
  } catch (err) {
    setRailNotice(err instanceof Error ? err.message : String(err), true);
  } finally {
    if (triggerBtn && triggerBtn.isConnected) triggerBtn.disabled = false;
  }
}

el("btn-kill").addEventListener("click", async () => {
  if (!selectedId) return;
  closeHeaderMenu();
  await view.services.call(SERVICE_ID, "view.stop", { cliSessionId: selectedId, mode: "kill" });
});
el("btn-delete").addEventListener("click", (ev) => {
  if (!selectedId) return;
  const current = currentTranscript?.summary ?? sessions.find((s) => s.cliSessionId === selectedId);
  if (current && isLiveUnsettledSession(current) && !headerDeleteArmed) {
    ev.stopPropagation();
    headerDeleteArmed = true;
    el("btn-delete").replaceChildren(createMenuRowContent("trash2", "再次点击确认终止并删除"));
    headerDeleteTimer = window.setTimeout(() => disarmHeaderDelete(), 4_000);
    return;
  }
  const targetId = selectedId;
  closeHeaderMenu();
  void deleteSessionById(targetId);
});

// Load older turns paging
el("btn-load-older").addEventListener("click", async () => {
  if (!selectedId || !currentTranscript || !currentTranscript.oldestTurnIndex) return;
  const btn = el<HTMLButtonElement>("btn-load-older");
  btn.disabled = true;
  try {
    const res = (await view.services.call(SERVICE_ID, "view.transcriptPage", {
      cliSessionId: selectedId,
      beforeTurnIndex: currentTranscript.oldestTurnIndex,
      limit: 24
    })) as unknown as { turns: CliTranscriptTurn[]; hasOlderTurns: boolean; oldestTurnIndex?: number };
    if (res.turns.length > 0) {
      const viewport = el("stream-viewport");
      const prevScrollHeight = viewport.scrollHeight;
      const container = el("turns-container");
      const firstChild = container.firstChild;
      const callbacks = makeBlockCallbacks(selectedId, currentTranscript.summary.engine);
      for (const turn of res.turns) {
        const handle = createTurnDomHandle(turn, callbacks);
        turnNodes.set(turn.turnIndex, handle);
        container.insertBefore(handle.element, firstChild);
      }
      currentTranscript.turns = [...res.turns, ...currentTranscript.turns];
      currentTranscript.hasOlderTurns = res.hasOlderTurns;
      currentTranscript.oldestTurnIndex = res.oldestTurnIndex;
      el("older-turns-wrap").hidden = !res.hasOlderTurns;
      viewport.scrollTop += viewport.scrollHeight - prevScrollHeight;
    } else {
      el("older-turns-wrap").hidden = true;
    }
  } finally {
    btn.disabled = false;
  }
});

// Composer toolbar controls
el("steer-permission").addEventListener("change", () => {
  const next = el<HTMLSelectElement>("steer-permission").value as CliPermissionMode;
  syncComposerPillLabels();
  void applyModeChange({ permissionMode: next });
});
el("btn-plan-toggle").addEventListener("click", () => {
  const next: CliInteractionMode = currentTranscript?.summary.interactionMode === "plan" ? "default" : "plan";
  void applyModeChange({ interactionMode: next });
});
el("btn-fast-tier").addEventListener("click", () => {
  const next: CliServiceTier = currentTranscript?.summary.serviceTier === "fast" ? "default" : "fast";
  void applyModeChange({ serviceTier: next });
});
el("btn-followup-mode").addEventListener("click", () => {
  followUpMode = followUpMode === "queue" ? "steer" : "queue";
  if (currentTranscript) syncCanvasHeader(currentTranscript.summary);
});
el("steer-model-select").addEventListener("change", () => {
  composerTouchedSessionId = selectedId;
  syncModelCustomInputVisibility(el<HTMLSelectElement>("steer-model-select"), el<HTMLInputElement>("steer-model-custom"));
  const engine = currentTranscript?.summary.engine;
  if (engine) {
    const model = resolveSelectedModel(el<HTMLSelectElement>("steer-model-select"), el<HTMLInputElement>("steer-model-custom"));
    populateEffortSelect(
      el<HTMLSelectElement>("steer-effort"),
      el("steer-effort-wrap"),
      enginesMap[engine]?.modelCatalog,
      model,
      el<HTMLSelectElement>("steer-effort").value || undefined
    );
    syncComposerPillLabels();
    if (model) void applyModeChange({ model });
  }
});
el("steer-effort").addEventListener("change", () => {
  composerTouchedSessionId = selectedId;
  syncComposerPillLabels();
  const effort = el<HTMLSelectElement>("steer-effort").value || undefined;
  if (effort) void applyModeChange({ reasoningEffort: effort });
});
el("steer-refresh-models").addEventListener("click", async () => {
  const engine = currentTranscript?.summary.engine;
  if (!engine) return;
  const res = (await view.services.call(SERVICE_ID, "view.models", { engine, refresh: true })) as unknown as {
    engines?: EnginesInspectMap;
  };
  if (res.engines) {
    enginesMap = { ...enginesMap, ...res.engines };
    renderEngines();
    if (currentTranscript) syncComposerModelPicker(currentTranscript.summary, false);
  }
});
el("btn-steer").addEventListener("click", () => {
  if (el("btn-steer").dataset.action === "stop") {
    void triggerInterrupt();
  } else {
    void composer.submit();
  }
});

// Lightbox modal
el("lightbox-close").addEventListener("click", () => { el("lightbox-modal").hidden = true; });
el("lightbox-open-file").addEventListener("click", () => {
  if (lightboxFilePath) openLocalFile(lightboxFilePath);
  el("lightbox-modal").hidden = true;
});
el("lightbox-modal").addEventListener("click", (ev) => {
  if (ev.target === el("lightbox-modal")) el("lightbox-modal").hidden = true;
});

// ============================================================================
// Live SSE Subscriptions (Split Protocol)
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
      syncRailListIncremental();
      if (!selectedId) {
        void selectSession(rail.cliSessionId);
      } else if (currentTranscript && currentTranscript.summary.cliSessionId === rail.cliSessionId) {
        currentTranscript.summary = {
          ...currentTranscript.summary,
          ...rail,
          lastAssistantText: rail.lastAssistantPreview || currentTranscript.summary.lastAssistantText
        };
        syncSilenceIndicator(currentTranscript.summary);
      }
      break;
    }
    case "transcript.delta": {
      const cliSessionId = typeof payload.cliSessionId === "string" ? payload.cliSessionId : undefined;
      const deltas = Array.isArray(payload.deltas) ? (payload.deltas as CliTranscriptDelta[]) : [];
      const latestSeq = typeof payload.latestSeq === "number" ? payload.latestSeq : undefined;
      const evObj = payload.event as CliTimelineEvent | undefined;
      if (cliSessionId && cliSessionId === selectedId) {
        applyDeltasToCurrentTranscript(cliSessionId, deltas, latestSeq, evObj);
      } else if (cliSessionId && sessionCache.has(cliSessionId)) {
        const entry = sessionCache.get(cliSessionId)!;
        entry.cachedAt = 0;
      }
      break;
    }
    case "engines.updated": {
      if (payload.engines && typeof payload.engines === "object") {
        enginesMap = payload.engines as EnginesInspectMap;
        renderEngines();
        syncNewModelPicker({ preserveCurrentSelection: true });
        if (currentTranscript) syncComposerModelPicker(currentTranscript.summary, false);
      }
      break;
    }
    case "preferences.updated": {
      if (payload.enginePreferences && typeof payload.enginePreferences === "object") {
        enginePreferences = payload.enginePreferences as Partial<Record<CliEngine, CliEnginePreference>>;
      }
      break;
    }
    case "focus.changed": {
      const targetId = typeof payload.focusedCliSessionId === "string" ? payload.focusedCliSessionId : undefined;
      if (targetId && targetId !== selectedId) {
        void selectSession(targetId);
      }
      break;
    }
    case "session.deleted": {
      const deletedId = typeof payload.cliSessionId === "string" ? payload.cliSessionId : undefined;
      const nextFocus = typeof payload.focusedCliSessionId === "string" ? payload.focusedCliSessionId : null;
      if (deletedId) {
        applySessionDeletedLocally(deletedId, nextFocus);
      }
      break;
    }
    case "notification.hint": {
      handleNotificationHint(view, payload as unknown as NotificationHintPayload);
      break;
    }
    case "service.ready": {
      void loadInitial();
      break;
    }
    case "service.resync": {
      void reconcileActiveTranscript(true);
      break;
    }
  }
});

// Reconciliation on tab visibility / window focus / SSE silence watchdog (15s)
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    syncSilenceIndicator(currentTranscript?.summary);
    void reconcileActiveTranscript(false);
  }
});
window.addEventListener("focus", () => {
  if (!document.hidden) {
    syncSilenceIndicator(currentTranscript?.summary);
    void reconcileActiveTranscript(false);
  }
});
window.setInterval(() => {
  syncSilenceIndicator(currentTranscript?.summary);
  if (!document.hidden && hasAnyActiveSession() && Date.now() - lastSseEventAt >= 10_000) {
    void reconcileActiveTranscript(false);
  }
}, 15_000);

// Boot
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
    syncSilenceIndicator(currentTranscript?.summary);
    void reconcileActiveTranscript(false);
  }
  wasViewVisible = ctx.visible;
});
void loadInitial();
