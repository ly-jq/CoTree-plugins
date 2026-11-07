import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { extractPdfText } from "./pdf.js";

export type OfflineOcrLanguage = "eng" | "chi_sim";

export type OfflineOcrPage = {
  page: number;
  text: string;
  confidence: number;
  width: number;
  height: number;
};

export type OfflineOcrResult = {
  text: string;
  totalChars: number;
  truncated: boolean;
  method: "native-pdf-text" | "tesseract-wasm-local";
  languages: OfflineOcrLanguage[];
  pages: OfflineOcrPage[];
  totalPages: number;
  processedPages: number;
};

const supportedImages = new Set([".png", ".jpg", ".jpeg", ".bmp", ".webp", ".tif", ".tiff"]);
const maxPagePixels = 32_000_000;

export async function recognizeDocumentOffline(input: {
  buffer: Buffer;
  extension: string;
  languages: OfflineOcrLanguage[];
  maxPages: number;
  scale: number;
  maxChars: number;
  forceOcr: boolean;
  abortSignal?: AbortSignal;
}): Promise<OfflineOcrResult> {
  const extension = input.extension.toLowerCase();
  const languages = normalizeLanguages(input.languages);
  const maxPages = clampInteger(input.maxPages, 1, 50);
  const scale = clampNumber(input.scale, 0.75, 4);
  const maxChars = clampInteger(input.maxChars, 1, 1_000_000);

  if (extension === ".pdf" && !input.forceOcr) {
    const nativeExtraction = await extractPdfText(input.buffer);
    const nativeText = nativeExtraction.text.trim();
    if (nativeText.length >= 32) {
      return truncateResult({
        text: nativeText,
        method: "native-pdf-text",
        languages,
        pages: nativeExtraction.pages.map((page) => ({ page: page.page, text: page.text, confidence: 100, width: 0, height: 0 })),
        totalPages: nativeExtraction.totalPages,
        processedPages: nativeExtraction.totalPages
      }, maxChars);
    }
  }
  if (extension !== ".pdf" && !supportedImages.has(extension)) {
    throw new Error(`Unsupported OCR input format: ${extension || "file extension missing"}.`);
  }

  const runtime = await loadOcrRuntime();
  assertNotAborted(input.abortSignal);
  const worker = await runtime.Tesseract.createWorker(languages, runtime.Tesseract.OEM.LSTM_ONLY, {
    langPath: resolveLanguageData(languages, runtime.nodeModulesPath),
    cacheMethod: "none",
    logger: () => undefined
  });
  try {
    if (extension !== ".pdf") {
      const recognized = await worker.recognize(input.buffer);
      const text = recognized.data.text.trim();
      return truncateResult({
        text,
        method: "tesseract-wasm-local",
        languages,
        pages: [{ page: 1, text, confidence: recognized.data.confidence, width: 0, height: 0 }],
        totalPages: 1,
        processedPages: 1
      }, maxChars);
    }

    const loadingTask = runtime.getDocument({ data: new Uint8Array(input.buffer), useSystemFonts: false });
    const pdf = await loadingTask.promise;
    const pages: OfflineOcrPage[] = [];
    try {
      const processedPages = Math.min(pdf.numPages, maxPages);
      for (let pageNumber = 1; pageNumber <= processedPages; pageNumber += 1) {
        assertNotAborted(input.abortSignal);
        const page = await pdf.getPage(pageNumber);
        const images = await extractPdfPageImages(page, runtime, scale);
        if (images.length === 0) {
          throw new Error(`PDF page ${pageNumber} has no extractable raster image. This offline OCR path supports scanned/image-based PDF pages.`);
        }
        const recognizedImages = [];
        for (const image of images) {
          recognizedImages.push({ image, recognized: await worker.recognize(image.png) });
        }
        const text = recognizedImages.map((item) => item.recognized.data.text.trim()).filter(Boolean).join("\n");
        const confidence = recognizedImages.reduce((total, item) => total + item.recognized.data.confidence, 0) / recognizedImages.length;
        pages.push({
          page: pageNumber,
          text,
          confidence,
          width: Math.max(...images.map((image) => image.width)),
          height: images.reduce((total, image) => total + image.height, 0)
        });
        page.cleanup();
      }
      return truncateResult({
        text: pages.map((page) => page.text).filter(Boolean).join("\n\n"),
        method: "tesseract-wasm-local",
        languages,
        pages,
        totalPages: pdf.numPages,
        processedPages
      }, maxChars);
    } finally {
      await loadingTask.destroy();
    }
  } finally {
    await worker.terminate();
  }
}

type OcrRuntime = {
  nodeModulesPath?: string;
  getDocument: (input: Record<string, unknown>) => {
    promise: Promise<any>;
    destroy(): Promise<void>;
  };
  OPS: Record<string, number>;
  PNG: {
    sync: {
      write(input: { width: number; height: number; data: Buffer }): Buffer;
    };
  };
  Tesseract: {
    OEM: { LSTM_ONLY: number };
    createWorker(languages: string[], oem: number, options: Record<string, unknown>): Promise<any>;
  };
};

const runtimeCache = new Map<string, Promise<OcrRuntime>>();

async function loadOcrRuntime(): Promise<OcrRuntime> {
  const nodeModulesPath = undefined;
  const cacheKey = "plugin-package";
  const existing = runtimeCache.get(cacheKey);
  if (existing) {
    return existing;
  }
  const loading = (async () => {
    const localRequire = createRequire(import.meta.url);
    const resolvePackage = (name: string): string => nodeModulesPath
      ? path.join(nodeModulesPath, ...name.split("/"))
      : name;
    try {
      const tesseractModule = localRequire(resolvePackage("tesseract.js")) as Record<string, any>;
      const pngModule = localRequire(resolvePackage("pngjs")) as Record<string, any>;
      const domMatrixModule = localRequire(resolvePackage("@thednp/dommatrix")) as Record<string, any> | (new (...args: any[]) => unknown);
      const domMatrix = typeof domMatrixModule === "function" ? domMatrixModule : domMatrixModule.default;
      if (typeof domMatrix !== "function") throw new Error("DOMMatrix polyfill did not export a constructor.");
      (globalThis as unknown as Record<string, unknown>).DOMMatrix ??= domMatrix;
      const pdfEntry = nodeModulesPath
        ? path.join(nodeModulesPath, "pdfjs-dist", "legacy", "build", "pdf.mjs")
        : localRequire.resolve("pdfjs-dist/legacy/build/pdf.mjs");
      const pdf = await import(pathToFileURL(pdfEntry).href) as Record<string, any>;
      return {
        ...(nodeModulesPath ? { nodeModulesPath } : {}),
        getDocument: pdf.getDocument,
        OPS: pdf.OPS,
        PNG: pngModule.PNG,
        Tesseract: tesseractModule.default ?? tesseractModule
      } satisfies OcrRuntime;
    } catch (error) {
      throw new Error(
        `Offline OCR runtime dependencies are missing from the doc-tools plugin package. ${error instanceof Error ? error.message : String(error)}`
      );
    }
  })();
  runtimeCache.set(cacheKey, loading);
  return loading;
}

function resolveLanguageData(languages: OfflineOcrLanguage[], nodeModulesPath?: string): string {
  const packaged = fileURLToPath(new URL("../assets/tesseract/", import.meta.url));
  if (languages.every((language) => existsSync(path.join(packaged, `${language}.traineddata.gz`)))) {
    return packaged;
  }

  const localRequire = createRequire(import.meta.url);
  if (languages.length === 1) {
    const packageName = languages[0] === "eng" ? "@tesseract.js-data/eng" : "@tesseract.js-data/chi_sim";
    const descriptor = localRequire(nodeModulesPath ? path.join(nodeModulesPath, ...packageName.split("/")) : packageName) as { langPath: string };
    return descriptor.langPath;
  }

  // Source-mode development uses tsx and does not run under the release Node
  // permission model. Formal packages always take the read-only asset path above.
  const target = path.join(tmpdir(), `cotree-tesseract-data-v2-${nodeModulesPath ? safeCacheKey(nodeModulesPath) : "development"}`);
  mkdirSync(target, { recursive: true });
  for (const language of languages) {
    const packageName = language === "eng" ? "@tesseract.js-data/eng" : "@tesseract.js-data/chi_sim";
    const descriptor = localRequire(nodeModulesPath ? path.join(nodeModulesPath, ...packageName.split("/")) : packageName) as { langPath: string };
    const filename = `${language}.traineddata.gz`;
    const source = path.join(descriptor.langPath, filename);
    const destination = path.join(target, filename);
    if (!existsSync(destination) || statSync(destination).size !== statSync(source).size) {
      copyFileSync(source, destination);
    }
  }
  return target;
}

async function extractPdfPageImages(page: any, runtime: OcrRuntime, scale: number): Promise<Array<{ png: Buffer; width: number; height: number }>> {
  const operators = await page.getOperatorList() as { fnArray: number[]; argsArray: unknown[][] };
  const candidates: unknown[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < operators.fnArray.length; index += 1) {
    const fn = operators.fnArray[index];
    const args = operators.argsArray[index] ?? [];
    if (fn === runtime.OPS.paintInlineImageXObject) {
      if (args[0]) candidates.push(args[0]);
      continue;
    }
    if (fn !== runtime.OPS.paintImageXObject && fn !== runtime.OPS.paintImageXObjectRepeat) continue;
    const name = typeof args[0] === "string" ? args[0] : undefined;
    if (!name || seen.has(name)) continue;
    seen.add(name);
    candidates.push(await readPdfPageObject(page, name));
  }
  return candidates.flatMap((candidate) => {
    try {
      const image = normalizePdfImage(candidate, scale);
      return [{ ...image, png: runtime.PNG.sync.write(image) }];
    } catch {
      return [];
    }
  });
}

function readPdfPageObject(page: any, name: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (value: unknown) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    try {
      const immediate = page.objs.get(name, finish);
      if (immediate) finish(immediate);
    } catch (error) {
      reject(error);
    }
  });
}

function normalizePdfImage(value: unknown, scale: number): { width: number; height: number; data: Buffer } {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid PDF image object.");
  const image = value as { width?: unknown; height?: unknown; data?: unknown };
  if (!Number.isInteger(image.width) || !Number.isInteger(image.height) || !(image.data instanceof Uint8Array)) {
    throw new Error("PDF image object has no pixel data.");
  }
  const sourceWidth = image.width as number;
  const sourceHeight = image.height as number;
  if (sourceWidth <= 0 || sourceHeight <= 0 || sourceWidth * sourceHeight > maxPagePixels) throw new Error("PDF image exceeds the pixel limit.");
  const source = Buffer.from(image.data.buffer, image.data.byteOffset, image.data.byteLength);
  const rgba = Buffer.alloc(sourceWidth * sourceHeight * 4);
  const pixels = sourceWidth * sourceHeight;
  if (source.length === pixels * 4) {
    source.copy(rgba);
  } else if (source.length === pixels * 3) {
    for (let pixel = 0; pixel < pixels; pixel += 1) {
      rgba[pixel * 4] = source[pixel * 3]!;
      rgba[pixel * 4 + 1] = source[pixel * 3 + 1]!;
      rgba[pixel * 4 + 2] = source[pixel * 3 + 2]!;
      rgba[pixel * 4 + 3] = 255;
    }
  } else if (source.length === pixels) {
    for (let pixel = 0; pixel < pixels; pixel += 1) {
      const channel = source[pixel]!;
      rgba[pixel * 4] = channel;
      rgba[pixel * 4 + 1] = channel;
      rgba[pixel * 4 + 2] = channel;
      rgba[pixel * 4 + 3] = 255;
    }
  } else {
    throw new Error("Unsupported PDF image pixel layout.");
  }
  const safeScale = Math.min(scale, Math.sqrt(maxPagePixels / pixels));
  const width = Math.max(1, Math.round(sourceWidth * safeScale));
  const height = Math.max(1, Math.round(sourceHeight * safeScale));
  if (width === sourceWidth && height === sourceHeight) return { width, height, data: rgba };
  const resized = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(sourceHeight - 1, Math.floor(y * sourceHeight / height));
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(sourceWidth - 1, Math.floor(x * sourceWidth / width));
      rgba.copy(resized, (y * width + x) * 4, (sourceY * sourceWidth + sourceX) * 4, (sourceY * sourceWidth + sourceX) * 4 + 4);
    }
  }
  return { width, height, data: resized };
}

function safeCacheKey(value: string): string {
  let hash = 0;
  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash.toString(16);
}

function normalizeLanguages(languages: OfflineOcrLanguage[]): OfflineOcrLanguage[] {
  const unique = [...new Set(languages.filter((language) => language === "eng" || language === "chi_sim"))];
  return unique.length > 0 ? unique : ["chi_sim", "eng"];
}

function truncateResult(
  result: Omit<OfflineOcrResult, "totalChars" | "truncated">,
  maxChars: number
): OfflineOcrResult {
  const totalChars = result.text.length;
  return {
    ...result,
    text: result.text.slice(0, maxChars),
    totalChars,
    truncated: totalChars > maxChars
  };
}

function assertNotAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw signal.reason instanceof Error ? signal.reason : new Error("OCR was cancelled.");
  }
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(Number.isFinite(value) ? value : min)));
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}
