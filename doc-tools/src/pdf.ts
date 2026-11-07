import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { inflateSync } from "node:zlib";

export type PdfTextPage = {
  page: number;
  text: string;
};

export type PdfTextExtraction = {
  text: string;
  pages: PdfTextPage[];
  totalPages: number;
  method: "pdfjs-text" | "pdf-stream-fallback";
};

/** Extract embedded PDF text with PDF.js, retaining a conservative fallback for malformed legacy PDFs. */
export async function extractPdfText(buffer: Buffer): Promise<PdfTextExtraction> {
  try {
    return await extractWithPdfJs(buffer);
  } catch (error) {
    const text = extractPdfStreamStrings(buffer);
    if (text) {
      return {
        text,
        pages: [{ page: 1, text }],
        totalPages: 1,
        method: "pdf-stream-fallback"
      };
    }
    throw new Error(`PDF text extraction failed. ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function extractWithPdfJs(buffer: Buffer): Promise<PdfTextExtraction> {
  const localRequire = createRequire(import.meta.url);
  const domMatrixModule = localRequire("@thednp/dommatrix") as Record<string, unknown> | (new (...args: any[]) => unknown);
  const domMatrix = typeof domMatrixModule === "function" ? domMatrixModule : domMatrixModule.default;
  if (typeof domMatrix !== "function") throw new Error("DOMMatrix polyfill did not export a constructor.");
  (globalThis as unknown as Record<string, unknown>).DOMMatrix ??= domMatrix;
  const entry = localRequire.resolve("pdfjs-dist/legacy/build/pdf.mjs");
  const runtime = await import(pathToFileURL(entry).href) as {
    getDocument(input: Record<string, unknown>): {
      promise: Promise<{
        numPages: number;
        getPage(page: number): Promise<{
          getTextContent(): Promise<{ items: unknown[] }>;
          cleanup(): void;
        }>;
      }>;
      destroy(): Promise<void>;
    };
  };
  const loadingTask = runtime.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: false,
    disableFontFace: true,
    isEvalSupported: false
  });
  const pdf = await loadingTask.promise;
  const pages: PdfTextPage[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      try {
        const content = await page.getTextContent();
        pages.push({ page: pageNumber, text: textContentToString(content.items) });
      } finally {
        page.cleanup();
      }
    }
  } finally {
    await loadingTask.destroy();
  }
  return {
    text: pages.map((page) => page.text).filter(Boolean).join("\n\n"),
    pages,
    totalPages: pdf.numPages,
    method: "pdfjs-text"
  };
}

function textContentToString(items: unknown[]): string {
  let output = "";
  for (const item of items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as { str?: unknown; hasEOL?: unknown };
    if (typeof record.str !== "string") continue;
    output += record.str;
    output += record.hasEOL === true ? "\n" : " ";
  }
  return output
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractPdfStreamStrings(buffer: Buffer): string {
  const parts: string[] = [];
  const raw = buffer.toString("latin1");
  for (const stream of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    const data = Buffer.from(stream[1] ?? "", "latin1");
    const decoded = tryInflate(data)?.toString("latin1") ?? data.toString("latin1");
    parts.push(...extractPdfStrings(decoded));
  }
  parts.push(...extractPdfStrings(raw));
  return Array.from(new Set(parts.map((part) => part.trim()).filter(Boolean))).join("\n");
}

function tryInflate(data: Buffer): Buffer | undefined {
  try {
    return inflateSync(data, { maxOutputLength: 32 * 1024 * 1024 });
  } catch {
    return undefined;
  }
}

function extractPdfStrings(value: string): string[] {
  const strings: string[] = [];
  for (const match of value.matchAll(/\((?:\\.|[^\\)]){1,5000}\)\s*Tj/g)) {
    strings.push(pdfStringUnescape((match[0].match(/\(([\s\S]*)\)\s*Tj/)?.[1]) ?? ""));
  }
  for (const arrayMatch of value.matchAll(/\[((?:\s*\((?:\\.|[^\\)]){1,5000}\)\s*)+)\]\s*TJ/g)) {
    let joined = "";
    for (const item of (arrayMatch[1] ?? "").matchAll(/\(([\s\S]*?)\)/g)) {
      joined += pdfStringUnescape(item[1] ?? "");
    }
    strings.push(joined);
  }
  return strings;
}

function pdfStringUnescape(value: string): string {
  return value.replace(/\\([nrtbf()\\])/g, (_match, char: string) => {
    if (char === "n") return "\n";
    if (char === "r") return "\r";
    if (char === "t") return "\t";
    if (char === "b") return "\b";
    if (char === "f") return "\f";
    return char;
  });
}
