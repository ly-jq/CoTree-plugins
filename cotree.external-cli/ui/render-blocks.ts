/// <reference lib="dom" />
import type { PluginUiJsonObject } from "../../../packages/plugin-sdk/src/index.js";
import {
  classifyToolSemanticCategory,
  parseUnifiedDiffFileStats,
  stripAnsi,
  type CliChangedFileStat,
  type CliEngine,
  type CliInteractionMode,
  type CliPendingIntervention,
  type CliPermissionMode,
  type CliSessionStatus,
  type CliTranscriptBlock,
  type CliTranscriptBlockStatus,
  type CliTranscriptTurn
} from "../src/shared.js";
import { IncrementalMarkdownView } from "./markdown-incremental.js";
import { createProviderIcon, createUiIcon, setIconAndText, setOnlyIcon, type UiIconName } from "./icons.js";

export function engineDisplayName(engine: CliEngine): string {
  switch (engine) {
    case "codex":
      return "Codex";
    case "claude":
      return "Claude";
    case "antigravity":
      return "Antigravity";
    case "gemini":
      return "Gemini";
    case "opencode":
      return "OpenCode";
    case "qwen":
      return "Qwen";
    case "kiro":
      return "Kiro";
    case "goose":
      return "Goose";
    case "acp":
      return "ACP";
  }
}

export function permissionModeDisplay(mode: CliPermissionMode | undefined): {
  label: string;
  short: string;
  tone: string;
  icon: UiIconName;
} {
  switch (mode) {
    case "full_access":
      return { label: "完全放行 (Full Access)", short: "完全放行", tone: "warn", icon: "zap" };
    case "auto":
      return { label: "AI 自动审核 (Auto)", short: "AI 审核", tone: "run", icon: "sparkles" };
    case "accept_edits":
      return { label: "自动编辑 (Accept Edits)", short: "自动编辑", tone: "ok", icon: "pencil" };
    case "supervised":
    default:
      return { label: "受控审批 (Supervised)", short: "受控审批", tone: "idle", icon: "shield" };
  }
}

export function interactionModeDisplay(mode: CliInteractionMode | undefined): { label: string; isPlan: boolean } {
  return mode === "plan" ? { label: "规划模式 (Plan)", isPlan: true } : { label: "执行模式 (Default)", isPlan: false };
}

export function statusDisplay(status: CliSessionStatus): { label: string; tone: "run" | "warn" | "ok" | "err" | "idle" } {
  switch (status) {
    case "starting":
      return { label: "启动中", tone: "run" };
    case "running":
      return { label: "运行中", tone: "run" };
    case "interrupting":
      return { label: "中断中", tone: "warn" };
    case "needs_intervention":
      return { label: "待审批", tone: "warn" };
    case "idle":
      return { label: "就绪", tone: "ok" };
    case "stopped":
      return { label: "已停止", tone: "idle" };
    case "exited":
      return { label: "已退出", tone: "idle" };
    case "failed":
      return { label: "失败", tone: "err" };
  }
}

export function formatShortTime(iso: string | undefined): string {
  if (!iso) return "";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatPreciseTime(iso: string | undefined): string {
  if (!iso) return "";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function formatDurationMs(ms: number | undefined): string {
  if (ms === undefined || !Number.isFinite(ms) || ms < 0) return "";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(1)}s`;
  const min = Math.floor(sec / 60);
  const rem = Math.round(sec % 60);
  return `${min}m ${rem}s`;
}

export function formatUsageSummary(usage?: Record<string, unknown>, costUsd?: number): string {
  const parts: string[] = [];
  if (usage) {
    const input =
      typeof usage.input_tokens === "number"
        ? usage.input_tokens
        : typeof usage.inputTokens === "number"
          ? usage.inputTokens
          : undefined;
    const output =
      typeof usage.output_tokens === "number"
        ? usage.output_tokens
        : typeof usage.outputTokens === "number"
          ? usage.outputTokens
          : undefined;
    const total =
      typeof usage.total_tokens === "number"
        ? usage.total_tokens
        : typeof usage.totalTokens === "number"
          ? usage.totalTokens
          : input !== undefined && output !== undefined
            ? input + output
            : undefined;
    if (total !== undefined && total > 0) {
      parts.push(total >= 1000 ? `${(total / 1000).toFixed(1)}k tok` : `${total} tok`);
    }
  }
  if (typeof costUsd === "number" && Number.isFinite(costUsd) && costUsd > 0) {
    parts.push(`$${costUsd.toFixed(4)}`);
  }
  return parts.join(" · ");
}

function blockStatusLabel(status: CliTranscriptBlockStatus): string {
  switch (status) {
    case "streaming":
      return "运行中";
    case "completed":
      return "完成";
    case "failed":
      return "失败";
    case "interrupted":
      return "已中断";
    case "pending":
      return "待确认";
  }
}

function renderDiffPre(diffText: string): HTMLElement {
  const pre = document.createElement("pre");
  pre.className = "cli-diff-pre";
  for (const line of diffText.replace(/\r\n/g, "\n").split("\n")) {
    const span = document.createElement("span");
    span.className =
      line.startsWith("+") && !line.startsWith("+++")
        ? "diff-add"
        : line.startsWith("-") && !line.startsWith("---")
          ? "diff-del"
          : line.startsWith("@@") || line.startsWith("diff ")
            ? "diff-hunk"
            : "diff-ctx";
    span.textContent = `${line}\n`;
    pre.append(span);
  }
  return pre;
}

export type BlockActionCallbacks = {
  engine?: CliEngine;
  onOpenFile?: (filePath: string, line?: number) => void;
  onOpenReview?: () => void;
  onLoadBlockDetail?: (blockId: string) => Promise<string>;
  onLoadWorkspaceImage?: (filePath: string) => Promise<string | undefined>;
  onOpenLightbox?: (src: string, caption: string, filePath?: string) => void;
  onImplementPlan?: (planText: string) => void;
  onRevisePlan?: (planText: string) => void;
  onForkAtTurn?: (turnIndex: number) => void;
  onUndoTurn?: (turnIndex: number, canUndoFiles: boolean, hasCheckpoint: boolean) => void;
};

export type BlockDomHandle = {
  blockId: string;
  kind: CliTranscriptBlock["kind"];
  element: HTMLElement;
  appendDelta: (delta: string, updatedAt: string) => void;
  updateStatus: (status: CliTranscriptBlockStatus, title?: string, meta?: Record<string, unknown>, updatedAt?: string) => void;
  replaceBlock: (block: CliTranscriptBlock) => void;
  dispose: () => void;
};

export function createBlockDomHandle(
  initialBlock: CliTranscriptBlock,
  callbacks: BlockActionCallbacks = {}
): BlockDomHandle {
  let block = { ...initialBlock };
  let thinkingTimer: ReturnType<typeof setInterval> | undefined;

  const stopThinkingTimer = () => {
    if (thinkingTimer) {
      clearInterval(thinkingTimer);
      thinkingTimer = undefined;
    }
  };

  // 1. User / Steer message (t3code right-aligned rounded-2xl surface)
  if (block.kind === "user" || block.kind === "steer") {
    const rowWrap = document.createElement("div");
    rowWrap.className = `cli-user-row ${block.kind}`;
    rowWrap.dataset.blockId = block.id;

    const bubble = document.createElement("div");
    bubble.className = `cli-bubble ${block.kind}`;

    const body = document.createElement("div");
    body.className = "cli-bubble-body";
    body.textContent = block.text;
    bubble.append(body);

    const attachments = Array.isArray(block.meta?.attachments)
      ? (block.meta!.attachments as Array<{ fileName?: string; path?: string; mimeType?: string }>)
      : [];
    if (attachments.length > 0) {
      const attBar = document.createElement("div");
      attBar.className = "cli-bubble-attachments";
      for (const att of attachments) {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "cli-att-pill";
        chip.append(
          createUiIcon(att.mimeType?.startsWith("image/") ? "image" : "paperclip", 12),
          document.createTextNode(att.fileName ?? "附件")
        );
        if (att.path) chip.dataset.localPath = att.path;
        attBar.append(chip);
      }
      bubble.append(attBar);
    }

    const metaRow = document.createElement("div");
    metaRow.className = "cli-bubble-meta";
    if (block.kind === "steer") {
      const tag = document.createElement("span");
      tag.className = "cli-steer-tag";
      tag.append(createUiIcon("cornerUpRight", 11), document.createTextNode("运行中插话"));
      metaRow.append(tag);
    }
    const timeEl = document.createElement("span");
    timeEl.className = "tabular-nums";
    timeEl.textContent = formatShortTime(block.startedAt);

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "cli-mini-btn hover-reveal";
    copyBtn.setAttribute("aria-label", "复制消息");
    copyBtn.title = "复制";
    setOnlyIcon(copyBtn, "copy", 12);
    copyBtn.addEventListener("click", () => {
      void navigator.clipboard?.writeText(block.text).then(() => {
        setOnlyIcon(copyBtn, "check", 12);
        setTimeout(() => setOnlyIcon(copyBtn, "copy", 12), 1200);
      });
    });

    metaRow.append(timeEl, copyBtn);
    rowWrap.append(bubble, metaRow);

    return {
      blockId: block.id,
      kind: block.kind,
      element: rowWrap,
      appendDelta(delta) {
        block.text += delta;
        body.textContent = block.text;
      },
      updateStatus(status) {
        block.status = status;
      },
      replaceBlock(next) {
        block = { ...next };
        body.textContent = next.text;
      },
      dispose: stopThinkingTimer
    };
  }

  // 2. Assistant streaming incremental Markdown (t3code borderless editorial prose)
  if (block.kind === "assistant") {
    const card = document.createElement("div");
    card.className = "cli-assistant-block";
    card.dataset.blockId = block.id;

    const head = document.createElement("div");
    head.className = "cli-assistant-head";

    const author = document.createElement("div");
    author.className = "cli-assistant-author";
    if (callbacks.engine) {
      author.append(createProviderIcon(callbacks.engine, 14));
    }
    const label = document.createElement("span");
    label.className = "cli-assistant-name";
    label.textContent = callbacks.engine ? engineDisplayName(callbacks.engine) : block.title;
    const time = document.createElement("span");
    time.className = "cli-assistant-time tabular-nums";
    time.textContent = formatShortTime(block.updatedAt);
    author.append(label, time);

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "cli-mini-btn hover-reveal";
    copyBtn.setAttribute("aria-label", "复制回复");
    copyBtn.title = "复制回复 Markdown";
    setIconAndText(copyBtn, "copy", "复制", 12);
    copyBtn.addEventListener("click", () => {
      void navigator.clipboard?.writeText(mdView.getText()).then(() => {
        setIconAndText(copyBtn, "check", "已复制", 12);
        setTimeout(() => setIconAndText(copyBtn, "copy", "复制", 12), 1200);
      });
    });

    head.append(author, copyBtn);
    const mdView = new IncrementalMarkdownView(block.text);
    card.append(head, mdView.root);

    return {
      blockId: block.id,
      kind: block.kind,
      element: card,
      appendDelta(delta, updatedAt) {
        block.text += delta;
        mdView.appendDelta(delta);
        time.textContent = formatShortTime(updatedAt);
      },
      updateStatus(status, _title, _meta, updatedAt) {
        block.status = status;
        if (updatedAt) time.textContent = formatShortTime(updatedAt);
      },
      replaceBlock(next) {
        block = { ...next };
        mdView.setText(next.text);
        time.textContent = formatShortTime(next.updatedAt);
      },
      dispose: stopThinkingTimer
    };
  }

  // 3. Proposed Plan Card (t3code ProposedPlanCard.tsx inspired)
  if (block.kind === "plan") {
    const card = document.createElement("div");
    card.className = "cli-plan-card";
    card.dataset.blockId = block.id;

    const head = document.createElement("div");
    head.className = "cli-row cli-between cli-plan-head";
    const titleWrap = document.createElement("div");
    titleWrap.className = "cli-row cli-flex-1";
    const badge = document.createElement("span");
    badge.className = "cli-pill run";
    badge.append(createUiIcon("compass", 11), document.createTextNode("PLAN"));
    const titleEl = document.createElement("h4");
    titleEl.className = "cli-plan-title";
    titleEl.textContent = block.title || "实施方案";
    titleWrap.append(badge, titleEl);

    const headTools = document.createElement("div");
    headTools.className = "cli-row";
    const statusEl = document.createElement("span");
    statusEl.className = "cli-muted";
    statusEl.textContent = blockStatusLabel(block.status);

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "reui-icon-btn";
    copyBtn.title = "复制计划 Markdown";
    copyBtn.setAttribute("aria-label", "复制计划 Markdown");
    setOnlyIcon(copyBtn, "copy", 14);
    copyBtn.addEventListener("click", () => {
      void navigator.clipboard?.writeText(mdView.getText()).then(() => {
        setOnlyIcon(copyBtn, "check", 14);
        setTimeout(() => setOnlyIcon(copyBtn, "copy", 14), 1200);
      });
    });

    const dlBtn = document.createElement("button");
    dlBtn.type = "button";
    dlBtn.className = "reui-icon-btn";
    dlBtn.title = "下载为 .md 文件";
    dlBtn.setAttribute("aria-label", "下载计划为 Markdown 文件");
    setOnlyIcon(dlBtn, "download", 14);
    dlBtn.addEventListener("click", () => {
      const blob = new Blob([mdView.getText()], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `plan-turn-${block.turnIndex}.md`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    });

    headTools.append(statusEl, copyBtn, dlBtn);
    head.append(titleWrap, headTools);

    const bodyWrap = document.createElement("div");
    bodyWrap.className = "cli-plan-body";
    const mdView = new IncrementalMarkdownView(block.text);
    bodyWrap.append(mdView.root);

    const toggleExpand = document.createElement("button");
    toggleExpand.type = "button";
    toggleExpand.className = "cli-plan-expand";
    let expanded = false;
    const syncCollapse = () => {
      const lineCount = mdView.getText().split("\n").length;
      const shouldClamp = lineCount > 20 && !expanded;
      bodyWrap.classList.toggle("clamped", shouldClamp);
      toggleExpand.hidden = lineCount <= 20;
      setIconAndText(
        toggleExpand,
        expanded ? "chevronUp" : "chevronDown",
        expanded ? "收起方案" : `展开完整方案 (${lineCount} 行)`,
        13
      );
    };
    toggleExpand.addEventListener("click", () => {
      expanded = !expanded;
      syncCollapse();
    });
    syncCollapse();

    const actions = document.createElement("div");
    actions.className = "cli-row cli-wrap cli-plan-actions";
    const implBtn = document.createElement("button");
    implBtn.type = "button";
    implBtn.className = "cotree-button";
    implBtn.dataset.variant = "primary";
    setIconAndText(implBtn, "play", "开始实施", 12);
    implBtn.addEventListener("click", () => callbacks.onImplementPlan?.(mdView.getText()));

    const reviseBtn = document.createElement("button");
    reviseBtn.type = "button";
    reviseBtn.className = "cotree-button";
    setIconAndText(reviseBtn, "pencil", "修改计划", 13);
    reviseBtn.addEventListener("click", () => callbacks.onRevisePlan?.(mdView.getText()));

    actions.append(implBtn, reviseBtn);
    card.append(head, bodyWrap, toggleExpand, actions);

    return {
      blockId: block.id,
      kind: block.kind,
      element: card,
      appendDelta(delta) {
        block.text += delta;
        mdView.appendDelta(delta);
        syncCollapse();
      },
      updateStatus(status, title) {
        block.status = status;
        statusEl.textContent = blockStatusLabel(status);
        if (title) titleEl.textContent = title;
      },
      replaceBlock(next) {
        block = { ...next };
        if (next.title) titleEl.textContent = next.title;
        statusEl.textContent = blockStatusLabel(next.status);
        mdView.setText(next.text);
        syncCollapse();
      },
      dispose: stopThinkingTimer
    };
  }

  // 4. Generated Image Media Card
  if (block.kind === "image") {
    const card = document.createElement("div");
    card.className = "cli-image-card";
    card.dataset.blockId = block.id;

    const head = document.createElement("div");
    head.className = "cli-row cli-between";
    const titleWrap = document.createElement("div");
    titleWrap.className = "cli-row cli-flex-1";
    const titleEl = document.createElement("strong");
    titleEl.className = "cli-image-title";
    titleEl.textContent = block.title || "生成的图像";
    titleWrap.append(createUiIcon("image", 15), titleEl);
    const statusEl = document.createElement("span");
    statusEl.className = `cli-pill ${block.status === "completed" ? "ok" : block.status === "failed" ? "err" : "run"}`;
    statusEl.textContent = blockStatusLabel(block.status);
    head.append(titleWrap, statusEl);

    const previewBox = document.createElement("div");
    previewBox.className = "cli-image-preview";
    const pathEl = document.createElement("div");
    pathEl.className = "cli-mono cli-muted cli-image-path";

    const actions = document.createElement("div");
    actions.className = "cli-row cli-wrap";
    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className = "cotree-button compact-btn";
    openBtn.dataset.variant = "primary";
    setIconAndText(openBtn, "maximize2", "在文件面板预览", 13);
    const copyPathBtn = document.createElement("button");
    copyPathBtn.type = "button";
    copyPathBtn.className = "cotree-button compact-btn";
    setIconAndText(copyPathBtn, "copy", "复制路径", 13);
    actions.append(openBtn, copyPathBtn);

    let loadedBlobUrl: string | undefined;
    const syncImageState = () => {
      const savedPath =
        (typeof block.meta?.savedPath === "string" ? block.meta.savedPath : undefined) ??
        (block.text.trim() || undefined);
      pathEl.textContent = savedPath ?? "图像生成中…";
      openBtn.disabled = !savedPath;
      copyPathBtn.disabled = !savedPath;
      openBtn.onclick = () => {
        if (savedPath) callbacks.onOpenFile?.(savedPath);
      };
      copyPathBtn.onclick = () => {
        if (!savedPath) return;
        void navigator.clipboard?.writeText(savedPath).then(() => {
          setIconAndText(copyPathBtn, "check", "已复制", 13);
          setTimeout(() => setIconAndText(copyPathBtn, "copy", "复制路径", 13), 1200);
        });
      };

      if (savedPath && !loadedBlobUrl && callbacks.onLoadWorkspaceImage) {
        void callbacks.onLoadWorkspaceImage(savedPath).then((url) => {
          if (!url) return;
          loadedBlobUrl = url;
          previewBox.replaceChildren();
          const img = document.createElement("img");
          img.src = url;
          img.alt = block.title || "生成的图像";
          img.className = "cli-image-thumb";
          img.addEventListener("click", () => callbacks.onOpenLightbox?.(url, block.title || savedPath, savedPath));
          previewBox.append(img);
        });
      }
    };
    syncImageState();
    card.append(head, previewBox, pathEl, actions);

    return {
      blockId: block.id,
      kind: block.kind,
      element: card,
      appendDelta() {},
      updateStatus(status, title, meta) {
        block.status = status;
        if (title) titleEl.textContent = title;
        if (meta) block.meta = { ...(block.meta ?? {}), ...meta };
        statusEl.textContent = blockStatusLabel(status);
        syncImageState();
      },
      replaceBlock(next) {
        block = { ...next };
        titleEl.textContent = next.title || "生成的图像";
        statusEl.textContent = blockStatusLabel(next.status);
        statusEl.className = `cli-pill ${next.status === "completed" ? "ok" : next.status === "failed" ? "err" : "run"}`;
        syncImageState();
      },
      dispose() {
        stopThinkingTimer();
        if (loadedBlobUrl?.startsWith("blob:")) URL.revokeObjectURL(loadedBlobUrl);
      }
    };
  }

  // 5. Reasoning / Thinking WorkLog row (t3code WorkLog style)
  if (block.kind === "reasoning") {
    const details = document.createElement("details");
    details.className = `worklog-row reasoning${block.status === "streaming" ? " streaming" : ""}`;
    details.dataset.blockId = block.id;
    details.open = block.status === "streaming";

    const summary = document.createElement("summary");
    summary.className = "worklog-summary";
    const left = document.createElement("span");
    left.className = "worklog-left";
    const chevron = createUiIcon("chevronRight", 13, "worklog-chevron");
    const icon = createUiIcon("brain", 14, "worklog-kind-icon");
    const titleEl = document.createElement("span");
    titleEl.className = "worklog-title";
    left.append(icon, titleEl, chevron);

    const statusEl = document.createElement("span");
    statusEl.className = "worklog-trailing tabular-nums";
    summary.append(left, statusEl);

    const body = document.createElement("div");
    body.className = "worklog-details";
    const pre = document.createElement("pre");
    pre.className = "cli-pre reasoning-pre";
    pre.textContent = block.text;
    body.append(pre);
    details.append(summary, body);

    const startMs = Date.parse(block.startedAt) || Date.now();
    const updateElapsed = () => {
      const endMs = block.status === "streaming" ? Date.now() : Date.parse(block.updatedAt) || Date.now();
      const sec = Math.max(0, Math.round((endMs - startMs) / 1000));
      titleEl.textContent = block.status === "streaming" ? `思考中 (${sec}s)…` : `已思考 ${sec}s`;
      statusEl.textContent = block.status === "streaming" ? "推理中" : "";
      details.classList.toggle("streaming", block.status === "streaming");
    };
    updateElapsed();
    if (block.status === "streaming") {
      thinkingTimer = setInterval(updateElapsed, 1000);
    }

    return {
      blockId: block.id,
      kind: block.kind,
      element: details,
      appendDelta(delta, updatedAt) {
        block.text += delta;
        block.updatedAt = updatedAt;
        pre.append(document.createTextNode(delta));
      },
      updateStatus(status, _title, _meta, updatedAt) {
        block.status = status;
        if (updatedAt) block.updatedAt = updatedAt;
        if (status !== "streaming") {
          stopThinkingTimer();
          details.open = false;
        }
        updateElapsed();
      },
      replaceBlock(next) {
        block = { ...next };
        pre.textContent = next.text;
        if (next.status !== "streaming") {
          stopThinkingTimer();
          details.open = false;
        }
        updateElapsed();
      },
      dispose: stopThinkingTimer
    };
  }

  // 6. Command / File Change / Tool / Stderr / Notice / Intervention (t3code WorkLog rows)
  const details = document.createElement("details");
  const isDiagnosticStderr = block.kind === "stderr" && block.meta?.diagnostic === true;
  details.className = `worklog-row ${isDiagnosticStderr ? "stderr-diag" : block.kind}${block.status === "failed" ? " is-failed" : ""}`;
  details.dataset.blockId = block.id;
  details.open =
    block.kind === "file_change" ||
    block.kind === "intervention" ||
    block.status === "failed" ||
    (block.kind === "stderr" && !isDiagnosticStderr);

  const summary = document.createElement("summary");
  summary.className = "worklog-summary";
  const left = document.createElement("span");
  left.className = "worklog-left";

  const iconName: UiIconName =
    block.kind === "command"
      ? "terminal"
      : block.kind === "file_change"
        ? "fileDiff"
        : block.kind === "tool"
          ? "wrench"
          : block.kind === "intervention"
            ? "shield"
            : block.kind === "stderr"
              ? isDiagnosticStderr
                ? "info"
                : "alertTriangle"
              : "info";

  const kindIcon = createUiIcon(iconName, 14, "worklog-kind-icon");
  const kindLabel = document.createElement("span");
  kindLabel.className = "worklog-verb";
  kindLabel.textContent =
    block.kind === "command"
      ? "运行"
      : block.kind === "file_change"
        ? "变更"
        : block.kind === "tool"
          ? "工具"
          : block.kind === "intervention"
            ? "审批"
            : block.kind === "stderr"
              ? isDiagnosticStderr
                ? "诊断日志"
                : "错误输出"
              : "系统";

  const titleEl = document.createElement("span");
  titleEl.className = "cli-tool-title worklog-title cli-mono";
  titleEl.textContent = stripAnsi(block.title);
  const chevron = createUiIcon("chevronRight", 13, "worklog-chevron");
  left.append(kindIcon, kindLabel, titleEl, chevron);

  const statusPill = document.createElement("span");
  const syncStatusPill = () => {
    const exitCode = typeof block.meta?.exitCode === "number" ? block.meta.exitCode : undefined;
    const isDiag = block.kind === "stderr" && block.meta?.diagnostic === true;
    const lineCount = typeof block.meta?.lineCount === "number" ? block.meta.lineCount : undefined;
    const tone = isDiag
      ? "idle"
      : block.status === "failed" || (exitCode !== undefined && exitCode !== 0)
        ? "err"
        : block.status === "pending"
          ? "warn"
          : block.status === "streaming"
            ? "run"
            : "ok";
    statusPill.className = `worklog-badge ${tone} tabular-nums`;
    statusPill.textContent =
      isDiag && lineCount
        ? `${lineCount} 行`
        : exitCode !== undefined
          ? `exit ${exitCode}`
          : blockStatusLabel(block.status);
  };
  syncStatusPill();
  summary.append(left, statusPill);
  details.append(summary);

  const bodyContainer = document.createElement("div");
  bodyContainer.className = "worklog-details";
  let textPre: HTMLPreElement | undefined;
  let expandBtn: HTMLButtonElement | undefined;

  const renderBodyContent = () => {
    bodyContainer.replaceChildren();
    textPre = undefined;
    expandBtn = undefined;

    if (block.kind === "tool" && block.meta?.parameters) {
      const paramPre = document.createElement("pre");
      paramPre.className = "cli-pre compact";
      paramPre.textContent = JSON.stringify(block.meta.parameters, null, 2);
      bodyContainer.append(paramPre);
    }

    const cleaned = stripAnsi(block.text || "");
    if (cleaned.trim()) {
      if (block.kind === "file_change") {
        bodyContainer.append(renderDiffPre(cleaned));
      } else {
        const pre = document.createElement("pre");
        pre.className = `cli-pre ${block.kind === "stderr" && !isDiagnosticStderr ? "stderr-pre" : ""}`;
        pre.textContent = cleaned;
        textPre = pre;
        bodyContainer.append(pre);
      }
    }

    if (block.outputOmitted && callbacks.onLoadBlockDetail) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cotree-button compact-btn cli-expand-full-btn";
      const kb = block.totalTextChars ? Math.max(1, Math.round(block.totalTextChars / 1024)) : "?";
      btn.textContent = `展开完整输出 (${kb} KB)`;
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        btn.textContent = "加载完整输出中…";
        try {
          const full = await callbacks.onLoadBlockDetail!(block.id);
          block.text = full;
          block.outputOmitted = false;
          renderBodyContent();
        } catch {
          btn.disabled = false;
          btn.textContent = "加载失败，点击重试";
        }
      });
      expandBtn = btn;
      bodyContainer.append(btn);
    }
  };
  renderBodyContent();
  details.append(bodyContainer);

  return {
    blockId: block.id,
    kind: block.kind,
    element: details,
    appendDelta(delta) {
      const clean = stripAnsi(delta);
      block.text += clean;
      if (block.kind === "file_change") {
        renderBodyContent();
        return;
      }
      if (!textPre) {
        const pre = document.createElement("pre");
        pre.className = "cli-pre";
        pre.textContent = clean;
        textPre = pre;
        if (expandBtn) bodyContainer.insertBefore(pre, expandBtn);
        else bodyContainer.append(pre);
      } else {
        textPre.append(document.createTextNode(clean));
      }
    },
    updateStatus(status, title, meta) {
      block.status = status;
      if (title) {
        block.title = title;
        titleEl.textContent = stripAnsi(title);
      }
      if (meta) block.meta = { ...(block.meta ?? {}), ...meta };
      syncStatusPill();
    },
    replaceBlock(next) {
      block = { ...next };
      titleEl.textContent = stripAnsi(next.title);
      syncStatusPill();
      renderBodyContent();
    },
    dispose: stopThinkingTimer
  };
}

// ============================================================================
// Turn DOM Handle (t3code airy turn flow + subtle hover footer)
// ============================================================================

export type TurnDomHandle = {
  turnIndex: number;
  element: HTMLElement;
  blocks: Map<string, BlockDomHandle>;
  syncTurn: (turn: CliTranscriptTurn) => void;
  upsertBlock: (block: CliTranscriptBlock) => void;
  appendBlockDelta: (blockId: string, delta: string, updatedAt: string) => void;
  updateBlockStatus: (
    blockId: string,
    status: CliTranscriptBlockStatus,
    title?: string,
    meta?: Record<string, unknown>,
    updatedAt?: string
  ) => void;
  updateCheckpoint: (turn: CliTranscriptTurn) => void;
  dispose: () => void;
};

export function createTurnDomHandle(
  initialTurn: CliTranscriptTurn,
  callbacks: BlockActionCallbacks = {}
): TurnDomHandle {
  let turn = initialTurn;
  const section = document.createElement("section");
  section.className = `cli-turn status-${turn.status}`;
  section.dataset.turnIndex = String(turn.turnIndex);

  const blocksHost = document.createElement("div");
  blocksHost.className = "cli-turn-blocks";

  const groupSummaryBar = document.createElement("div");
  groupSummaryBar.className = "cli-tool-group-hint";
  groupSummaryBar.hidden = true;

  const checkpointBar = document.createElement("div");
  checkpointBar.className = "cli-turn-checkpoint";
  checkpointBar.hidden = true;

  const footer = document.createElement("div");
  footer.className = "cli-turn-footer";
  const metaSpan = document.createElement("span");
  metaSpan.className = "cli-turn-meta tabular-nums";

  const actionsWrap = document.createElement("div");
  actionsWrap.className = "cli-row cli-turn-actions";

  const forkBtn = document.createElement("button");
  forkBtn.type = "button";
  forkBtn.className = "cli-mini-btn";
  forkBtn.title = "从本轮创建分支会话";
  setIconAndText(forkBtn, "gitBranch", "分支", 12);
  forkBtn.addEventListener("click", () => callbacks.onForkAtTurn?.(turn.turnIndex));

  const undoBtn = document.createElement("button");
  undoBtn.type = "button";
  undoBtn.className = "cli-mini-btn";
  undoBtn.title = "撤回本轮及之后轮次";
  setIconAndText(undoBtn, "rotateCcw", "撤回", 12);
  undoBtn.addEventListener("click", () =>
    callbacks.onUndoTurn?.(
      turn.turnIndex,
      turn.checkpoint?.canUndoFiles === true,
      Boolean(turn.checkpoint?.beforeRef)
    )
  );

  actionsWrap.append(forkBtn, undoBtn);
  footer.append(metaSpan, actionsWrap);

  section.append(blocksHost, groupSummaryBar, checkpointBar, footer);

  const blockHandles = new Map<string, BlockDomHandle>();

  const triggerLabel = (t: CliTranscriptTurn["trigger"]) => {
    switch (t) {
      case "initial":
        return "首轮";
      case "resume":
        return "续聊";
      case "queued":
        return "队列";
      case "handoff":
        return "交接";
      default:
        return "追问";
    }
  };

  const syncFooter = () => {
    section.className = `cli-turn status-${turn.status}`;
    const bits: string[] = [
      `#${turn.turnIndex} ${triggerLabel(turn.trigger)}`,
      formatShortTime(turn.startedAt)
    ];
    if (turn.durationMs !== undefined) bits.push(formatDurationMs(turn.durationMs));
    const usageText = formatUsageSummary(turn.usage, turn.costUsd);
    if (usageText) bits.push(usageText);
    metaSpan.textContent = bits.filter(Boolean).join(" · ");
  };

  const syncToolGroupHint = () => {
    const toolBlocks = turn.blocks.filter((b) => b.kind === "command" || b.kind === "file_change" || b.kind === "tool");
    if (toolBlocks.length < 3) {
      groupSummaryBar.hidden = true;
      return;
    }
    const counts = new Map<string, number>();
    for (const blk of toolBlocks) {
      const cat = classifyToolSemanticCategory(blk);
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
    const labels: Record<string, string> = {
      read: "读取",
      search: "搜索",
      edit: "编辑",
      command: "命令",
      browser: "网络",
      other: "工具"
    };
    const parts = [...counts.entries()].map(([k, n]) => `${labels[k] ?? k} ×${n}`);
    const streaming = toolBlocks.some((b) => b.status === "streaming");
    groupSummaryBar.hidden = false;
    groupSummaryBar.replaceChildren(
      createUiIcon(streaming ? "clock" : "layers", 13),
      document.createTextNode(`${streaming ? "执行中" : "步骤汇总"} · ${parts.join(" · ")}`)
    );
  };

  const syncCheckpointBar = () => {
    const files = turn.checkpoint?.changedFiles ?? [];
    if (files.length === 0) {
      checkpointBar.hidden = true;
      return;
    }
    checkpointBar.hidden = false;
    checkpointBar.replaceChildren();
    const label = document.createElement("span");
    label.className = "cli-row cli-muted tabular-nums";
    const totalAdd = files.reduce((s, f) => s + f.additions, 0);
    const totalDel = files.reduce((s, f) => s + f.deletions, 0);
    const addSpan = document.createElement("span");
    addSpan.className = "diff-stat-add";
    addSpan.textContent = `+${totalAdd}`;
    const delSpan = document.createElement("span");
    delSpan.className = "diff-stat-del";
    delSpan.textContent = `-${totalDel}`;
    label.append(createUiIcon("fileDiff", 13), document.createTextNode(`${files.length} 个文件`), addSpan, delSpan);
    checkpointBar.append(label);

    for (const f of files.slice(0, 6)) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "cli-file-chip";
      chip.dataset.localPath = f.path;
      const base = f.path.split(/[\\/]/).pop() ?? f.path;
      chip.title = f.path;
      const nameSpan = document.createElement("span");
      nameSpan.className = "cli-mono";
      nameSpan.textContent = base;
      const statAdd = document.createElement("span");
      statAdd.className = "diff-stat-add tabular-nums";
      statAdd.textContent = `+${f.additions}`;
      const statDel = document.createElement("span");
      statDel.className = "diff-stat-del tabular-nums";
      statDel.textContent = `-${f.deletions}`;
      chip.append(nameSpan, statAdd, statDel);
      checkpointBar.append(chip);
    }
  };

  const upsertBlock = (blk: CliTranscriptBlock) => {
    const existing = blockHandles.get(blk.id);
    if (existing) {
      existing.replaceBlock(blk);
    } else {
      const handle = createBlockDomHandle(blk, callbacks);
      blockHandles.set(blk.id, handle);
      blocksHost.append(handle.element);
    }
    const idx = turn.blocks.findIndex((b) => b.id === blk.id);
    if (idx >= 0) turn.blocks[idx] = blk;
    else turn.blocks.push(blk);
    syncToolGroupHint();
  };

  syncFooter();
  for (const blk of turn.blocks) {
    const handle = createBlockDomHandle(blk, callbacks);
    blockHandles.set(blk.id, handle);
    blocksHost.append(handle.element);
  }
  syncToolGroupHint();
  syncCheckpointBar();

  return {
    turnIndex: turn.turnIndex,
    element: section,
    blocks: blockHandles,
    syncTurn(next) {
      turn = next;
      syncFooter();
      for (const blk of next.blocks) {
        const existing = blockHandles.get(blk.id);
        if (existing) existing.replaceBlock(blk);
        else {
          const handle = createBlockDomHandle(blk, callbacks);
          blockHandles.set(blk.id, handle);
          blocksHost.append(handle.element);
        }
      }
      syncToolGroupHint();
      syncCheckpointBar();
    },
    upsertBlock,
    appendBlockDelta(blockId, delta, updatedAt) {
      const handle = blockHandles.get(blockId);
      if (handle) handle.appendDelta(delta, updatedAt);
    },
    updateBlockStatus(blockId, status, title, meta, updatedAt) {
      const handle = blockHandles.get(blockId);
      if (handle) handle.updateStatus(status, title, meta, updatedAt);
      const blk = turn.blocks.find((b) => b.id === blockId);
      if (blk) {
        blk.status = status;
        if (title) blk.title = title;
        if (meta) blk.meta = { ...(blk.meta ?? {}), ...meta };
      }
      syncToolGroupHint();
    },
    updateCheckpoint(updatedTurn) {
      turn = updatedTurn;
      syncCheckpointBar();
    },
    dispose() {
      for (const h of blockHandles.values()) h.dispose();
      blockHandles.clear();
    }
  };
}

// ============================================================================
// Sticky Changed-Files Tree Bar (Zero innerHTML, crisp vector icons)
// ============================================================================

export function collectSessionChangedFiles(turns: CliTranscriptTurn[]): CliChangedFileStat[] {
  const byPath = new Map<string, CliChangedFileStat>();
  for (const turn of turns) {
    for (const file of turn.checkpoint?.changedFiles ?? []) {
      const prev = byPath.get(file.path);
      if (prev) {
        prev.additions += file.additions;
        prev.deletions += file.deletions;
        prev.status = file.status;
      } else {
        byPath.set(file.path, { ...file });
      }
    }
    for (const block of turn.blocks) {
      if (block.kind === "file_change" && block.text) {
        for (const stat of parseUnifiedDiffFileStats(block.text)) {
          if (!byPath.has(stat.path)) byPath.set(stat.path, stat);
        }
      }
    }
  }
  return [...byPath.values()];
}

export function renderChangedFilesBar(
  container: HTMLElement,
  turns: CliTranscriptTurn[],
  callbacks: { onOpenFile: (path: string) => void; onOpenReview: () => void }
): void {
  const files = collectSessionChangedFiles(turns);
  if (files.length === 0) {
    container.hidden = true;
    return;
  }
  container.hidden = false;
  container.replaceChildren();

  const totalAdd = files.reduce((s, f) => s + f.additions, 0);
  const totalDel = files.reduce((s, f) => s + f.deletions, 0);

  const details = document.createElement("details");
  details.className = "changed-files-details";
  const summary = document.createElement("summary");
  summary.className = "changed-files-summary";

  const titleSpan = document.createElement("span");
  titleSpan.className = "cli-row tabular-nums";
  const countStrong = document.createElement("strong");
  countStrong.textContent = `${files.length} 个变更文件`;
  const addEl = document.createElement("span");
  addEl.className = "diff-stat-add";
  addEl.textContent = `+${totalAdd}`;
  const delEl = document.createElement("span");
  delEl.className = "diff-stat-del";
  delEl.textContent = `-${totalDel}`;
  titleSpan.append(
    createUiIcon("chevronRight", 13, "worklog-chevron"),
    createUiIcon("fileDiff", 13),
    countStrong,
    addEl,
    delEl
  );

  const reviewBtn = document.createElement("button");
  reviewBtn.type = "button";
  reviewBtn.className = "cli-mini-btn bordered";
  setIconAndText(reviewBtn, "gitCompare", "审阅差异", 12);
  reviewBtn.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    callbacks.onOpenReview();
  });

  summary.append(titleSpan, reviewBtn);
  const list = document.createElement("div");
  list.className = "changed-files-list";
  for (const file of files) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "changed-file-row";
    row.addEventListener("click", () => callbacks.onOpenFile(file.path));

    const leftSpan = document.createElement("span");
    leftSpan.className = "cli-row cli-flex-1";
    const pathSpan = document.createElement("span");
    pathSpan.className = "cli-mono changed-file-path";
    pathSpan.textContent = file.path;
    leftSpan.append(createUiIcon("fileCode", 13), pathSpan);

    const statsSpan = document.createElement("span");
    statsSpan.className = "cli-row tabular-nums";
    const fAdd = document.createElement("span");
    fAdd.className = "diff-stat-add";
    fAdd.textContent = `+${file.additions}`;
    const fDel = document.createElement("span");
    fDel.className = "diff-stat-del";
    fDel.textContent = `-${file.deletions}`;
    statsSpan.append(fAdd, fDel);

    row.append(leftSpan, statsSpan);
    list.append(row);
  }
  details.append(summary, list);
  container.append(details);
}

// ============================================================================
// Structured Multi-Question Wizard & Approval Card (ReUI + t3code)
// ============================================================================

export function renderInterventionCard(
  cliSessionId: string,
  intervention: CliPendingIntervention,
  onRespond: (payload: PluginUiJsonObject) => Promise<void>
): HTMLElement {
  const card = document.createElement("div");
  card.className = "cli-intervention-card";
  card.dataset.interventionId = intervention.id;

  const head = document.createElement("div");
  head.className = "cli-row cli-between intervention-head";
  const titleWrap = document.createElement("div");
  titleWrap.className = "cli-row cli-flex-1";
  const badgeIcon = createUiIcon(intervention.kind === "user_input" ? "messageSquare" : "shield", 14, "intervention-icon");
  const title = document.createElement("strong");
  title.textContent = intervention.title;
  titleWrap.append(badgeIcon, title);
  const method = document.createElement("span");
  method.className = "cli-muted cli-mono intervention-method";
  method.textContent = intervention.method;
  head.append(titleWrap, method);
  card.append(head);

  // 1. Multi-question structured wizard
  if (intervention.kind === "user_input" && intervention.questions && intervention.questions.length > 0) {
    const questions = intervention.questions;
    const answers = new Map<string, string | string[]>();
    let step = 0;

    const wizard = document.createElement("div");
    wizard.className = "cli-wizard";
    const stepBar = document.createElement("div");
    stepBar.className = "cli-wizard-steps";
    const qHost = document.createElement("div");
    qHost.className = "cli-wizard-body";
    const navBar = document.createElement("div");
    navBar.className = "cli-row cli-between cli-wizard-nav";

    const submitAll = async () => {
      const payloadAnswers: Record<string, string | string[]> = {};
      for (const q of questions) {
        const val = answers.get(q.question) ?? answers.get(q.id);
        if (val !== undefined) {
          payloadAnswers[q.id] = val;
        }
      }
      await onRespond({
        cliSessionId,
        interventionId: intervention.id,
        answers: payloadAnswers
      });
    };

    const renderStep = () => {
      const q = questions[step]!;
      stepBar.replaceChildren();
      const counter = document.createElement("span");
      counter.className = "cli-pill run";
      counter.textContent = `问题 ${step + 1} / ${questions.length}`;
      stepBar.append(counter);
      if (q.header) {
        const h = document.createElement("span");
        h.className = "cli-pill idle";
        h.textContent = q.header;
        stepBar.append(h);
      }

      qHost.replaceChildren();
      const qText = document.createElement("div");
      qText.className = "cli-wizard-question";
      qText.textContent = q.question;
      qHost.append(qText);

      const currentVal = answers.get(q.id);

      if (q.options && q.options.length > 0) {
        const optList = document.createElement("div");
        optList.className = "cli-wizard-options";
        q.options.forEach((opt, idx) => {
          const val = opt.value ?? opt.label;
          const isSelected = q.multiSelect
            ? Array.isArray(currentVal) && currentVal.includes(val)
            : currentVal === val;

          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = `cli-wizard-option${isSelected ? " selected" : ""}`;
          const topLine = document.createElement("div");
          topLine.className = "cli-row";
          const keyBadge = document.createElement("span");
          keyBadge.className = "cli-kbd";
          keyBadge.textContent = String(idx + 1);
          const lbl = document.createElement("span");
          lbl.className = "cli-wizard-opt-label";
          lbl.textContent = opt.label;
          topLine.append(keyBadge, lbl);
          btn.append(topLine);
          if (opt.description) {
            const desc = document.createElement("div");
            desc.className = "cli-muted cli-wizard-opt-desc";
            desc.textContent = opt.description;
            btn.append(desc);
          }
          btn.addEventListener("click", () => {
            if (q.multiSelect) {
              const arr = Array.isArray(answers.get(q.id)) ? [...(answers.get(q.id) as string[])] : [];
              const pos = arr.indexOf(val);
              if (pos >= 0) arr.splice(pos, 1);
              else arr.push(val);
              answers.set(q.id, arr);
              renderStep();
            } else {
              answers.set(q.id, val);
              renderStep();
              if (step < questions.length - 1) {
                setTimeout(() => {
                  step += 1;
                  renderStep();
                }, 180);
              }
            }
          });
          optList.append(btn);
        });
        qHost.append(optList);
      }

      const customInput = document.createElement("input");
      customInput.type = "text";
      customInput.className = "cotree-input";
      customInput.placeholder = q.options?.length ? "或输入自定义回答…" : "输入回复内容…";
      if (typeof currentVal === "string" && !q.options?.some((o) => (o.value ?? o.label) === currentVal)) {
        customInput.value = currentVal;
      }
      customInput.addEventListener("input", () => {
        if (customInput.value.trim()) answers.set(q.id, customInput.value.trim());
      });
      qHost.append(customInput);

      navBar.replaceChildren();
      const leftNav = document.createElement("div");
      leftNav.className = "cli-row";
      if (step > 0) {
        const prevBtn = document.createElement("button");
        prevBtn.type = "button";
        prevBtn.className = "cotree-button compact-btn";
        prevBtn.textContent = "上一题";
        prevBtn.addEventListener("click", () => {
          step -= 1;
          renderStep();
        });
        leftNav.append(prevBtn);
      }

      const rightNav = document.createElement("div");
      rightNav.className = "cli-row";
      if (step < questions.length - 1) {
        const nextBtn = document.createElement("button");
        nextBtn.type = "button";
        nextBtn.className = "cotree-button compact-btn";
        nextBtn.dataset.variant = "primary";
        nextBtn.textContent = "下一题";
        nextBtn.addEventListener("click", () => {
          step += 1;
          renderStep();
        });
        rightNav.append(nextBtn);
      } else {
        const submitBtn = document.createElement("button");
        submitBtn.type = "button";
        submitBtn.className = "cotree-button compact-btn";
        submitBtn.dataset.variant = "primary";
        setIconAndText(submitBtn, "check", "提交回答", 13);
        submitBtn.addEventListener("click", async () => {
          submitBtn.disabled = true;
          try {
            await submitAll();
          } finally {
            submitBtn.disabled = false;
          }
        });
        rightNav.append(submitBtn);
      }
      navBar.append(leftNav, rightNav);
    };

    renderStep();
    wizard.append(stepBar, qHost, navBar);
    card.append(wizard);
    return card;
  }

  // Details preview
  const commandText = typeof intervention.details.command === "string" ? intervention.details.command : undefined;
  const reasonText = typeof intervention.details.reason === "string" ? intervention.details.reason : undefined;
  if (commandText || reasonText || Object.keys(intervention.details).length > 0) {
    const pre = document.createElement("pre");
    pre.className = "cli-pre compact";
    pre.textContent =
      [commandText ? `$ ${commandText}` : "", reasonText ? `原因: ${reasonText}` : ""]
        .filter(Boolean)
        .join("\n") || JSON.stringify(intervention.details, null, 2);
    card.append(pre);
  }

  // 2. Simple free-text user input
  if (intervention.kind === "user_input") {
    const row = document.createElement("div");
    row.className = "cli-row";
    const input = document.createElement("input");
    input.className = "cotree-input cli-flex-1";
    input.placeholder = "输入回复内容发送给外部 CLI…";
    const sendBtn = document.createElement("button");
    sendBtn.type = "button";
    sendBtn.className = "cotree-button compact-btn";
    sendBtn.dataset.variant = "primary";
    sendBtn.textContent = "发送回复";
    sendBtn.addEventListener("click", async () => {
      if (!input.value.trim()) return;
      sendBtn.disabled = true;
      try {
        await onRespond({ cliSessionId, interventionId: intervention.id, text: input.value.trim() });
      } finally {
        sendBtn.disabled = false;
      }
    });
    row.append(input, sendBtn);
    card.append(row);
    return card;
  }

  // 3. ACP native options
  if (intervention.nativeOptions && intervention.nativeOptions.length > 0) {
    const actions = document.createElement("div");
    actions.className = "cli-row cli-wrap";
    for (const opt of intervention.nativeOptions) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cotree-button compact-btn";
      if (/allow_once/i.test(opt.kind ?? opt.id)) btn.dataset.variant = "primary";
      btn.textContent = opt.label;
      btn.addEventListener("click", async () => {
        for (const el of Array.from(actions.querySelectorAll("button"))) el.disabled = true;
        try {
          await onRespond({
            cliSessionId,
            interventionId: intervention.id,
            optionId: opt.id,
            decision: /reject|deny|cancel/i.test(opt.kind ?? opt.id)
              ? "decline"
              : /always|session/i.test(opt.kind ?? opt.id)
                ? "accept_for_session"
                : "accept"
          });
        } finally {
          for (const el of Array.from(actions.querySelectorAll("button"))) el.disabled = false;
        }
      });
      actions.append(btn);
    }
    card.append(actions);
    return card;
  }

  // 4. Standard Codex / Claude approval buttons
  const actions = document.createElement("div");
  actions.className = "cli-row cli-wrap";
  const choices: Array<{ label: string; decision: "accept" | "accept_for_session" | "decline" | "cancel"; primary?: boolean }> = [
    { label: "允许一次", decision: "accept", primary: true },
    { label: "本会话放行", decision: "accept_for_session" },
    { label: "拒绝", decision: "decline" },
    { label: "取消", decision: "cancel" }
  ];
  for (const choice of choices) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cotree-button compact-btn";
    if (choice.primary) btn.dataset.variant = "primary";
    btn.textContent = choice.label;
    btn.addEventListener("click", async () => {
      for (const el of Array.from(actions.querySelectorAll("button"))) el.disabled = true;
      try {
        await onRespond({
          cliSessionId,
          interventionId: intervention.id,
          decision: choice.decision
        });
      } finally {
        for (const el of Array.from(actions.querySelectorAll("button"))) el.disabled = false;
      }
    });
    actions.append(btn);
  }
  card.append(actions);
  return card;
}
