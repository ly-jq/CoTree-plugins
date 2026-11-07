import path from "node:path";
import {
  definePlugin,
  type PluginCredentialFetchRequest,
  type PluginFilesClient,
  type PluginJsonValue,
  type PluginToolContext,
  type PluginToolResult,
  type PluginToolResultContent
} from "@cotree/plugin-sdk";

const API_BASE = "https://api.openai.com/v1";
const MAX_IMAGE_BYTES = 16 * 1024 * 1024;
const IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export default definePlugin({
  tools: {
    async ImageGenerate(input, context) {
      const args = asRecord(input);
      const prompt = boundedString(args.prompt, 32_000);
      if (!prompt) return fail("IMAGE_GENERATE_PROMPT_REQUIRED", "ImageGenerate requires a non-empty prompt.", false);
      const model = boundedString(args.model, 128) ?? "gpt-image-1";
      const size = boundedString(args.size, 32) ?? "1024x1024";
      const n = integerValue(args.n, 1, 4) ?? 1;
      const responseFormat = boundedString(args.responseFormat, 32) ?? "b64_json";
      try {
        const response = await credentialFetch(context, {
          url: `${API_BASE}/images/generations`,
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ model, prompt, size, n, response_format: responseFormat }),
          timeoutMs: 60_000,
          maxResponseBytes: 20 * 1024 * 1024
        });
        const status = numberValue(response.status) ?? 0;
        if (status < 200 || status >= 300) return httpFailure("IMAGE_GENERATE_HTTP_ERROR", "Image API", response);
        const payload = parseBody(response);
        const data = Array.isArray(payload.data) ? payload.data : [];
        const content: PluginToolResultContent[] = [];
        const images: PluginJsonValue[] = [];
        for (const [index, item] of data.entries()) {
          const image = asRecord(item);
          const base64 = boundedString(image.b64_json, 24 * 1024 * 1024);
          const url = boundedString(image.url, 4_096);
          if (base64) {
            const validation = validateBase64(base64, MAX_IMAGE_BYTES);
            if (!validation.ok) return fail("IMAGE_GENERATE_INVALID_DATA", `Image API returned invalid image data: ${validation.message}.`, false);
            content.push({ type: "image", mimeType: "image/png", data: base64, name: `generated-${index + 1}.png` });
          } else if (url && isHttpsUrl(url)) {
            content.push({ type: "resource", uri: url, mimeType: "image/png", name: `generated-${index + 1}.png` });
          } else {
            continue;
          }
          images.push({
            ...(url ? { url } : {}),
            ...(base64 ? { attached: true, mimeType: "image/png", bytes: decodedBase64Bytes(base64) } : {}),
            ...(boundedString(image.revised_prompt, 32_000) ? { revisedPrompt: boundedString(image.revised_prompt, 32_000)! } : {})
          });
        }
        if (images.length === 0) return fail("IMAGE_GENERATE_EMPTY", "Image API returned no usable images.", true);
        return {
          ok: true,
          output: { model, size, count: images.length, images },
          content,
          summary: `Generated ${images.length} image(s) with ${model}.`
        };
      } catch (error) {
        return requestFailure("IMAGE_GENERATE_REQUEST_FAILED", error);
      }
    },

    async ImageDescribe(input, context) {
      const args = asRecord(input);
      const source = await resolveImageSource(args, context.files);
      if (!source.ok) return source.result;
      const model = boundedString(args.model, 128) ?? "gpt-4o-mini";
      const prompt = boundedString(args.prompt, 32_000) ?? "Describe this image in detail.";
      const detail = enumValue(args.detail, ["auto", "low", "high"] as const) ?? "auto";
      const maxTokens = integerValue(args.maxTokens, 1, 16_384);
      try {
        const response = await credentialFetch(context, {
          url: `${API_BASE}/chat/completions`,
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [{
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: source.url, detail } }
              ]
            }],
            ...(maxTokens !== undefined ? { max_tokens: maxTokens } : {})
          }),
          timeoutMs: 60_000,
          maxResponseBytes: 4 * 1024 * 1024
        });
        const status = numberValue(response.status) ?? 0;
        if (status < 200 || status >= 300) return httpFailure("IMAGE_DESCRIBE_HTTP_ERROR", "Vision API", response);
        const payload = parseBody(response);
        const choices = Array.isArray(payload.choices) ? payload.choices : [];
        const message = asRecord(asRecord(choices[0]).message);
        const description = typeof message.content === "string" ? message.content.trim() : textParts(message.content);
        if (!description) return fail("IMAGE_DESCRIBE_EMPTY", "Vision API returned no description.", true);
        return {
          ok: true,
          output: { model, description, source: source.kind, detail },
          summary: `Described ${source.label} with ${model}.`
        };
      } catch (error) {
        return requestFailure("IMAGE_DESCRIBE_REQUEST_FAILED", error);
      }
    }
  }
});

async function resolveImageSource(
  args: Record<string, PluginJsonValue>,
  files: PluginFilesClient
): Promise<
  | { ok: true; url: string; kind: "url" | "base64" | "workspace-file"; label: string }
  | { ok: false; result: PluginToolResult }
> {
  const imageUrl = boundedString(args.imageUrl, 4_096);
  const imageBase64 = boundedString(args.imageBase64, 24 * 1024 * 1024);
  const imagePath = boundedString(args.path, 4_096);
  const selected = [imageUrl, imageBase64, imagePath].filter(Boolean).length;
  if (selected !== 1) {
    return { ok: false, result: fail("IMAGE_DESCRIBE_IMAGE_REQUIRED", "ImageDescribe requires exactly one of path, imageUrl, or imageBase64.", false) };
  }
  if (imageUrl) {
    if (!isHttpsUrl(imageUrl)) return { ok: false, result: fail("IMAGE_DESCRIBE_URL_INVALID", "imageUrl must be a public HTTPS URL.", false) };
    return { ok: true, url: imageUrl, kind: "url", label: "remote image" };
  }
  if (imagePath) {
    const mimeType = imageMimeType(imagePath);
    if (!mimeType) return { ok: false, result: fail("IMAGE_DESCRIBE_FORMAT_UNSUPPORTED", `Unsupported image format: ${path.extname(imagePath) || "file extension missing"}.`, false) };
    try {
      const response = asRecord(await files.read(imagePath, { encoding: "base64", maxBytes: MAX_IMAGE_BYTES }));
      const content = typeof response.content === "string" ? response.content : "";
      const validation = validateBase64(content, MAX_IMAGE_BYTES);
      if (response.encoding !== "base64" || !validation.ok) throw new Error(validation.ok ? "File broker returned a non-base64 response." : validation.message);
      return { ok: true, url: `data:${mimeType};base64,${content}`, kind: "workspace-file", label: imagePath };
    } catch (error) {
      return { ok: false, result: fail("IMAGE_DESCRIBE_FILE_READ_FAILED", errorText(error), true) };
    }
  }
  const mimeType = boundedString(args.mimeType, 128)?.toLowerCase() ?? "image/png";
  if (!IMAGE_MIME_TYPES.has(mimeType)) return { ok: false, result: fail("IMAGE_DESCRIBE_MIME_INVALID", `Unsupported image MIME type: ${mimeType}.`, false) };
  const validation = validateBase64(imageBase64!, MAX_IMAGE_BYTES);
  if (!validation.ok) return { ok: false, result: fail("IMAGE_DESCRIBE_BASE64_INVALID", validation.message, false) };
  return { ok: true, url: `data:${mimeType};base64,${imageBase64}`, kind: "base64", label: "inline image" };
}

async function credentialFetch(context: PluginToolContext, request: Omit<PluginCredentialFetchRequest, "secret" | "authorization">): Promise<Record<string, PluginJsonValue>> {
  let lastError: unknown;
  for (const secret of ["IMAGE_API_KEY", "OPENAI_API_KEY"]) {
    try {
      return asRecord(await context.credentials.fetch({ ...request, secret, authorization: { kind: "bearer" } }));
    } catch (error) {
      lastError = error;
      if (!/PLUGIN_CREDENTIAL_NOT_FOUND/.test(errorText(error))) throw error;
    }
  }
  throw lastError ?? new Error("No image API credential is configured.");
}

function parseBody(response: Record<string, PluginJsonValue>): Record<string, PluginJsonValue> {
  const body = decodeBody(response);
  try {
    return asRecord(JSON.parse(body) as PluginJsonValue);
  } catch {
    throw new Error("API returned malformed JSON.");
  }
}

function decodeBody(response: Record<string, PluginJsonValue>): string {
  if (typeof response.body !== "string") return "";
  return response.bodyEncoding === "base64" ? Buffer.from(response.body, "base64").toString("utf8") : response.body;
}

function httpFailure(code: string, label: string, response: Record<string, PluginJsonValue>): PluginToolResult {
  const status = numberValue(response.status) ?? 0;
  const body = decodeBody(response);
  let detail = body.slice(0, 500);
  try {
    const error = asRecord(asRecord(JSON.parse(body) as PluginJsonValue).error);
    detail = boundedString(error.message, 500) ?? detail;
  } catch {
    // Preserve bounded response text.
  }
  return fail(code, `${label} returned HTTP ${status}${detail ? `: ${detail}` : ""}.`, status === 408 || status === 409 || status === 425 || status === 429 || status >= 500);
}

function requestFailure(code: string, error: unknown): PluginToolResult {
  const message = errorText(error);
  const missingCredential = /PLUGIN_CREDENTIAL_NOT_FOUND|credential is configured/i.test(message);
  return fail(missingCredential ? "PLUGIN_CREDENTIAL_REQUIRED" : code, message, !missingCredential);
}

function textParts(value: PluginJsonValue | undefined): string {
  return Array.isArray(value) ? value.map((part) => boundedString(asRecord(part).text, 1_000_000) ?? "").filter(Boolean).join("\n").trim() : "";
}

function validateBase64(value: string, maxBytes: number): { ok: true } | { ok: false; message: string } {
  if (!value || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value) || Buffer.from(value, "base64").toString("base64") !== value) {
    return { ok: false, message: "Image data must be canonical base64" };
  }
  const bytes = decodedBase64Bytes(value);
  return bytes > 0 && bytes <= maxBytes ? { ok: true } : { ok: false, message: `Image data must contain 1-${maxBytes} bytes` };
}

function decodedBase64Bytes(value: string): number {
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor(value.length * 3 / 4) - padding);
}

function imageMimeType(filePath: string): string | undefined {
  const extension = path.extname(filePath).toLowerCase();
  return extension === ".png" ? "image/png" : extension === ".jpg" || extension === ".jpeg" ? "image/jpeg" : extension === ".webp" ? "image/webp" : extension === ".gif" ? "image/gif" : undefined;
}

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function asRecord(value: PluginJsonValue | undefined): Record<string, PluginJsonValue> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, PluginJsonValue> : {};
}
function boundedString(value: PluginJsonValue | undefined, maxLength: number): string | undefined { return typeof value === "string" && value.trim() && value.length <= maxLength ? value.trim() : undefined; }
function numberValue(value: PluginJsonValue | undefined): number | undefined { return typeof value === "number" && Number.isFinite(value) ? value : undefined; }
function integerValue(value: PluginJsonValue | undefined, min: number, max: number): number | undefined { const number = numberValue(value); return number !== undefined && Number.isInteger(number) && number >= min && number <= max ? number : undefined; }
function enumValue<T extends string>(value: PluginJsonValue | undefined, allowed: readonly T[]): T | undefined { return typeof value === "string" && allowed.includes(value as T) ? value as T : undefined; }
function errorText(error: unknown): string { return error instanceof Error ? error.message : String(error); }
function fail(code: string, message: string, recoverable: boolean): PluginToolResult { return { ok: false, error: { code, message, recoverable }, summary: message }; }
