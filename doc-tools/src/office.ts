// Office Open XML parsing and editing helpers for the self-contained doc-tools
// Code Plugin. Pure string/XML processing over
// the self-contained ZIP reader (./zip.js) — no third-party Office library.

import { createHash } from "node:crypto";
import type { PluginJsonValue, PluginToolResult } from "@cotree/plugin-sdk";
import { openZip } from "./zip.js";

type JsonObject = { [key: string]: PluginJsonValue };
type ToolResult = PluginToolResult;

export type OfficeFormat = "docx" | "xlsx" | "pptx";

export type OfficeTextReplacement = {
  search: string;
  replace: string;
  replaceAll?: boolean;
  style?: "plain" | "red_bold";
};

export type OfficeInspectionOutput = {
  path: string;
  format: OfficeFormat;
  entries?: JsonObject[];
  totalEntries: number;
  text: string;
  totalChars: number;
  truncated: boolean;
  styleSignals: {
    boldRuns: number;
    redRuns: number;
    formulaCells: number;
    slides: number;
    worksheets: number;
  };
  xmlParts: Record<string, string>;
  packageHash: string;
};

export type OfficeAttachmentTextResult =
  | {
      ok: true;
      format: OfficeFormat;
      text: string;
      totalChars: number;
      truncated: boolean;
    }
  | { ok: false; code: string; message: string };

export function extractOfficeAttachmentText(
  buffer: Buffer,
  fileName: string,
  maxTextChars: number
): OfficeAttachmentTextResult {
  const format = officeFormatFromPath(fileName);
  if (!format) {
    return {
      ok: false,
      code: "OFFICE_UNSUPPORTED_FORMAT",
      message: `Unsupported Office format for ${fileName}.`
    };
  }
  try {
    const parts = officeXmlParts(openZip(buffer), format);
    if (Object.keys(parts).length === 0) {
      return {
        ok: false,
        code: "OFFICE_XML_PARTS_NOT_FOUND",
        message: `No readable ${format.toUpperCase()} XML content was found.`
      };
    }
    const text = extractOfficeText(format, parts);
    return {
      ok: true,
      format,
      text: text.slice(0, maxTextChars),
      totalChars: text.length,
      truncated: text.length > maxTextChars
    };
  } catch (error) {
    return {
      ok: false,
      code: "OFFICE_INSPECT_FAILED",
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

export function readDocxDocumentXml(buffer: Buffer): { ok: true; xml: string } | { ok: false; code: string; message: string } {
  try {
    const entry = openZip(buffer).readEntry("word/document.xml");
    if (!entry) {
      return { ok: false, code: "DOCX_DOCUMENT_XML_NOT_FOUND", message: "DOCX package does not contain word/document.xml." };
    }
    return { ok: true, xml: entry.toString("utf8") };
  } catch (error) {
    return { ok: false, code: "DOCX_READ_FAILED", message: error instanceof Error ? error.message : String(error) };
  }
}

export function inspectOfficeDocument(
  buffer: Buffer,
  relativePath: string,
  maxTextChars: number,
  includeEntries: boolean
): { ok: true; output: OfficeInspectionOutput } | { ok: false; code: string; message: string } {
  try {
    const zip = openZip(buffer);
    const format = officeFormatFromPath(relativePath);
    if (!format) {
      return { ok: false, code: "OFFICE_UNSUPPORTED_FORMAT", message: `Unsupported Office format for ${relativePath}.` };
    }
    const parts = officeXmlParts(zip, format);
    if (Object.keys(parts).length === 0) {
      return { ok: false, code: "OFFICE_XML_PARTS_NOT_FOUND", message: `No readable ${format.toUpperCase()} XML content was found.` };
    }
    const text = extractOfficeText(format, parts);
    const entries = includeEntries
      ? zip.entries.slice(0, 1000).map((entry) => ({
          name: entry.name,
          compressedSize: entry.compressedSize,
          uncompressedSize: entry.uncompressedSize,
          isDirectory: entry.isDirectory
        }))
      : undefined;
    return {
      ok: true,
      output: {
        path: relativePath,
        format,
        ...(entries ? { entries } : {}),
        totalEntries: zip.entries.length,
        text: text.slice(0, maxTextChars),
        totalChars: text.length,
        truncated: text.length > maxTextChars,
        styleSignals: officeStyleSignals(format, parts),
        xmlParts: parts,
        packageHash: createHash("sha256").update(buffer).digest("hex")
      }
    };
  } catch (error) {
    return { ok: false, code: "OFFICE_INSPECT_FAILED", message: error instanceof Error ? error.message : String(error) };
  }
}

export function officeFormatFromPath(filePath: string): OfficeFormat | undefined {
  const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  if (ext === ".docx") return "docx";
  if (ext === ".xlsx") return "xlsx";
  if (ext === ".pptx") return "pptx";
  return undefined;
}

function officeXmlParts(zip: ReturnType<typeof openZip>, format: OfficeFormat): Record<string, string> {
  const parts: Record<string, string> = {};
  const include = (entryName: string): boolean => {
    if (format === "docx") {
      return entryName === "word/document.xml" || /^word\/(?:header|footer|footnotes|endnotes)\d*\.xml$/i.test(entryName);
    }
    if (format === "xlsx") {
      return entryName === "xl/sharedStrings.xml" || entryName === "xl/workbook.xml" || /^xl\/worksheets\/sheet\d+\.xml$/i.test(entryName) || /^xl\/styles\.xml$/i.test(entryName);
    }
    return entryName === "ppt/presentation.xml" || /^ppt\/slides\/slide\d+\.xml$/i.test(entryName);
  };
  for (const entry of zip.entries) {
    if (entry.isDirectory || !include(entry.name)) {
      continue;
    }
    const data = zip.readEntry(entry.name);
    if (data) {
      parts[entry.name] = data.toString("utf8");
    }
  }
  return parts;
}

export function isEditableOfficeXmlPart(format: OfficeFormat, entryName: string): boolean {
  if (format === "docx") {
    return entryName === "word/document.xml" || /^word\/(?:header|footer|footnotes|endnotes)\d*\.xml$/i.test(entryName);
  }
  if (format === "xlsx") {
    return entryName === "xl/sharedStrings.xml" || /^xl\/worksheets\/sheet\d+\.xml$/i.test(entryName);
  }
  return /^ppt\/slides\/slide\d+\.xml$/i.test(entryName);
}

export function extractOfficeText(format: OfficeFormat, parts: Record<string, string>): string {
  if (format === "docx") {
    return Object.entries(parts)
      .filter(([name]) => name.startsWith("word/"))
      .map(([, xml]) => extractDocxText(xml))
      .filter(Boolean)
      .join("\n");
  }
  if (format === "xlsx") {
    const sharedStrings = extractSpreadsheetSharedStrings(parts["xl/sharedStrings.xml"] ?? "");
    const worksheetText = Object.entries(parts)
      .filter(([name]) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name))
      .flatMap(([, xml]) => extractSpreadsheetCellText(xml, sharedStrings));
    return [...sharedStrings, ...worksheetText].filter(Boolean).join("\n");
  }
  return Object.entries(parts)
    .filter(([name]) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .map(([, xml]) => extractGenericTextNodes(xml))
    .filter(Boolean)
    .join("\n");
}

function extractSpreadsheetSharedStrings(xml: string): string[] {
  if (!xml) return [];
  return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((match) => extractGenericTextNodes(match[1] ?? ""));
}

function extractSpreadsheetCellText(xml: string, sharedStrings: string[]): string[] {
  const values: string[] = [];
  for (const match of xml.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
    const attrs = match[1] ?? "";
    const body = match[2] ?? "";
    const value = body.match(/<v>([\s\S]*?)<\/v>/)?.[1];
    const inline = body.match(/<is\b[^>]*>([\s\S]*?)<\/is>/)?.[1];
    if (attrs.includes('t="s"') && value !== undefined) {
      const index = Number.parseInt(value, 10);
      if (Number.isInteger(index) && sharedStrings[index] !== undefined) {
        values.push(sharedStrings[index]);
      }
    } else if (inline) {
      values.push(extractGenericTextNodes(inline));
    } else if (value !== undefined) {
      values.push(xmlUnescape(value));
    }
  }
  return values;
}

function extractGenericTextNodes(xml: string): string {
  return [...xml.matchAll(/<(?:[A-Za-z0-9]+:)?t\b[^>]*>([\s\S]*?)<\/(?:[A-Za-z0-9]+:)?t>/g)]
    .map((match) => xmlUnescape(match[1] ?? ""))
    .join("");
}

export function officeStyleSignals(format: OfficeFormat, parts: Record<string, string>): OfficeInspectionOutput["styleSignals"] {
  const allXml = Object.values(parts).join("\n");
  return {
    boldRuns: countRegex(allXml, /<(?:w:)?b\b[^>]*\/>|<a:b\b[^>]*\/>|<b\b[^>]*\/>/g),
    redRuns: countRegex(allXml, /(?:w:color\s+w:val|rgb|srgbClr\s+val|fgColor\s+rgb|color\s+rgb)=["'](?:FF)?(?:FF0000|C00000|E60000|D00000)["']/gi),
    formulaCells: format === "xlsx" ? countRegex(allXml, /<f\b[^>]*>[\s\S]*?<\/f>/g) : 0,
    slides: format === "pptx" ? Object.keys(parts).filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name)).length : 0,
    worksheets: format === "xlsx" ? Object.keys(parts).filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name)).length : 0
  };
}

export function officeTextHasRedBoldRun(format: OfficeFormat, parts: Record<string, string>, expected: string): boolean {
  const escaped = escapeRegExp(xmlEscape(expected));
  if (format === "docx") {
    return Object.values(parts).some((xml) => {
      const runRe = /<w:r\b[^>]*>([\s\S]*?)<\/w:r>/g;
      for (const match of xml.matchAll(runRe)) {
        const run = match[1] ?? "";
        if (new RegExp(escaped).test(run) && /<w:b\b[^>]*\/>/.test(run) && /<w:color\s+w:val=["'](?:FF0000|C00000|E60000|D00000)["']\/>/.test(run)) {
          return true;
        }
      }
      return false;
    });
  }
  const text = extractOfficeText(format, parts);
  return text.includes(expected) && officeStyleSignals(format, parts).boldRuns > 0 && officeStyleSignals(format, parts).redRuns > 0;
}

function countRegex(value: string, re: RegExp): number {
  return [...value.matchAll(re)].length;
}

export function extractDocxText(xml: string): string {
  const blocks: string[] = [];
  let paragraph = "";
  const tokenRe = /<(\/?)w:p\b[^>]*>|<w:tab\b[^>]*\/>|<w:br\b[^>]*\/>|<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g;
  for (const match of xml.matchAll(tokenRe)) {
    if (match[0].startsWith("</w:p")) {
      if (paragraph.trim().length > 0) {
        blocks.push(paragraph);
      }
      paragraph = "";
      continue;
    }
    if (match[0].startsWith("<w:tab")) {
      paragraph += "\t";
      continue;
    }
    if (match[0].startsWith("<w:br")) {
      paragraph += "\n";
      continue;
    }
    if (match[2] !== undefined) {
      paragraph += xmlUnescape(match[2]);
    }
  }
  if (paragraph.trim().length > 0) {
    blocks.push(paragraph);
  }
  return blocks.join("\n");
}

export function docxAmbiguousSearchError(
  path: string,
  replacement: { search: string; replace: string; replaceAll?: boolean; style?: "plain" | "red_bold" },
  replacementIndex: number,
  occurrences: number
): ToolResult {
  const suggestedReplacement = {
    ...replacement,
    replaceAll: true
  };
  const message = `Search text occurs ${occurrences} times inside one DOCX text node for replacement ${replacementIndex}; set replaceAll=true to replace all occurrences in that text node.`;
  return {
    ok: false,
    error: {
      code: "DOCX_AMBIGUOUS_SEARCH",
      message,
      recoverable: true
    },
    output: {
      code: "DOCX_AMBIGUOUS_SEARCH",
      path,
      replacementIndex,
      occurrences,
      search: replacement.search,
      replace: replacement.replace,
      style: replacement.style ?? "plain",
      suggestedReplacement
    },
    summary: message
  };
}

export function replaceDocxTextNodes(xml: string, search: string, replace: string, replaceAll: boolean, style: "plain" | "red_bold"): { xml: string; count: number; ambiguousOccurrences?: number } {
  let count = 0;
  let ambiguousOccurrences: number | undefined;
  const searchEscaped = xmlEscape(search);
  const replaceEscaped = xmlEscape(replace);
  const next = xml.replace(/<w:t([^>]*)>([\s\S]*?)<\/w:t>/g, (full, attrs: string, body: string) => {
    const text = xmlUnescape(body);
    const occurrences = countOccurrences(text, search);
    if (occurrences === 0 || (!replaceAll && count > 0)) {
      return full;
    }
    if (!replaceAll && occurrences > 1) {
      ambiguousOccurrences = occurrences;
      return full;
    }
    const replaced = replaceAll ? body.split(searchEscaped).join(replaceEscaped) : body.replace(searchEscaped, replaceEscaped);
    count += replaceAll ? occurrences : 1;
    if (style === "red_bold") {
      return `<w:rPr><w:b/><w:color w:val="FF0000"/></w:rPr><w:t${attrs}>${replaced}</w:t>`;
    }
    return `<w:t${attrs}>${replaced}</w:t>`;
  });
  return { xml: ambiguousOccurrences === undefined ? next : xml, count, ...(ambiguousOccurrences !== undefined ? { ambiguousOccurrences } : {}) };
}

export function replaceOfficeTextNodes(
  xml: string,
  format: OfficeFormat,
  search: string,
  replace: string,
  replaceAll: boolean,
  style: "plain" | "red_bold"
): { xml: string; count: number; ambiguousOccurrences?: number } {
  if (format === "docx") {
    return replaceDocxTextNodes(xml, search, replace, replaceAll, style);
  }

  let count = 0;
  let ambiguousOccurrences: number | undefined;
  const textNode = format === "xlsx"
    ? /<t([^>]*)>([\s\S]*?)<\/t>/g
    : /<a:t([^>]*)>([\s\S]*?)<\/a:t>/g;
  const prefix = format === "xlsx" ? "" : "a:";
  const next = xml.replace(textNode, (full, attrs: string, body: string) => {
    const text = xmlUnescape(body);
    const occurrences = countOccurrences(text, search);
    if (occurrences === 0 || (!replaceAll && count > 0)) {
      return full;
    }
    if (!replaceAll && occurrences > 1) {
      ambiguousOccurrences = occurrences;
      return full;
    }
    const replaced = replaceAll ? text.split(search).join(replace) : text.replace(search, replace);
    count += replaceAll ? occurrences : 1;
    if (style === "red_bold") {
      const runProperties = format === "xlsx"
        ? '<rPr><b/><color rgb="FFFF0000"/></rPr>'
        : '<a:rPr b="1"><a:solidFill><a:srgbClr val="FF0000"/></a:solidFill></a:rPr>';
      return `${runProperties}<${prefix}t${attrs}>${xmlEscape(replaced)}</${prefix}t>`;
    }
    return `<${prefix}t${attrs}>${xmlEscape(replaced)}</${prefix}t>`;
  });
  return {
    xml: ambiguousOccurrences === undefined ? next : xml,
    count,
    ...(ambiguousOccurrences !== undefined ? { ambiguousOccurrences } : {})
  };
}

export function countOfficeTextNodeOccurrences(xml: string, format: OfficeFormat, search: string): number {
  const textNode = format === "docx"
    ? /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g
    : format === "xlsx"
      ? /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g
      : /<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g;
  let count = 0;
  for (const match of xml.matchAll(textNode)) {
    count += countOccurrences(xmlUnescape(match[1] ?? ""), search);
  }
  return count;
}

export function xmlEscape(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function xmlUnescape(value: string): string {
  return value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&apos;/g, "'");
}

function countOccurrences(value: string, search: string): number {
  return value.split(search).length - 1;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
