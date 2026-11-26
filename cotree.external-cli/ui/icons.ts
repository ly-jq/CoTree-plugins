/// <reference lib="dom" />
import type { CliEngine } from "../src/shared.js";

const SVG_NS = "http://www.w3.org/2000/svg";

export type UiIconName =
  | "plus"
  | "refresh"
  | "search"
  | "download"
  | "import"
  | "arrowLeft"
  | "arrowUp"
  | "square"
  | "play"
  | "pause"
  | "paperclip"
  | "shield"
  | "shieldCheck"
  | "sparkles"
  | "zap"
  | "gitBranch"
  | "arrowLeftRight"
  | "gitCompare"
  | "bell"
  | "bellOff"
  | "volume2"
  | "messageSquare"
  | "moreHorizontal"
  | "chevronRight"
  | "chevronDown"
  | "chevronUp"
  | "terminal"
  | "fileCode"
  | "fileDiff"
  | "wrench"
  | "brain"
  | "copy"
  | "check"
  | "x"
  | "rotateCcw"
  | "maximize2"
  | "image"
  | "folder"
  | "folderGit2"
  | "layers"
  | "pencil"
  | "alertTriangle"
  | "clock"
  | "listPlus"
  | "cornerUpRight"
  | "inbox"
  | "compass"
  | "stopCircle"
  | "slash"
  | "atSign"
  | "info"
  | "arrowDown"
  | "trash2";

type SvgPrimitive =
  | { tag: "path"; d: string; fill?: string }
  | { tag: "circle"; cx: string; cy: string; r: string; fill?: string }
  | { tag: "rect"; x: string; y: string; width: string; height: string; rx?: string; fill?: string }
  | { tag: "line"; x1: string; y1: string; x2: string; y2: string }
  | { tag: "polyline"; points: string }
  | { tag: "polygon"; points: string; fill?: string };

const UI_ICONS: Record<UiIconName, SvgPrimitive[]> = {
  plus: [
    { tag: "path", d: "M12 5v14" },
    { tag: "path", d: "M5 12h14" }
  ],
  refresh: [
    { tag: "path", d: "M21 12a9 9 0 1 1-2.64-6.36" },
    { tag: "path", d: "M21 3v6h-6" }
  ],
  search: [
    { tag: "circle", cx: "11", cy: "11", r: "7" },
    { tag: "path", d: "m20 20-3.5-3.5" }
  ],
  download: [
    { tag: "path", d: "M12 3v12" },
    { tag: "path", d: "m7 10 5 5 5-5" },
    { tag: "path", d: "M5 20h14" }
  ],
  import: [
    { tag: "path", d: "M12 3v11" },
    { tag: "path", d: "m8 10 4 4 4-4" },
    { tag: "path", d: "M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" }
  ],
  arrowLeft: [
    { tag: "path", d: "M19 12H5" },
    { tag: "path", d: "m12 19-7-7 7-7" }
  ],
  arrowUp: [
    { tag: "path", d: "M12 19V5" },
    { tag: "path", d: "m5 12 7-7 7 7" }
  ],
  arrowDown: [
    { tag: "path", d: "M12 5v14" },
    { tag: "path", d: "m19 12-7 7-7-7" }
  ],
  trash2: [
    { tag: "path", d: "M3 6h18" },
    { tag: "path", d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" },
    { tag: "path", d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" },
    { tag: "line", x1: "10", y1: "11", x2: "10", y2: "17" },
    { tag: "line", x1: "14", y1: "11", x2: "14", y2: "17" }
  ],
  square: [
    { tag: "rect", x: "6", y: "6", width: "12", height: "12", rx: "2", fill: "currentColor" }
  ],
  play: [
    { tag: "polygon", points: "7 5 19 12 7 19 7 5", fill: "currentColor" }
  ],
  pause: [
    { tag: "rect", x: "6", y: "5", width: "4", height: "14", rx: "1" },
    { tag: "rect", x: "14", y: "5", width: "4", height: "14", rx: "1" }
  ],
  paperclip: [
    { tag: "path", d: "m13.5 6.5-5.6 5.6a3 3 0 1 0 4.24 4.24l6.36-6.36a4.5 4.5 0 0 0-6.36-6.36L5.8 9.96a6 6 0 0 0 8.48 8.48l5.6-5.6" }
  ],
  shield: [
    { tag: "path", d: "M12 3 5 6v6c0 4.5 3 7.7 7 9 4-1.3 7-4.5 7-9V6l-7-3Z" }
  ],
  shieldCheck: [
    { tag: "path", d: "M12 3 5 6v6c0 4.5 3 7.7 7 9 4-1.3 7-4.5 7-9V6l-7-3Z" },
    { tag: "path", d: "m9 12 2 2 4-4" }
  ],
  sparkles: [
    { tag: "path", d: "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" },
    { tag: "path", d: "M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" }
  ],
  zap: [
    { tag: "path", d: "M13 2 4 14h7l-1 8 10-12h-7l0-8Z" }
  ],
  gitBranch: [
    { tag: "circle", cx: "6", cy: "6", r: "2.5" },
    { tag: "circle", cx: "18", cy: "6", r: "2.5" },
    { tag: "circle", cx: "6", cy: "18", r: "2.5" },
    { tag: "path", d: "M6 8.5v7" },
    { tag: "path", d: "M18 8.5c0 4-3 5-6 5H6" }
  ],
  arrowLeftRight: [
    { tag: "path", d: "M8 7 4 11l4 4" },
    { tag: "path", d: "M4 11h16" },
    { tag: "path", d: "m16 17 4-4-4-4" }
  ],
  gitCompare: [
    { tag: "circle", cx: "18", cy: "18", r: "2.5" },
    { tag: "circle", cx: "6", cy: "6", r: "2.5" },
    { tag: "path", d: "M13 6h3a2 2 0 0 1 2 2v7.5" },
    { tag: "path", d: "M11 18H8a2 2 0 0 1-2-2V8.5" }
  ],
  bell: [
    { tag: "path", d: "M6 8a6 6 0 0 1 12 0c0 5 2 7 2 7H4s2-2 2-7" },
    { tag: "path", d: "M10.3 19a2 2 0 0 0 3.4 0" }
  ],
  bellOff: [
    { tag: "path", d: "M8.7 3.7A6 6 0 0 1 18 8c0 2.7.5 4.6 1 5.7" },
    { tag: "path", d: "M17 17H4s2-2 2-7a6 6 0 0 1 .4-2.1" },
    { tag: "path", d: "M10.3 20a2 2 0 0 0 3.4 0" },
    { tag: "path", d: "m3 3 18 18" }
  ],
  volume2: [
    { tag: "path", d: "M11 5 6 9H3v6h3l5 4V5Z" },
    { tag: "path", d: "M15.5 8.5a5 5 0 0 1 0 7" },
    { tag: "path", d: "M18.5 5.5a9 9 0 0 1 0 13" }
  ],
  messageSquare: [
    { tag: "path", d: "M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v10Z" }
  ],
  moreHorizontal: [
    { tag: "circle", cx: "6", cy: "12", r: "1.4", fill: "currentColor" },
    { tag: "circle", cx: "12", cy: "12", r: "1.4", fill: "currentColor" },
    { tag: "circle", cx: "18", cy: "12", r: "1.4", fill: "currentColor" }
  ],
  chevronRight: [
    { tag: "path", d: "m9 18 6-6-6-6" }
  ],
  chevronDown: [
    { tag: "path", d: "m6 9 6 6 6-6" }
  ],
  chevronUp: [
    { tag: "path", d: "m18 15-6-6-6 6" }
  ],
  terminal: [
    { tag: "path", d: "m5 7 5 5-5 5" },
    { tag: "path", d: "M12 17h7" }
  ],
  fileCode: [
    { tag: "path", d: "M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z" },
    { tag: "path", d: "M14 2v5h5" },
    { tag: "path", d: "m10 13-2 2 2 2" },
    { tag: "path", d: "m14 13 2 2-2 2" }
  ],
  fileDiff: [
    { tag: "path", d: "M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z" },
    { tag: "path", d: "M14 2v5h5" },
    { tag: "path", d: "M12 10v4" },
    { tag: "path", d: "M10 12h4" },
    { tag: "path", d: "M10 17h4" }
  ],
  wrench: [
    { tag: "path", d: "M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17a2.1 2.1 0 1 0 3 3l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.3 2.3-2.4-2.4 2.3-2.3Z" }
  ],
  brain: [
    { tag: "path", d: "M9.5 4a3 3 0 0 0-3 3 2.5 2.5 0 0 0-2 4.1A3 3 0 0 0 6 16.5 3 3 0 0 0 11 19V4h-1.5Z" },
    { tag: "path", d: "M14.5 4a3 3 0 0 1 3 3 2.5 2.5 0 0 1 2 4.1A3 3 0 0 1 18 16.5 3 3 0 0 1 13 19V4h1.5Z" }
  ],
  copy: [
    { tag: "rect", x: "9", y: "9", width: "11", height: "11", rx: "2" },
    { tag: "path", d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" }
  ],
  check: [
    { tag: "path", d: "m5 12 5 5L20 7" }
  ],
  x: [
    { tag: "path", d: "M18 6 6 18" },
    { tag: "path", d: "m6 6 12 12" }
  ],
  rotateCcw: [
    { tag: "path", d: "M3 12a9 9 0 1 0 3-6.7L3 8" },
    { tag: "path", d: "M3 3v5h5" }
  ],
  maximize2: [
    { tag: "path", d: "M15 3h6v6" },
    { tag: "path", d: "M9 21H3v-6" },
    { tag: "path", d: "m21 3-7 7" },
    { tag: "path", d: "m3 21 7-7" }
  ],
  image: [
    { tag: "rect", x: "3", y: "4", width: "18", height: "16", rx: "2" },
    { tag: "circle", cx: "8.5", cy: "9.5", r: "1.5" },
    { tag: "path", d: "m21 16-5-5-6 6-3-3-4 4" }
  ],
  folder: [
    { tag: "path", d: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" }
  ],
  folderGit2: [
    { tag: "path", d: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" },
    { tag: "circle", cx: "11", cy: "13", r: "1.5" },
    { tag: "circle", cx: "16", cy: "15", r: "1.5" },
    { tag: "path", d: "M12.5 13.5 14.5 14.5" }
  ],
  layers: [
    { tag: "polygon", points: "12 3 3 8 12 13 21 8 12 3" },
    { tag: "polyline", points: "3 13 12 18 21 13" },
    { tag: "polyline", points: "3 17.5 12 22 21 17.5" }
  ],
  pencil: [
    { tag: "path", d: "M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 3 21l.5-4.5L17 3Z" }
  ],
  alertTriangle: [
    { tag: "path", d: "M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" },
    { tag: "path", d: "M12 9v4" },
    { tag: "circle", cx: "12", cy: "16.5", r: "0.75", fill: "currentColor" }
  ],
  clock: [
    { tag: "circle", cx: "12", cy: "12", r: "9" },
    { tag: "path", d: "M12 7v5l3 2" }
  ],
  listPlus: [
    { tag: "path", d: "M4 6h12" },
    { tag: "path", d: "M4 12h12" },
    { tag: "path", d: "M4 18h8" },
    { tag: "path", d: "M18 15v6" },
    { tag: "path", d: "M15 18h6" }
  ],
  cornerUpRight: [
    { tag: "path", d: "m15 14 5-5-5-5" },
    { tag: "path", d: "M4 20v-7a4 4 0 0 1 4-4h12" }
  ],
  inbox: [
    { tag: "polyline", points: "21 12 16 12 14 15 10 15 8 12 3 12" },
    { tag: "path", d: "M5.45 5.11 3 12v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6l-2.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" }
  ],
  compass: [
    { tag: "circle", cx: "12", cy: "12", r: "9" },
    { tag: "polygon", points: "16 8 13.8 13.8 8 16 10.2 10.2 16 8" }
  ],
  stopCircle: [
    { tag: "circle", cx: "12", cy: "12", r: "9" },
    { tag: "rect", x: "9", y: "9", width: "6", height: "6", rx: "1", fill: "currentColor" }
  ],
  slash: [
    { tag: "path", d: "M16 4 8 20" }
  ],
  atSign: [
    { tag: "circle", cx: "12", cy: "12", r: "4" },
    { tag: "path", d: "M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" }
  ],
  info: [
    { tag: "circle", cx: "12", cy: "12", r: "9" },
    { tag: "path", d: "M12 16v-4" },
    { tag: "circle", cx: "12", cy: "8", r: "0.75", fill: "currentColor" }
  ]
};

export function createUiIcon(name: UiIconName, size = 15, className = ""): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.75");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("ext-icon");
  if (className) {
    for (const c of className.split(/\s+/).filter(Boolean)) svg.classList.add(c);
  }

  for (const prim of UI_ICONS[name]) {
    const node = document.createElementNS(SVG_NS, prim.tag);
    for (const [k, v] of Object.entries(prim)) {
      if (k === "tag" || v === undefined) continue;
      node.setAttribute(k, v);
    }
    if (prim.tag === "rect" || prim.tag === "polygon" || prim.tag === "circle") {
      if ("fill" in prim && prim.fill) {
        node.setAttribute("stroke", "none");
      }
    }
    svg.append(node);
  }
  return svg;
}

/**
 * Provider brand icons modeled cleanly after t3code's Icons.tsx.
 * Rendered exclusively with SVG DOM nodes (no innerHTML).
 */
export function createProviderIcon(engine: CliEngine, size = 16): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("ext-provider-icon", `provider-${engine}`);

  const appendPath = (d: string, fill = "currentColor", stroke?: string, strokeWidth?: string) => {
    const p = document.createElementNS(SVG_NS, "path");
    p.setAttribute("d", d);
    p.setAttribute("fill", fill);
    if (stroke) p.setAttribute("stroke", stroke);
    if (strokeWidth) p.setAttribute("stroke-width", strokeWidth);
    svg.append(p);
  };

  switch (engine) {
    case "codex": {
      // OpenAI swirl mark (t3code Icons.tsx)
      svg.setAttribute("viewBox", "0 0 24 24");
      appendPath(
        "M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365 2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5Z"
      );
      break;
    }
    case "claude": {
      // Claude starburst (t3code Icons.tsx, brand terracotta #D97757)
      svg.setAttribute("viewBox", "0 0 24 24");
      appendPath(
        "M16.71 2.13c-.33-.12-.69.06-.8.39l-2.77 7.84L10.3 3.94a.63.63 0 0 0-1.15.5l2.58 5.95-5.6-3.93a.63.63 0 0 0-.72 1.03l5.3 3.72-7.17-.9a.63.63 0 0 0-.16 1.25l6.89.87-6.37 2.86a.63.63 0 0 0 .51 1.15l6.4-2.88-4.46 5.63a.63.63 0 0 0 .99.78l4.41-5.57-.32 6.82a.63.63 0 0 0 1.26.06l.33-6.86 3.59 5.96a.63.63 0 0 0 1.08-.65l-3.42-5.67 6.38 2.94a.63.63 0 0 0 .53-1.14l-6.4-2.95 6.85-.8a.63.63 0 1 0-.15-1.25l-6.64.78 5.43-3.79a.63.63 0 0 0-.72-1.03l-5.64 3.94 2.75-7.79a.63.63 0 0 0-.39-.8Z"
      );
      break;
    }
    case "gemini": {
      // 4-point Gemini star
      svg.setAttribute("viewBox", "0 0 24 24");
      appendPath(
        "M12 2c.6 5.3 4.7 9.4 10 10-5.3.6-9.4 4.7-10 10-.6-5.3-4.7-9.4-10-10 5.3-.6 9.4-4.7 10-10Z"
      );
      break;
    }
    case "antigravity": {
      // Antigravity rising orbital delta mark
      svg.setAttribute("viewBox", "0 0 24 24");
      appendPath(
        "M12 2.75 4.2 19.6a1.1 1.1 0 0 0 1.48 1.44L12 18.2l6.32 2.84a1.1 1.1 0 0 0 1.48-1.44L12 2.75Zm0 5.05 3.65 8.1-3.65-1.6-3.65 1.6L12 7.8Z"
      );
      break;
    }
    case "kiro": {
      // Kiro minimal ghost-spark mark
      svg.setAttribute("viewBox", "0 0 24 24");
      appendPath(
        "M12 3a7 7 0 0 0-7 7v8.2a.8.8 0 0 0 1.3.62L9 16.6l3 2.4 3-2.4 2.7 2.22a.8.8 0 0 0 1.3-.62V10a7 7 0 0 0-7-7Zm-2.2 8.5a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Zm4.4 0a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Z"
      );
      break;
    }
    case "opencode": {
      svg.setAttribute("viewBox", "0 0 24 24");
      appendPath(
        "M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Zm4.2 4.3a.9.9 0 0 0 0 1.27L10.63 13l-2.43 2.43a.9.9 0 1 0 1.27 1.27l3.07-3.07a.9.9 0 0 0 0-1.27L9.47 9.3a.9.9 0 0 0-1.27 0Zm5.8 6.45a.9.9 0 0 0 0 1.8h3.2a.9.9 0 0 0 0-1.8H14Z"
      );
      break;
    }
    case "qwen": {
      // Qwen geometric 6-point hexagonal crystal mark
      svg.setAttribute("viewBox", "0 0 24 24");
      appendPath(
        "M12 2.2 15.1 6.7l5.4.5-2.3 4.8 2.3 4.8-5.4.5L12 21.8l-3.1-4.5-5.4-.5L5.8 12 3.5 7.2l5.4-.5L12 2.2Zm0 5.3L8.4 9.6v4.8l3.6 2.1 3.6-2.1V9.6L12 7.5Z"
      );
      break;
    }
    case "goose": {
      svg.setAttribute("viewBox", "0 0 24 24");
      appendPath(
        "M19.5 6.5c-2.5 0-4.7 1.4-6.1 3.5l-1.9-1.9c-1.8-1.8-4.7-1.8-6.5 0a.9.9 0 0 0 0 1.27L8.6 13l-4.1 4.1a.9.9 0 0 0 1.27 1.27L10.9 13.3l2.2 2.2c2.1 2.1 5.6 1.5 7-1.1l1.2-2.2c.7-1.3.4-2.9-.7-3.9l1.2-1.2a.8.8 0 0 0-.6-1.4h-1.7Z"
      );
      break;
    }
    case "acp":
    default: {
      // ACP connected nodes mark
      svg.setAttribute("viewBox", "0 0 24 24");
      appendPath(
        "M12 3a3 3 0 1 0 1 5.83V11H8.83a3 3 0 1 0 0 2H11v2.17a3 3 0 1 0 2 0V13h2.17a3 3 0 1 0 0-2H13V8.83A3 3 0 0 0 12 3Z"
      );
      break;
    }
  }
  return svg;
}

/** Helper to set an icon + text label cleanly inside a button or span. */
export function setIconAndText(el: HTMLElement, icon: UiIconName, text: string, size = 14): void {
  el.replaceChildren(createUiIcon(icon, size), document.createTextNode(text));
}

export function setOnlyIcon(el: HTMLElement, icon: UiIconName, size = 15): void {
  el.replaceChildren(createUiIcon(icon, size));
}
