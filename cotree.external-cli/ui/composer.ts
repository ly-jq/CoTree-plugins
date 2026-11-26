/// <reference lib="dom" />
import type { PluginViewClient } from "../../../packages/plugin-sdk/src/ui.js";
import {
  PLUGIN_SLASH_COMMANDS,
  SERVICE_ID,
  type CliAttachmentRef,
  type CliFollowUpMode,
  type CliQueuedMessage,
  type CliSlashCommandInfo
} from "../src/shared.js";
import { createUiIcon, setIconAndText, setOnlyIcon, type UiIconName } from "./icons.js";

const LARGE_PASTE_BYTES = 32_768;
const MAX_PROMPT_HISTORY = 40;

type PopoverItem = {
  id: string;
  icon: UiIconName;
  label: string;
  detail: string;
  badge?: string;
  onSelect: () => void;
};

export type ComposerCallbacks = {
  getSessionId: () => string | undefined;
  getProviderSlashCommands: () => CliSlashCommandInfo[];
  getFollowUpMode: () => CliFollowUpMode;
  onSend: (payload: {
    message: string;
    attachments: CliAttachmentRef[];
    useOppositeMode?: boolean;
  }) => Promise<void>;
  onPluginSlashCommand: (name: string, args: string) => Promise<boolean>;
  onQueuePromote: (queueId?: string) => Promise<void>;
  onQueueEdit: (queueId: string, newText: string) => Promise<void>;
  onQueueRemove: (queueId: string) => Promise<void>;
  onQueueResume: () => Promise<void>;
  onTogglePlanMode: () => void;
  onCyclePermissionMode: () => void;
  onDraftChanged?: (hasContent: boolean) => void;
  onNotice: (message: string, isError?: boolean) => void;
};

export class ProComposerController {
  private readonly drafts = new Map<string, string>();
  private readonly stashed = new Map<string, string>();
  private readonly promptHistory: string[] = [];
  private historyCursor = -1;
  private attachments: CliAttachmentRef[] = [];
  private workspaceFilesCache: { loadedAt: number; files: string[] } | undefined;
  private popoverItems: PopoverItem[] = [];
  private popoverActiveIndex = 0;
  private popoverMode: "slash" | "file" | null = null;
  private draftSaveTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly view: PluginViewClient,
    private readonly elements: {
      composerRoot: HTMLElement;
      textarea: HTMLTextAreaElement;
      popover: HTMLElement;
      attachmentsBar: HTMLElement;
      stashBar: HTMLElement;
      queueDock: HTMLElement;
      attachBtn: HTMLButtonElement;
      fileInput: HTMLInputElement;
    },
    private readonly callbacks: ComposerCallbacks
  ) {
    this.bindEvents();
  }

  hasSendableContent(): boolean {
    return this.elements.textarea.value.trim().length > 0 || this.attachments.length > 0;
  }

  getAttachments(): CliAttachmentRef[] {
    return [...this.attachments];
  }

  clearAttachments(): void {
    this.attachments = [];
    this.renderAttachments();
    this.callbacks.onDraftChanged?.(this.hasSendableContent());
  }

  autoResizeTextarea(): void {
    const ta = this.elements.textarea;
    ta.style.height = "auto";
    const nextHeight = Math.min(180, Math.max(44, ta.scrollHeight));
    ta.style.height = `${nextHeight}px`;
  }

  recordSentPrompt(text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (this.promptHistory[this.promptHistory.length - 1] !== trimmed) {
      this.promptHistory.push(trimmed);
      if (this.promptHistory.length > MAX_PROMPT_HISTORY) {
        this.promptHistory.shift();
      }
    }
    this.historyCursor = -1;
  }

  saveDraftFor(sessionId: string | undefined): void {
    if (!sessionId) return;
    const val = this.elements.textarea.value;
    this.drafts.set(sessionId, val);
    this.schedulePersistDraft(sessionId, val);
  }

  restoreDraftFor(sessionId: string | undefined): void {
    this.hidePopover();
    this.historyCursor = -1;
    if (!sessionId) {
      this.elements.textarea.value = "";
      this.autoResizeTextarea();
      this.renderStashBar();
      this.callbacks.onDraftChanged?.(this.hasSendableContent());
      return;
    }
    const local = this.drafts.get(sessionId);
    if (local !== undefined) {
      this.elements.textarea.value = local;
      this.autoResizeTextarea();
      this.renderStashBar();
      this.callbacks.onDraftChanged?.(this.hasSendableContent());
      return;
    }
    this.elements.textarea.value = "";
    this.autoResizeTextarea();
    this.renderStashBar();
    this.callbacks.onDraftChanged?.(this.hasSendableContent());
    void this.view.storage
      .get(`draft:${sessionId}`)
      .then((res) => {
        if (this.callbacks.getSessionId() !== sessionId) return;
        const stored =
          typeof res === "string"
            ? res
            : res && typeof res === "object" && !Array.isArray(res) && typeof res.value === "string"
              ? res.value
              : "";
        this.drafts.set(sessionId, stored);
        if (!this.elements.textarea.value && stored) {
          this.elements.textarea.value = stored;
          this.autoResizeTextarea();
          this.callbacks.onDraftChanged?.(this.hasSendableContent());
        }
      })
      .catch(() => undefined);
  }

  clearDraftFor(sessionId: string | undefined): void {
    this.elements.textarea.value = "";
    this.autoResizeTextarea();
    this.callbacks.onDraftChanged?.(this.hasSendableContent());
    if (!sessionId) return;
    this.drafts.set(sessionId, "");
    void this.view.storage.delete(`draft:${sessionId}`).catch(() => undefined);
  }

  renderQueueDock(queue: CliQueuedMessage[], paused: boolean): void {
    const dock = this.elements.queueDock;
    if (queue.length === 0 && !paused) {
      dock.hidden = true;
      dock.replaceChildren();
      return;
    }
    dock.hidden = false;
    dock.replaceChildren();

    const header = document.createElement("div");
    header.className = "cli-row cli-between queue-dock-head";
    const labelWrap = document.createElement("span");
    labelWrap.className = "cli-row queue-dock-title";
    labelWrap.append(
      createUiIcon(paused ? "pause" : "clock", 13),
      document.createTextNode(
        paused
          ? `队列已暂停 (${queue.length} 条待发送) — 确认后点击恢复`
          : `等待队列 (${queue.length} 条 · 本轮结束后按序发送)`
      )
    );
    header.append(labelWrap);

    if (paused && queue.length > 0) {
      const resumeBtn = document.createElement("button");
      resumeBtn.type = "button";
      resumeBtn.className = "cli-mini-btn accent";
      setIconAndText(resumeBtn, "play", "继续队列", 11);
      resumeBtn.addEventListener("click", () => void this.callbacks.onQueueResume());
      header.append(resumeBtn);
    }
    dock.append(header);

    for (const item of queue) {
      const row = document.createElement("div");
      row.className = "queue-item-card";
      const textEl = document.createElement("div");
      textEl.className = "queue-item-text";
      textEl.textContent = item.message;

      const actions = document.createElement("div");
      actions.className = "cli-row queue-item-actions";

      const sendNowBtn = document.createElement("button");
      sendNowBtn.type = "button";
      sendNowBtn.className = "cli-mini-btn";
      sendNowBtn.title = "立即发送 (Ctrl+Shift+Enter)";
      setIconAndText(sendNowBtn, "cornerUpRight", "立即发", 12);
      sendNowBtn.addEventListener("click", () => void this.callbacks.onQueuePromote(item.id));

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "cli-mini-btn";
      editBtn.title = "编辑排队消息";
      editBtn.setAttribute("aria-label", "编辑排队消息");
      setOnlyIcon(editBtn, "pencil", 12);
      editBtn.addEventListener("click", () => {
        const edited = window.prompt("编辑排队中的消息：", item.message);
        if (edited && edited.trim() && edited.trim() !== item.message) {
          void this.callbacks.onQueueEdit(item.id, edited.trim());
        }
      });

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "cli-mini-btn danger-text";
      delBtn.title = "移除";
      delBtn.setAttribute("aria-label", "移除排队消息");
      setOnlyIcon(delBtn, "x", 12);
      delBtn.addEventListener("click", () => void this.callbacks.onQueueRemove(item.id));

      actions.append(sendNowBtn, editBtn, delBtn);
      row.append(textEl, actions);
      dock.append(row);
    }
  }

  async submit(options: { useOppositeMode?: boolean } = {}): Promise<void> {
    const raw = this.elements.textarea.value.trim();
    if (!raw && this.attachments.length === 0) return;

    if (raw.startsWith("/")) {
      const parts = raw.slice(1).trim().split(/\s+/);
      const cmdName = (parts[0] ?? "").toLowerCase();
      const args = parts.slice(1).join(" ");
      if (PLUGIN_SLASH_COMMANDS.some((c) => c.name === cmdName)) {
        const handled = await this.callbacks.onPluginSlashCommand(cmdName, args);
        if (handled) {
          this.clearDraftFor(this.callbacks.getSessionId());
          this.hidePopover();
          return;
        }
      }
    }

    const message = raw || "请查看附带的文件/截图。";
    const staged = this.getAttachments();
    this.recordSentPrompt(message);
    this.clearDraftFor(this.callbacks.getSessionId());
    this.clearAttachments();
    this.hidePopover();
    await this.callbacks.onSend({
      message,
      attachments: staged,
      ...(options.useOppositeMode ? { useOppositeMode: true } : {})
    });
  }

  private schedulePersistDraft(sessionId: string, value: string): void {
    if (this.draftSaveTimer) clearTimeout(this.draftSaveTimer);
    this.draftSaveTimer = setTimeout(() => {
      if (!value) {
        void this.view.storage.delete(`draft:${sessionId}`).catch(() => undefined);
      } else {
        void this.view.storage.set(`draft:${sessionId}`, value.slice(0, 8_000)).catch(() => undefined);
      }
    }, 350);
  }

  private renderStashBar(): void {
    const bar = this.elements.stashBar;
    const sid = this.callbacks.getSessionId();
    const stashedText = sid ? this.stashed.get(sid) : undefined;
    if (!stashedText) {
      bar.hidden = true;
      bar.replaceChildren();
      return;
    }
    bar.hidden = false;
    bar.replaceChildren();

    const label = document.createElement("span");
    label.className = "cli-row cli-muted cli-flex-1";
    const preview = document.createElement("span");
    preview.className = "stash-preview";
    preview.textContent = `已暂存草稿: ${stashedText.slice(0, 80)}${stashedText.length > 80 ? "…" : ""}`;
    label.append(createUiIcon("inbox", 13), preview);

    const actions = document.createElement("div");
    actions.className = "cli-row";
    const popBtn = document.createElement("button");
    popBtn.type = "button";
    popBtn.className = "cli-mini-btn accent";
    popBtn.textContent = "取出编辑";
    popBtn.addEventListener("click", () => {
      if (!sid) return;
      this.elements.textarea.value = stashedText;
      this.autoResizeTextarea();
      this.stashed.delete(sid);
      this.saveDraftFor(sid);
      this.renderStashBar();
      this.callbacks.onDraftChanged?.(this.hasSendableContent());
      this.elements.textarea.focus();
    });
    const dropBtn = document.createElement("button");
    dropBtn.type = "button";
    dropBtn.className = "cli-mini-btn";
    dropBtn.textContent = "丢弃";
    dropBtn.addEventListener("click", () => {
      if (!sid) return;
      this.stashed.delete(sid);
      this.renderStashBar();
    });
    actions.append(popBtn, dropBtn);
    bar.append(label, actions);
  }

  private renderAttachments(): void {
    const bar = this.elements.attachmentsBar;
    if (this.attachments.length === 0) {
      bar.hidden = true;
      bar.replaceChildren();
      return;
    }
    bar.hidden = false;
    bar.replaceChildren();
    for (const att of this.attachments) {
      const chip = document.createElement("div");
      chip.className = "composer-att-chip";
      const kb = Math.max(1, Math.round(att.bytes / 1024));
      const icon = createUiIcon(att.mimeType.startsWith("image/") ? "image" : "paperclip", 13);
      const name = document.createElement("span");
      name.className = "att-name";
      name.textContent = att.fileName;
      const sizeEl = document.createElement("span");
      sizeEl.className = "att-size tabular-nums";
      sizeEl.textContent = `${kb} KB`;
      const rm = document.createElement("button");
      rm.type = "button";
      rm.className = "cli-mini-btn";
      rm.setAttribute("aria-label", `移除附件 ${att.fileName}`);
      setOnlyIcon(rm, "x", 12);
      rm.addEventListener("click", () => {
        this.attachments = this.attachments.filter((a) => a.attachmentId !== att.attachmentId);
        this.renderAttachments();
        this.callbacks.onDraftChanged?.(this.hasSendableContent());
      });
      chip.append(icon, name, sizeEl, rm);
      bar.append(chip);
    }
  }

  private async stageBlobAsAttachment(fileName: string, mimeType: string, blob: Blob): Promise<void> {
    if (blob.size > 6 * 1024 * 1024) {
      this.callbacks.onNotice(`附件 ${fileName} 超过 6 MiB 限制，已跳过。`, true);
      return;
    }
    try {
      const buf = await blob.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      const contentBase64 = btoa(binary);
      const staged = await this.view.files.stageAttachment({
        fileName,
        mimeType: mimeType || "application/octet-stream",
        contentBase64
      });
      this.attachments.push({
        attachmentId: staged.attachmentId,
        path: staged.path,
        fileName: staged.fileName,
        mimeType: staged.mimeType,
        bytes: staged.bytes
      });
      this.renderAttachments();
      this.callbacks.onDraftChanged?.(this.hasSendableContent());
      this.callbacks.onNotice(`已暂存附件: ${staged.fileName}`);
    } catch (error) {
      this.callbacks.onNotice(
        `附件上传失败: ${error instanceof Error ? error.message : String(error)}`,
        true
      );
    }
  }

  private async loadWorkspaceFiles(): Promise<string[]> {
    const now = Date.now();
    if (this.workspaceFilesCache && now - this.workspaceFilesCache.loadedAt < 20_000) {
      return this.workspaceFilesCache.files;
    }
    try {
      const res = await this.view.files.list({ path: ".", recursive: true, maxEntries: 500 });
      const files = res.entries.filter((e) => e.kind === "file").map((e) => e.path);
      this.workspaceFilesCache = { loadedAt: now, files };
      return files;
    } catch {
      try {
        const fallback = (await this.view.services.call(SERVICE_ID, "view.listFiles", {
          cliSessionId: this.callbacks.getSessionId() ?? null,
          limit: 300
        })) as unknown as { files?: string[] };
        const files = Array.isArray(fallback.files) ? fallback.files : [];
        this.workspaceFilesCache = { loadedAt: now, files };
        return files;
      } catch {
        return [];
      }
    }
  }

  private hidePopover(): void {
    this.popoverMode = null;
    this.popoverItems = [];
    this.popoverActiveIndex = 0;
    this.elements.popover.hidden = true;
    this.elements.popover.replaceChildren();
  }

  private renderPopover(): void {
    const pop = this.elements.popover;
    if (this.popoverItems.length === 0) {
      this.hidePopover();
      return;
    }
    pop.hidden = false;
    pop.replaceChildren();

    const header = document.createElement("div");
    header.className = "composer-pop-head";
    header.textContent = this.popoverMode === "slash" ? "快捷命令" : "引用工作区文件";
    pop.append(header);

    this.popoverItems.forEach((item, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `composer-pop-item${idx === this.popoverActiveIndex ? " active" : ""}`;
      const left = document.createElement("div");
      left.className = "cli-row pop-left";
      left.append(createUiIcon(item.icon, 13));
      const lbl = document.createElement("span");
      lbl.className = "cli-mono pop-label";
      lbl.textContent = item.label;
      left.append(lbl);
      if (item.badge) {
        const b = document.createElement("span");
        b.className = `cli-pill ${item.badge === "内置" ? "run" : "idle"}`;
        b.textContent = item.badge;
        left.append(b);
      }
      const det = document.createElement("span");
      det.className = "cli-muted pop-detail";
      det.textContent = item.detail;
      btn.append(left, det);
      btn.addEventListener("mousedown", (ev) => {
        ev.preventDefault();
        item.onSelect();
      });
      pop.append(btn);
    });
  }

  private async updateAutocompletePopover(): Promise<void> {
    const ta = this.elements.textarea;
    const val = ta.value;
    const pos = ta.selectionStart ?? val.length;
    const before = val.slice(0, pos);

    const slashMatch = /^\/([^\s]*)$/.exec(before);
    if (slashMatch) {
      const q = slashMatch[1]!.toLowerCase();
      const allCmds = [...PLUGIN_SLASH_COMMANDS, ...this.callbacks.getProviderSlashCommands()];
      const seen = new Set<string>();
      const matched = allCmds.filter((c) => {
        if (seen.has(c.name)) return false;
        seen.add(c.name);
        return !q || c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
      });
      this.popoverMode = "slash";
      this.popoverActiveIndex = 0;
      this.popoverItems = matched.slice(0, 10).map((cmd) => ({
        id: cmd.name,
        icon: "slash",
        label: `/${cmd.name}`,
        detail: cmd.description,
        badge: cmd.source === "plugin" ? "内置" : "CLI",
        onSelect: () => {
          const needsArg = cmd.name === "handoff" || cmd.name === "mode";
          ta.value = needsArg ? `/${cmd.name} ` : `/${cmd.name}`;
          this.autoResizeTextarea();
          this.hidePopover();
          ta.focus();
          if (!needsArg && cmd.source === "plugin") {
            void this.submit();
          }
        }
      }));
      this.renderPopover();
      return;
    }

    const atMatch = /(?:^|\s)@([^\s@]*)$/.exec(before);
    if (atMatch) {
      const query = atMatch[1]!.toLowerCase();
      const files = await this.loadWorkspaceFiles();
      const filtered = files.filter((f) => !query || f.toLowerCase().includes(query)).slice(0, 12);
      this.popoverMode = "file";
      this.popoverActiveIndex = 0;
      this.popoverItems = filtered.map((filePath) => ({
        id: filePath,
        icon: "fileCode",
        label: `@${filePath}`,
        detail: "文件引用",
        onSelect: () => {
          const tokenLen = atMatch[1]!.length + 1;
          const start = pos - tokenLen;
          const nextVal = `${val.slice(0, start)}@${filePath} ${val.slice(pos)}`;
          ta.value = nextVal;
          const nextCursor = start + filePath.length + 2;
          ta.setSelectionRange(nextCursor, nextCursor);
          this.autoResizeTextarea();
          this.saveDraftFor(this.callbacks.getSessionId());
          this.hidePopover();
          ta.focus();
        }
      }));
      this.renderPopover();
      return;
    }

    if (this.popoverMode) this.hidePopover();
  }

  private bindEvents(): void {
    const { composerRoot, textarea, attachBtn, fileInput } = this.elements;

    textarea.addEventListener("input", () => {
      this.autoResizeTextarea();
      this.saveDraftFor(this.callbacks.getSessionId());
      this.callbacks.onDraftChanged?.(this.hasSendableContent());
      void this.updateAutocompletePopover();
    });

    textarea.addEventListener("keydown", (ev) => {
      if (ev.isComposing) return;

      if (this.popoverMode && this.popoverItems.length > 0) {
        if (ev.key === "ArrowDown") {
          ev.preventDefault();
          this.popoverActiveIndex = (this.popoverActiveIndex + 1) % this.popoverItems.length;
          this.renderPopover();
          return;
        }
        if (ev.key === "ArrowUp") {
          ev.preventDefault();
          this.popoverActiveIndex = (this.popoverActiveIndex - 1 + this.popoverItems.length) % this.popoverItems.length;
          this.renderPopover();
          return;
        }
        if (ev.key === "Enter" || ev.key === "Tab") {
          ev.preventDefault();
          this.popoverItems[this.popoverActiveIndex]?.onSelect();
          return;
        }
        if (ev.key === "Escape") {
          ev.preventDefault();
          this.hidePopover();
          return;
        }
      }

      if (ev.key === "Tab" && ev.shiftKey) {
        ev.preventDefault();
        this.callbacks.onTogglePlanMode();
        return;
      }

      if ((ev.ctrlKey || ev.metaKey) && ev.shiftKey && ev.key.toLowerCase() === "a") {
        ev.preventDefault();
        this.callbacks.onCyclePermissionMode();
        return;
      }

      if ((ev.ctrlKey || ev.metaKey) && !ev.shiftKey && ev.key.toLowerCase() === "s") {
        const sid = this.callbacks.getSessionId();
        if (sid && textarea.value.trim()) {
          ev.preventDefault();
          this.stashed.set(sid, textarea.value);
          this.clearDraftFor(sid);
          this.renderStashBar();
          this.callbacks.onNotice("草稿已暂存（按「取出编辑」恢复）");
        }
        return;
      }

      if ((ev.ctrlKey || ev.metaKey) && ev.shiftKey && ev.key === "Enter") {
        ev.preventDefault();
        void this.callbacks.onQueuePromote();
        return;
      }

      if ((ev.ctrlKey || ev.metaKey) && !ev.shiftKey && ev.key === "Enter") {
        ev.preventDefault();
        void this.submit({ useOppositeMode: true });
        return;
      }

      if (ev.key === "Enter" && !ev.shiftKey && !ev.altKey) {
        ev.preventDefault();
        void this.submit({ useOppositeMode: false });
        return;
      }

      if (ev.key === "ArrowUp" && this.promptHistory.length > 0 && textarea.selectionStart === 0 && !textarea.value.includes("\n")) {
        if (this.historyCursor === -1) this.historyCursor = this.promptHistory.length - 1;
        else if (this.historyCursor > 0) this.historyCursor -= 1;
        textarea.value = this.promptHistory[this.historyCursor] ?? "";
        this.autoResizeTextarea();
        this.callbacks.onDraftChanged?.(this.hasSendableContent());
        ev.preventDefault();
        return;
      }
      if (ev.key === "ArrowDown" && this.historyCursor >= 0 && textarea.selectionStart === textarea.value.length) {
        this.historyCursor += 1;
        if (this.historyCursor >= this.promptHistory.length) {
          this.historyCursor = -1;
          textarea.value = "";
        } else {
          textarea.value = this.promptHistory[this.historyCursor] ?? "";
        }
        this.autoResizeTextarea();
        this.callbacks.onDraftChanged?.(this.hasSendableContent());
        ev.preventDefault();
      }
    });

    textarea.addEventListener("paste", (ev) => {
      const dt = ev.clipboardData;
      if (!dt) return;
      const items = Array.from(dt.items);
      const fileItems = items.filter((item) => item.kind === "file");
      if (fileItems.length > 0) {
        ev.preventDefault();
        for (const item of fileItems) {
          const file = item.getAsFile();
          if (!file) continue;
          const ext = file.type.split("/")[1] || "bin";
          const name = file.name && file.name !== "image.png" ? file.name : `clipboard-${Date.now()}.${ext}`;
          void this.stageBlobAsAttachment(name, file.type, file);
        }
        return;
      }

      const text = dt.getData("text/plain");
      if (text && new Blob([text]).size >= LARGE_PASTE_BYTES) {
        ev.preventDefault();
        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        void this.stageBlobAsAttachment(`pasted-${Date.now()}.txt`, "text/plain", blob);
      }
    });

    composerRoot.addEventListener("dragover", (ev) => {
      ev.preventDefault();
      composerRoot.classList.add("drag-over");
    });
    composerRoot.addEventListener("dragleave", () => {
      composerRoot.classList.remove("drag-over");
    });
    composerRoot.addEventListener("drop", (ev) => {
      ev.preventDefault();
      composerRoot.classList.remove("drag-over");
      const files = ev.dataTransfer?.files;
      if (!files || files.length === 0) return;
      for (const file of Array.from(files)) {
        void this.stageBlobAsAttachment(file.name, file.type || "application/octet-stream", file);
      }
    });

    attachBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
      const files = fileInput.files;
      if (!files) return;
      for (const file of Array.from(files)) {
        void this.stageBlobAsAttachment(file.name, file.type || "application/octet-stream", file);
      }
      fileInput.value = "";
    });
  }
}
