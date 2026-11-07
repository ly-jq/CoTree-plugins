import path from "node:path";
import {
  definePlugin,
  type PluginFilesClient,
  type PluginJsonValue,
  type PluginToolContext,
  type PluginToolResult
} from "@cotree/plugin-sdk";
import { createZip, openZip } from "./zip.js";
import {
  countOfficeTextNodeOccurrences,
  docxAmbiguousSearchError,
  extractDocxText,
  extractOfficeText,
  inspectOfficeDocument,
  isEditableOfficeXmlPart,
  officeFormatFromPath,
  officeTextHasRedBoldRun,
  readDocxDocumentXml,
  replaceDocxTextNodes,
  replaceOfficeTextNodes,
  type OfficeTextReplacement
} from "./office.js";
import { extractPdfText } from "./pdf.js";
import { recognizeDocumentOffline } from "./ocr.js";

const MAX_FILE_BYTES = 32 * 1024 * 1024;
const MAX_ARCHIVE_CREATE_INPUT_BYTES = 24 * 1024 * 1024;
const MAX_ARCHIVE_EXTRACT_BYTES = 128 * 1024 * 1024;

export default definePlugin({
  tools: {
    async "ArchiveList"(input, context) {
      const args = asRecord(input);
      return safeRun("ARCHIVE_LIST_FAILED", async () => {
        const sourcePath = requiredString(args, "path");
        const zip = openZip(await readFile(context.files, sourcePath));
        const maxEntries = integerValue(args.maxEntries, 1, 20_000) ?? 500;
        const entries = zip.entries.slice(0, maxEntries).map((entry) => ({
          name: entry.name,
          compressedSize: entry.compressedSize,
          uncompressedSize: entry.uncompressedSize,
          compressionMethod: entry.compressionMethod,
          isDirectory: entry.isDirectory
        }));
        return ok({ path: sourcePath, entries, totalEntries: zip.entries.length, truncated: entries.length < zip.entries.length }, `Listed ${entries.length}/${zip.entries.length} archive entries.`);
      });
    },

    async "ArchiveExtract"(input, context) {
      const args = asRecord(input);
      return safeRun("ARCHIVE_EXTRACT_FAILED", async () => {
        const sourcePath = requiredString(args, "path");
        const destination = normalizeRelative(requiredString(args, "destination"));
        const zip = openZip(await readFile(context.files, sourcePath));
        const requestedEntries = stringArray(args.entries);
        const selected = new Set(requestedEntries ?? zip.entries.map((entry) => entry.name));
        if (requestedEntries) {
          const available = new Set(zip.entries.map((entry) => entry.name));
          const missing = requestedEntries.filter((entry) => !available.has(entry));
          if (missing.length > 0) throw new Error(`Requested archive entries were not found: ${missing.join(", ")}.`);
        }
        const overwrite = args.overwrite === true;
        const prepared: Array<{ entry: string; path: string; content: Buffer }> = [];
        let totalBytes = 0;
        const outputPaths = new Set<string>();
        for (const entry of zip.entries) {
          if (!selected.has(entry.name) || entry.isDirectory) continue;
          const safeName = safeArchiveEntryPath(entry.name);
          if (!safeName) throw new Error(`Unsafe archive entry name: ${entry.name}.`);
          const outputPath = path.posix.join(destination, safeName);
          const outputIdentity = outputPath.toLowerCase();
          if (outputPaths.has(outputIdentity)) throw new Error(`Archive entries collide at output path ${outputPath}.`);
          outputPaths.add(outputIdentity);
          const content = zip.readEntry(entry.name) ?? Buffer.alloc(0);
          totalBytes += content.length;
          if (totalBytes > MAX_ARCHIVE_EXTRACT_BYTES) throw new Error(`Archive extraction exceeds the ${MAX_ARCHIVE_EXTRACT_BYTES} byte limit.`);
          prepared.push({ entry: entry.name, path: outputPath, content });
        }
        const extracted: PluginJsonValue[] = [];
        for (const file of prepared) {
          await writeFile(context.files, file.path, file.content, { overwrite });
          extracted.push({ entry: file.entry, path: file.path, bytes: file.content.length });
        }
        return ok({ archive: sourcePath, destination, extracted, totalBytes }, `Extracted ${extracted.length} archive entries (${totalBytes} bytes).`);
      });
    },

    async "ArchiveCreate"(input, context) {
      const args = asRecord(input);
      return safeRun("ARCHIVE_CREATE_FAILED", async () => {
        const outputPath = requiredString(args, "output");
        if (!Array.isArray(args.files) || args.files.length === 0) throw new Error("files must contain at least one entry.");
        const files = [];
        let totalInputBytes = 0;
        for (const item of args.files) {
          const file = asRecord(item);
          const sourcePath = requiredString(file, "path");
          const entryName = safeArchiveEntryPath(stringValue(file.entryName) ?? path.basename(sourcePath));
          if (!entryName) throw new Error(`Unsafe archive entry name for ${sourcePath}.`);
          const data = await readFile(context.files, sourcePath);
          totalInputBytes += data.length;
          if (totalInputBytes > MAX_ARCHIVE_CREATE_INPUT_BYTES) throw new Error(`Archive inputs exceed the ${MAX_ARCHIVE_CREATE_INPUT_BYTES} byte limit.`);
          files.push({ name: entryName, data });
        }
        const archive = createZip(files);
        await writeFile(context.files, outputPath, archive, { overwrite: args.overwrite === true });
        return ok({ output: outputPath, entries: files.map((file) => file.name), bytes: archive.length }, `Created archive ${outputPath}.`);
      });
    },

    async "OfficeDocxRead"(input, context) {
      const args = asRecord(input);
      return safeRun("DOCX_READ_FAILED", async () => {
        const sourcePath = requiredString(args, "path");
        const documentXml = readDocxDocumentXml(await readFile(context.files, sourcePath));
        if (!documentXml.ok) return fail(documentXml.code, documentXml.message);
        const text = extractDocxText(documentXml.xml);
        const maxChars = integerValue(args.maxChars, 1, 1_000_000) ?? 100_000;
        return ok({
          path: sourcePath,
          text: text.slice(0, maxChars),
          totalChars: text.length,
          truncated: text.length > maxChars,
          ...(args.includeXml === true ? { documentXml: documentXml.xml.slice(0, maxChars) } : {})
        }, `Read DOCX text from ${sourcePath}.`);
      });
    },

    async "OfficeDocxEdit"(input, context) {
      const args = asRecord(input);
      return safeRun("DOCX_EDIT_FAILED", async () => {
        const sourcePath = requiredString(args, "path");
        const original = await readFile(context.files, sourcePath);
        const zip = openZip(original);
        const documentXml = zip.readEntry("word/document.xml");
        if (!documentXml) return fail("DOCX_DOCUMENT_XML_NOT_FOUND", "DOCX package does not contain word/document.xml.");
        let xml = documentXml.toString("utf8");
        const beforeText = extractDocxText(xml);
        const replacements = parseReplacements(args.replacements);
        const replacementResults: PluginJsonValue[] = [];
        for (const [index, replacement] of replacements.entries()) {
          const result = replaceDocxTextNodes(xml, replacement.search, replacement.replace, replacement.replaceAll ?? false, replacement.style ?? "plain");
          if (result.ambiguousOccurrences !== undefined) return docxAmbiguousSearchError(sourcePath, replacement, index, result.ambiguousOccurrences);
          if (result.count === 0) return fail("DOCX_SEARCH_NOT_FOUND", `Search text was not found: ${replacement.search}`);
          xml = result.xml;
          replacementResults.push({ search: replacement.search, replacements: result.count, style: replacement.style ?? "plain" });
        }
        const backup = args.backup === false ? undefined : backupPath(sourcePath);
        if (backup) await writeFile(context.files, backup, original, { overwrite: false });
        const updated = zip.replaceEntry("word/document.xml", Buffer.from(xml, "utf8"));
        await writeFile(context.files, sourcePath, updated, { create: false, overwrite: true });
        const afterText = extractDocxText(xml);
        return ok({ path: sourcePath, replacements: replacementResults, beforeChars: beforeText.length, afterChars: afterText.length, ...(backup ? { backup } : {}), verificationTextPreview: afterText.slice(0, 20_000) }, `Edited DOCX ${sourcePath}.`);
      });
    },

    async "OfficeDocumentEdit"(input, context) {
      const args = asRecord(input);
      return safeRun("OFFICE_EDIT_FAILED", async () => {
        const sourcePath = requiredString(args, "path");
        const format = officeFormatFromPath(sourcePath);
        if (!format) return fail("OFFICE_UNSUPPORTED_FORMAT", `Unsupported Office format for ${sourcePath}.`);
        const replacements = parseReplacements(args.replacements);
        if (format === "xlsx" && replacements.some((replacement) => replacement.style === "red_bold")) return fail("OFFICE_STYLE_UNSUPPORTED", "XLSX red_bold replacement is not supported.");
        const original = await readFile(context.files, sourcePath);
        const zip = openZip(original);
        const files = zip.entries.filter((entry) => !entry.isDirectory).map((entry) => ({ name: entry.name, data: zip.readEntry(entry.name) ?? Buffer.alloc(0) }));
        const replacementResults: PluginJsonValue[] = [];
        for (const [replacementIndex, replacement] of replacements.entries()) {
          const totalOccurrences = files.filter((file) => isEditableOfficeXmlPart(format, file.name)).reduce((total, file) => total + countOfficeTextNodeOccurrences(file.data.toString("utf8"), format, replacement.search), 0);
          if (totalOccurrences === 0) return fail("OFFICE_SEARCH_NOT_FOUND", `Search text was not found: ${replacement.search}`);
          if (!replacement.replaceAll && totalOccurrences > 1) return fail("OFFICE_AMBIGUOUS_SEARCH", `Search text occurs ${totalOccurrences} times for replacement ${replacementIndex}; set replaceAll=true.`);
          let replaced = 0;
          for (const file of files) {
            if (!isEditableOfficeXmlPart(format, file.name)) continue;
            const result = replaceOfficeTextNodes(file.data.toString("utf8"), format, replacement.search, replacement.replace, replacement.replaceAll ?? false, replacement.style ?? "plain");
            if (result.ambiguousOccurrences !== undefined) return fail("OFFICE_AMBIGUOUS_SEARCH", `Search text is ambiguous for replacement ${replacementIndex}.`);
            if (result.count > 0) { file.data = Buffer.from(result.xml, "utf8"); replaced += result.count; }
          }
          replacementResults.push({ search: replacement.search, replacements: replaced, style: replacement.style ?? "plain" });
        }
        const backup = args.backup === false ? undefined : backupPath(sourcePath);
        if (backup) await writeFile(context.files, backup, original, { overwrite: false });
        const updated = createZip(files);
        await writeFile(context.files, sourcePath, updated, { create: false, overwrite: true });
        const updatedZip = openZip(updated);
        const parts = Object.fromEntries(updatedZip.entries.filter((entry) => isEditableOfficeXmlPart(format, entry.name)).map((entry) => [entry.name, updatedZip.readEntry(entry.name)?.toString("utf8") ?? ""]));
        return ok({ path: sourcePath, format, replacements: replacementResults, verificationTextPreview: extractOfficeText(format, parts).slice(0, 20_000), ...(backup ? { backup } : {}) }, `Edited ${format.toUpperCase()} ${sourcePath}.`);
      });
    },

    async "OfficeDocumentInspect"(input, context) {
      const args = asRecord(input);
      return inspectOrVerify(args, context, false);
    },

    async "OfficeDocumentVerify"(input, context) {
      const args = asRecord(input);
      return inspectOrVerify(args, context, true);
    },

    async "PdfRead"(input, context) {
      const args = asRecord(input);
      return safeRun("PDF_READ_FAILED", async () => {
        const sourcePath = requiredString(args, "path");
        const extraction = await extractPdfText(await readFile(context.files, sourcePath));
        const text = extraction.text;
        const maxChars = integerValue(args.maxChars, 1, 1_000_000) ?? 100_000;
        return ok({
          path: sourcePath,
          text: text.slice(0, maxChars),
          totalChars: text.length,
          truncated: text.length > maxChars,
          method: extraction.method,
          totalPages: extraction.totalPages,
          pages: extraction.pages.map((page) => ({ page: page.page, chars: page.text.length }))
        }, `Extracted ${Math.min(text.length, maxChars)} PDF character(s) from ${extraction.totalPages} page(s).`);
      });
    },

    async "PdfOcr"(input, context) {
      const args = asRecord(input);
      return safeRun("PDF_OCR_FAILED", async () => {
        const sourcePath = requiredString(args, "path");
        const result = await recognizeDocumentOffline({
          buffer: await readFile(context.files, sourcePath),
          extension: path.extname(sourcePath).toLowerCase(),
          languages: (stringArray(args.languages)?.filter((language): language is "eng" | "chi_sim" => language === "eng" || language === "chi_sim")) ?? ["chi_sim", "eng"],
          maxPages: integerValue(args.maxPages, 1, 50) ?? 20,
          scale: numberValue(args.scale) ?? 2,
          maxChars: integerValue(args.maxChars, 1, 1_000_000) ?? 200_000,
          forceOcr: args.forceOcr === true
        });
        return ok({ path: sourcePath, ...result }, `Extracted ${result.text.length} character(s) from ${sourcePath} using ${result.method}.`);
      });
    }
  }
});

async function inspectOrVerify(args: Record<string, PluginJsonValue>, context: PluginToolContext, verify: boolean): Promise<PluginToolResult> {
  return safeRun(verify ? "OFFICE_VERIFY_FAILED" : "OFFICE_INSPECT_FAILED", async () => {
    const sourcePath = requiredString(args, "path");
    const inspection = inspectOfficeDocument(await readFile(context.files, sourcePath), sourcePath, verify ? 1_000_000 : integerValue(args.maxTextChars, 1, 1_000_000) ?? 100_000, verify ? false : args.includeEntries !== false);
    if (!inspection.ok) return fail(inspection.code, inspection.message);
    if (!verify) return ok(inspection.output, `Inspected ${inspection.output.format.toUpperCase()} ${sourcePath}.`);
    const checks: PluginJsonValue[] = [];
    const failures: string[] = [];
    const text = inspection.output.text;
    for (const expected of stringArray(args.requireText) ?? []) { const passed = text.includes(expected); checks.push({ kind: "required_text", value: expected, ok: passed }); if (!passed) failures.push(`Required text was not found: ${expected}`); }
    const requireAny = stringArray(args.requireAnyText) ?? [];
    if (requireAny.length > 0) { const found = requireAny.filter((item) => text.includes(item)); const passed = found.length > 0; checks.push({ kind: "required_any_text", values: requireAny, found, ok: passed }); if (!passed) failures.push("None of the required text options were found."); }
    for (const forbidden of stringArray(args.disallowText) ?? []) { const passed = !text.includes(forbidden); checks.push({ kind: "disallowed_text", value: forbidden, ok: passed }); if (!passed) failures.push(`Disallowed text is present: ${forbidden}`); }
    const minTextChars = integerValue(args.minTextChars, 0, 1_000_000);
    if (minTextChars !== undefined) { const passed = text.length >= minTextChars; checks.push({ kind: "min_text_chars", expected: minTextChars, actual: text.length, ok: passed }); if (!passed) failures.push(`Text length ${text.length} is below ${minTextChars}.`); }
    if (args.requireBold === true) { const passed = inspection.output.styleSignals.boldRuns > 0; checks.push({ kind: "bold_style", actual: inspection.output.styleSignals.boldRuns, ok: passed }); if (!passed) failures.push("No bold style signal was found."); }
    if (args.requireRed === true) { const passed = inspection.output.styleSignals.redRuns > 0; checks.push({ kind: "red_style", actual: inspection.output.styleSignals.redRuns, ok: passed }); if (!passed) failures.push("No red style signal was found."); }
    for (const expected of stringArray(args.requireRedBoldText) ?? []) { const passed = officeTextHasRedBoldRun(inspection.output.format, inspection.output.xmlParts, expected); checks.push({ kind: "red_bold_text", value: expected, ok: passed }); if (!passed) failures.push(`Required red+bold text was not found: ${expected}`); }
    const status = failures.length === 0 ? "passed" : "failed";
    return ok({ path: sourcePath, format: inspection.output.format, status, checks, failures, textPreview: text.slice(0, 20_000), styleSignals: inspection.output.styleSignals, packageHash: inspection.output.packageHash }, `Office document verification ${status} for ${sourcePath}.`);
  });
}

async function readFile(files: PluginFilesClient, filePath: string): Promise<Buffer> {
  const response = asRecord(await files.read(filePath, { encoding: "base64", maxBytes: MAX_FILE_BYTES }));
  if (response.encoding !== "base64" || typeof response.content !== "string") throw new Error(`File broker returned invalid content for ${filePath}.`);
  return Buffer.from(response.content, "base64");
}

async function writeFile(files: PluginFilesClient, filePath: string, content: Buffer, options: { create?: boolean; overwrite: boolean }): Promise<void> {
  await files.write(filePath, content.toString("base64"), { encoding: "base64", create: options.create ?? true, overwrite: options.overwrite });
}

function parseReplacements(value: PluginJsonValue | undefined): OfficeTextReplacement[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error("replacements must contain at least one item.");
  return value.map((item) => { const record = asRecord(item); return { search: requiredString(record, "search"), replace: typeof record.replace === "string" ? record.replace : "", ...(record.replaceAll === true ? { replaceAll: true } : {}), ...(record.style === "red_bold" ? { style: "red_bold" as const } : {}) }; });
}

function safeArchiveEntryPath(entry: string): string | undefined { const normalized = entry.replaceAll("\\", "/").replace(/^\/+/, ""); return !normalized || normalized.split("/").some((part) => part === "..") ? undefined : normalized; }
function normalizeRelative(value: string): string { return value.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/+$/, ""); }
function backupPath(value: string): string { return `${value}.bak-${new Date().toISOString().replace(/[:.]/g, "-")}`; }
function asRecord(value: PluginJsonValue | undefined): Record<string, PluginJsonValue> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, PluginJsonValue> : {}; }
function stringValue(value: PluginJsonValue | undefined): string | undefined { return typeof value === "string" && value.trim() ? value : undefined; }
function requiredString(record: Record<string, PluginJsonValue>, key: string): string { const value = stringValue(record[key]); if (!value) throw new Error(`${key} is required.`); return value; }
function stringArray(value: PluginJsonValue | undefined): string[] | undefined { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.length > 0) : undefined; }
function numberValue(value: PluginJsonValue | undefined): number | undefined { return typeof value === "number" && Number.isFinite(value) ? value : undefined; }
function integerValue(value: PluginJsonValue | undefined, min: number, max: number): number | undefined { const number = numberValue(value); return number !== undefined ? Math.max(min, Math.min(max, Math.floor(number))) : undefined; }
function ok(output: PluginJsonValue, summary: string): PluginToolResult { return { ok: true, output, summary }; }
function fail(code: string, message: string): PluginToolResult { return { ok: false, error: { code, message, recoverable: true }, summary: message }; }
async function safeRun(code: string, execute: () => Promise<PluginToolResult>): Promise<PluginToolResult> { try { return await execute(); } catch (error) { return fail(code, error instanceof Error ? error.message : String(error)); } }
