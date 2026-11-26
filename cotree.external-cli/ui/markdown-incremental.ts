/// <reference lib="dom" />
import { createUiIcon, setIconAndText } from "./icons.js";

const MAX_CACHE_CHARS = 500_000;
const blockCache = new Map<string, HTMLElement>();
let cachedChars = 0;

function cacheSet(key: string, node: HTMLElement): void {
  if (blockCache.has(key)) {
    cachedChars -= key.length;
    blockCache.delete(key);
  }
  blockCache.set(key, node);
  cachedChars += key.length;
  while (cachedChars > MAX_CACHE_CHARS && blockCache.size > 1) {
    const oldest = blockCache.keys().next().value;
    if (oldest === undefined) break;
    cachedChars -= oldest.length;
    blockCache.delete(oldest);
  }
}

/**
 * Splits Markdown into top-level blocks outside fenced code blocks so completed blocks
 * stay frozen in the DOM while only the active trailing block re-renders on stream deltas.
 */
export function splitMarkdownBlocks(source: string): string[] {
  const normalized = source.replace(/\r\n/g, "\n");
  if (!normalized.trim()) return [];
  const lines = normalized.split("\n");
  const blocks: string[] = [];
  let current: string[] = [];
  let inFence = false;
  let fenceChar = "";

  const flush = () => {
    const text = current.join("\n").trimEnd();
    if (text.trim().length > 0) blocks.push(text);
    current = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const fenceMatch = /^(`{3,}|~{3,})/.exec(trimmed);
    if (fenceMatch) {
      const marker = fenceMatch[1]![0]!;
      if (!inFence) {
        if (current.length > 0) flush();
        inFence = true;
        fenceChar = marker;
        current.push(line);
        continue;
      }
      if (marker === fenceChar && trimmed.length >= 3) {
        current.push(line);
        inFence = false;
        fenceChar = "";
        flush();
        continue;
      }
    }

    if (inFence) {
      current.push(line);
      continue;
    }

    if (!trimmed) {
      if (current.length > 0) flush();
      continue;
    }

    if (/^#{1,6}\s+/.test(trimmed)) {
      if (current.length > 0) flush();
      current.push(line);
      flush();
      continue;
    }

    current.push(line);
  }

  if (current.length > 0) flush();
  return blocks;
}

function looksLikeLocalFilePath(raw: string): { path: string; line?: number } | undefined {
  const trimmed = raw.trim().replace(/^file:\/\//i, "").replace(/^\/([A-Za-z]:\/)/, "$1");
  if (!trimmed || /^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed) || trimmed.startsWith("#")) {
    return undefined;
  }
  const lineMatch = /^(.*?)(?::(\d+)(?::\d+)?|#L(\d+)(?:-L\d+)?)$/.exec(trimmed);
  const candidate = (lineMatch ? lineMatch[1]! : trimmed).trim();
  const lineNum = lineMatch ? Number.parseInt(lineMatch[2] ?? lineMatch[3] ?? "", 10) : undefined;

  const isWinAbs = /^[A-Za-z]:[\\/][^<>:"|?*\n]+$/.test(candidate);
  const isUnixAbs = /^\/(?:Users|home|tmp|var|opt|etc|mnt|workspace|app|srv)\/[^\s<>:"|?*\n]+$/.test(candidate);
  const isRelFile =
    /^(?:\.\.?[\\/])?(?:[\w.@+-]+[\\/])+[\w.@+-]+\.[A-Za-z0-9]{1,10}$/.test(candidate) ||
    /^(?:README|AGENTS|DESIGN|PLANS|package|tsconfig|Cargo|Makefile|Dockerfile)\.[A-Za-z0-9]+$/.test(candidate);

  if (!isWinAbs && !isUnixAbs && !isRelFile) return undefined;
  return {
    path: candidate,
    ...(lineNum && Number.isFinite(lineNum) ? { line: lineNum } : {})
  };
}

function createLocalFileLink(
  label: string,
  filePath: string,
  line?: number,
  iconName: "fileCode" | "image" = "fileCode"
): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "cli-local-link";
  btn.dataset.localPath = filePath;
  if (line !== undefined) btn.dataset.localLine = String(line);
  btn.title = `在 CoTree 文件面板打开: ${filePath}${line ? `:${line}` : ""}`;
  btn.append(createUiIcon(iconName, 12), document.createTextNode(label));
  return btn;
}

function appendInlineFormatted(target: HTMLElement, text: string): void {
  const pattern = /(!\[([^\]]*)\]\(([^)\s]+)\)|`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*|\[([^\]]+)\]\(([^)\s]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      target.append(document.createTextNode(text.slice(lastIndex, match.index)));
    }
    const token = match[0];
    if (token.startsWith("![") && match[3]) {
      const alt = match[2] || "图像";
      const src = match[3];
      const local = looksLikeLocalFilePath(src);
      if (local) {
        const chip = document.createElement("span");
        chip.className = "cli-inline-img-ref";
        chip.append(createLocalFileLink(alt, local.path, undefined, "image"));
        target.append(chip);
      } else {
        target.append(document.createTextNode(token));
      }
    } else if (token.startsWith("`") && token.endsWith("`")) {
      const inner = token.slice(1, -1);
      const local = looksLikeLocalFilePath(inner);
      if (local) {
        target.append(createLocalFileLink(inner, local.path, local.line));
      } else {
        const code = document.createElement("code");
        code.className = "cli-inline-code";
        code.textContent = inner;
        target.append(code);
      }
    } else if (token.startsWith("**") && token.endsWith("**")) {
      const strong = document.createElement("strong");
      strong.textContent = token.slice(2, -2);
      target.append(strong);
    } else if (token.startsWith("*") && token.endsWith("*") && token.length > 2) {
      const em = document.createElement("em");
      em.textContent = token.slice(1, -1);
      target.append(em);
    } else if (match[4] && match[5]) {
      const label = match[4];
      const href = match[5];
      if (/^https?:\/\//i.test(href)) {
        const link = document.createElement("a");
        link.href = href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = label;
        target.append(link);
      } else {
        const local = looksLikeLocalFilePath(href);
        if (local) {
          target.append(createLocalFileLink(label, local.path, local.line));
        } else {
          target.append(document.createTextNode(label));
        }
      }
    } else {
      target.append(document.createTextNode(token));
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) {
    target.append(document.createTextNode(text.slice(lastIndex)));
  }
}

function renderSingleMarkdownBlock(blockText: string): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "cli-md-block";
  const lines = blockText.split("\n");
  const firstLine = lines[0]?.trim() ?? "";

  // Fenced code block
  const fenceStart = /^(`{3,}|~{3,})(.*)$/.exec(firstLine);
  if (fenceStart) {
    const lang = fenceStart[2]?.trim() ?? "";
    const lastTrim = lines[lines.length - 1]?.trim() ?? "";
    const hasClosingFence = lines.length > 1 && lastTrim.startsWith(fenceStart[1]![0]!.repeat(3));
    const codeLines = lines.slice(1, hasClosingFence ? lines.length - 1 : lines.length);
    const codeText = codeLines.join("\n");

    const box = document.createElement("div");
    box.className = "cli-code-block";
    const bar = document.createElement("div");
    bar.className = "cli-code-bar";
    const langSpan = document.createElement("span");
    langSpan.className = "cli-code-lang cli-mono";
    langSpan.textContent = lang || "code";
    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "cli-mini-btn";
    copyBtn.dataset.copyCode = "1";
    copyBtn.setAttribute("aria-label", "复制代码");
    setIconAndText(copyBtn, "copy", "复制", 12);
    bar.append(langSpan, copyBtn);

    const pre = document.createElement("pre");
    const code = document.createElement("code");
    code.textContent = codeText;
    pre.append(code);
    box.append(bar, pre);
    wrapper.append(box);
    return wrapper;
  }

  // Heading
  const heading = /^(#{1,6})\s+(.+)$/.exec(firstLine);
  if (heading && lines.length === 1) {
    const level = Math.min(5, heading[1]!.length + 1);
    const h = document.createElement(`h${level}`);
    h.className = `cli-md-h cli-md-h${level}`;
    appendInlineFormatted(h, heading[2]!);
    wrapper.append(h);
    return wrapper;
  }

  // Horizontal rule
  if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(firstLine) && lines.length === 1) {
    const hr = document.createElement("hr");
    hr.className = "cli-md-hr";
    wrapper.append(hr);
    return wrapper;
  }

  // Blockquote
  if (lines.every((l) => l.trim().startsWith(">"))) {
    const bq = document.createElement("blockquote");
    bq.className = "cli-md-quote";
    const inner = lines.map((l) => l.replace(/^\s*>\s?/, "")).join("\n");
    appendInlineFormatted(bq, inner);
    wrapper.append(bq);
    return wrapper;
  }

  // Unordered list
  if (lines.every((l) => /^\s*[-*+]\s+/.test(l))) {
    const ul = document.createElement("ul");
    ul.className = "cli-md-list";
    for (const line of lines) {
      const li = document.createElement("li");
      const taskMatch = /^\s*[-*+]\s+\[([ xX~])\]\s+(.+)$/.exec(line);
      if (taskMatch) {
        li.className = "cli-task-item";
        const state = taskMatch[1] === " " ? "todo" : taskMatch[1] === "~" ? "wip" : "done";
        const chk = document.createElement("span");
        chk.className = `cli-task-box ${state}`;
        chk.setAttribute("aria-hidden", "true");
        if (state === "done") chk.append(createUiIcon("check", 10));
        li.append(chk);
        const span = document.createElement("span");
        appendInlineFormatted(span, taskMatch[2]!);
        li.append(span);
      } else {
        appendInlineFormatted(li, line.replace(/^\s*[-*+]\s+/, ""));
      }
      ul.append(li);
    }
    wrapper.append(ul);
    return wrapper;
  }

  // Ordered list
  if (lines.every((l) => /^\s*\d+\.\s+/.test(l))) {
    const ol = document.createElement("ol");
    ol.className = "cli-md-list";
    for (const line of lines) {
      const li = document.createElement("li");
      appendInlineFormatted(li, line.replace(/^\s*\d+\.\s+/, ""));
      ol.append(li);
    }
    wrapper.append(ol);
    return wrapper;
  }

  // Markdown table
  if (lines.length >= 2 && lines[0]!.includes("|") && /^\s*\|?[\s:-]+\|[\s|:-]*$/.test(lines[1]!)) {
    const parseRow = (row: string) =>
      row
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((c) => c.trim());
    const tableWrap = document.createElement("div");
    tableWrap.className = "cli-md-table-wrap";
    const table = document.createElement("table");
    table.className = "cli-md-table";
    const thead = document.createElement("thead");
    const htr = document.createElement("tr");
    for (const cell of parseRow(lines[0]!)) {
      const th = document.createElement("th");
      appendInlineFormatted(th, cell);
      htr.append(th);
    }
    thead.append(htr);
    const tbody = document.createElement("tbody");
    for (const rowLine of lines.slice(2)) {
      if (!rowLine.includes("|")) continue;
      const tr = document.createElement("tr");
      for (const cell of parseRow(rowLine)) {
        const td = document.createElement("td");
        appendInlineFormatted(td, cell);
        tr.append(td);
      }
      tbody.append(tr);
    }
    table.append(thead, tbody);
    tableWrap.append(table);
    wrapper.append(tableWrap);
    return wrapper;
  }

  // Paragraph
  const p = document.createElement("p");
  p.className = "cli-md-p";
  lines.forEach((line, idx) => {
    if (idx > 0) p.append(document.createElement("br"));
    appendInlineFormatted(p, line);
  });
  wrapper.append(p);
  return wrapper;
}

function cloneCachedOrRender(blockText: string): HTMLElement {
  const cached = blockCache.get(blockText);
  if (cached !== undefined) {
    return cached.cloneNode(true) as HTMLElement;
  }
  const el = renderSingleMarkdownBlock(blockText);
  if (blockText.length <= 24_000) {
    cacheSet(blockText, el.cloneNode(true) as HTMLElement);
  }
  return el;
}

/**
 * Incremental DOM Markdown controller: freezes completed prefix blocks and only re-renders
 * the active tail block when streaming deltas arrive (zero innerHTML, zero replaceChildren flicker).
 */
export class IncrementalMarkdownView {
  readonly root: HTMLElement;
  private source = "";
  private rendered: Array<{ raw: string; node: HTMLElement }> = [];

  constructor(initialText = "") {
    this.root = document.createElement("div");
    this.root.className = "cli-md";
    this.root.addEventListener("click", (ev) => {
      const target = ev.target as HTMLElement | null;
      const copyBtn = target?.closest<HTMLButtonElement>("button[data-copy-code]");
      if (!copyBtn) return;
      const codeEl = copyBtn.closest(".cli-code-block")?.querySelector("code");
      const text = codeEl?.textContent ?? "";
      void navigator.clipboard?.writeText(text).then(() => {
        setIconAndText(copyBtn, "check", "已复制", 12);
        setTimeout(() => {
          setIconAndText(copyBtn, "copy", "复制", 12);
        }, 1200);
      });
    });
    if (initialText) this.setText(initialText);
  }

  getText(): string {
    return this.source;
  }

  appendDelta(delta: string): void {
    if (!delta) return;
    this.setText(this.source + delta);
  }

  setText(nextText: string): void {
    if (nextText === this.source && this.rendered.length > 0) return;
    this.source = nextText;
    const nextBlocks = splitMarkdownBlocks(nextText);

    let common = 0;
    const minLen = Math.min(this.rendered.length, nextBlocks.length);
    while (common < minLen && this.rendered[common]!.raw === nextBlocks[common]) {
      common += 1;
    }

    while (this.rendered.length > common) {
      const removed = this.rendered.pop()!;
      removed.node.remove();
    }

    for (let i = common; i < nextBlocks.length; i += 1) {
      const raw = nextBlocks[i]!;
      const isTrailingActive = i === nextBlocks.length - 1;
      const node = isTrailingActive ? renderSingleMarkdownBlock(raw) : cloneCachedOrRender(raw);
      this.root.append(node);
      this.rendered.push({ raw, node });
    }
  }
}

export function renderSafeMarkdown(text: string): HTMLElement {
  return new IncrementalMarkdownView(text).root;
}
