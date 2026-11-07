import path from "node:path";
import {
  definePlugin,
  type PluginCredentialFetchRequest,
  type PluginFilesClient,
  type PluginJsonValue,
  type PluginToolContext,
  type PluginToolResult
} from "@cotree/plugin-sdk";

const API_BASE = "https://api.openai.com/v1";
const MAX_AUDIO_INPUT_BYTES = 23 * 1024 * 1024;
const MAX_AUDIO_OUTPUT_BYTES = 20 * 1024 * 1024;
const AUDIO_MIME_TYPES = new Set(["audio/mpeg", "audio/wav", "audio/mp4", "audio/ogg", "audio/webm", "audio/flac", "audio/aac"]);

export default definePlugin({
  tools: {
    async AudioTranscribe(input, context) {
      const args = asRecord(input);
      const source = await resolveAudioInput(args, context.files);
      if (!source.ok) return source.result;
      const model = boundedString(args.model, 128) ?? "whisper-1";
      const responseFormat = enumValue(args.responseFormat, ["json", "text", "srt", "verbose_json", "vtt"] as const) ?? "json";
      const fields: Record<string, string> = { model, response_format: responseFormat };
      const language = boundedString(args.language, 16);
      const prompt = boundedString(args.prompt, 4_096);
      const temperature = numberValue(args.temperature);
      if (language) fields.language = language;
      if (prompt) fields.prompt = prompt;
      if (temperature !== undefined) {
        if (temperature < 0 || temperature > 1) return fail("AUDIO_TRANSCRIBE_TEMPERATURE_INVALID", "temperature must be between 0 and 1.", false);
        fields.temperature = String(temperature);
      }
      try {
        const response = await credentialFetch(context, {
          url: `${API_BASE}/audio/transcriptions`,
          method: "POST",
          multipart: {
            fields,
            files: [{ fieldName: "file", fileName: source.fileName, contentType: source.contentType, data: source.base64 }]
          },
          timeoutMs: 60_000,
          maxResponseBytes: 4 * 1024 * 1024
        });
        const status = numberValue(response.status) ?? 0;
        if (status < 200 || status >= 300) return httpFailure("AUDIO_TRANSCRIBE_HTTP_ERROR", "Transcription API", response);
        const body = decodeBody(response);
        let output: Record<string, PluginJsonValue> = { model, responseFormat, source: source.kind };
        let text = body.trim();
        if (responseFormat === "json" || responseFormat === "verbose_json") {
          try {
            const payload = asRecord(JSON.parse(body) as PluginJsonValue);
            text = boundedString(payload.text, 1_000_000) ?? "";
            output = {
              ...output,
              ...(typeof payload.language === "string" ? { language: payload.language } : {}),
              ...(typeof payload.duration === "number" ? { duration: payload.duration } : {}),
              ...(Array.isArray(payload.segments) ? { segments: payload.segments.slice(0, 1_000) } : {})
            };
          } catch {
            return fail("AUDIO_TRANSCRIBE_RESPONSE_INVALID", "Transcription API returned malformed JSON.", true);
          }
        }
        if (!text) return fail("AUDIO_TRANSCRIBE_EMPTY", "Transcription API returned no text.", true);
        return {
          ok: true,
          output: { ...output, text },
          summary: `Transcribed ${source.label} with ${model}.`
        };
      } catch (error) {
        return requestFailure("AUDIO_TRANSCRIBE_REQUEST_FAILED", error);
      }
    },

    async AudioSpeech(input, context) {
      const args = asRecord(input);
      const text = boundedString(args.text, 4_096);
      if (!text) return fail("AUDIO_SPEECH_TEXT_REQUIRED", "AudioSpeech requires 1-4096 characters of text.", false);
      const model = boundedString(args.model, 128) ?? "tts-1";
      const voice = boundedString(args.voice, 128) ?? "alloy";
      const format = enumValue(args.format, ["mp3", "opus", "aac", "flac", "wav", "pcm"] as const) ?? "mp3";
      const speed = numberValue(args.speed);
      if (speed !== undefined && (speed < 0.25 || speed > 4)) return fail("AUDIO_SPEECH_SPEED_INVALID", "speed must be between 0.25 and 4.", false);
      const outputPath = speechOutputPath(boundedString(args.outputPath, 4_096), format, context.runId);
      if (!outputPath.ok) return outputPath.result;
      try {
        const response = await credentialFetch(context, {
          url: `${API_BASE}/audio/speech`,
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ model, input: text, voice, response_format: format, ...(speed !== undefined ? { speed } : {}) }),
          timeoutMs: 60_000,
          maxResponseBytes: MAX_AUDIO_OUTPUT_BYTES
        });
        const status = numberValue(response.status) ?? 0;
        if (status < 200 || status >= 300) return httpFailure("AUDIO_SPEECH_HTTP_ERROR", "Speech API", response);
        const audioBase64 = typeof response.body === "string" && response.bodyEncoding === "base64" ? response.body : "";
        const validation = validateBase64(audioBase64, MAX_AUDIO_OUTPUT_BYTES);
        if (!validation.ok) return fail("AUDIO_SPEECH_INVALID_AUDIO", validation.message, true);
        await context.files.write(outputPath.path, audioBase64, {
          encoding: "base64",
          create: true,
          overwrite: args.overwrite === true
        });
        const bytes = decodedBase64Bytes(audioBase64);
        return {
          ok: true,
          output: { model, voice, format, bytes, path: outputPath.path, mimeType: audioMimeTypeForFormat(format) },
          content: [{ type: "resource", uri: `cotree-workspace:${outputPath.path}`, mimeType: audioMimeTypeForFormat(format), name: path.posix.basename(outputPath.path) }],
          summary: `Synthesized ${bytes} bytes of ${format} audio to ${outputPath.path}.`
        };
      } catch (error) {
        return requestFailure("AUDIO_SPEECH_REQUEST_FAILED", error);
      }
    }
  }
});

async function resolveAudioInput(
  args: Record<string, PluginJsonValue>,
  files: PluginFilesClient
): Promise<
  | { ok: true; base64: string; fileName: string; contentType: string; kind: "workspace-file" | "base64"; label: string }
  | { ok: false; result: PluginToolResult }
> {
  const audioPath = boundedString(args.path, 4_096);
  const audioBase64 = boundedString(args.audioBase64, 32 * 1024 * 1024);
  if (Number(Boolean(audioPath)) + Number(Boolean(audioBase64)) !== 1) {
    return { ok: false, result: fail("AUDIO_TRANSCRIBE_AUDIO_REQUIRED", "AudioTranscribe requires exactly one of path or audioBase64.", false) };
  }
  if (audioPath) {
    const fileName = path.basename(audioPath);
    const contentType = audioMimeType(fileName);
    if (!contentType) return { ok: false, result: fail("AUDIO_TRANSCRIBE_FORMAT_UNSUPPORTED", `Unsupported audio format: ${path.extname(audioPath) || "file extension missing"}.`, false) };
    try {
      const response = asRecord(await files.read(audioPath, { encoding: "base64", maxBytes: MAX_AUDIO_INPUT_BYTES }));
      const content = typeof response.content === "string" ? response.content : "";
      const validation = validateBase64(content, MAX_AUDIO_INPUT_BYTES);
      if (response.encoding !== "base64" || !validation.ok) throw new Error(validation.ok ? "File broker returned a non-base64 response." : validation.message);
      return { ok: true, base64: content, fileName, contentType, kind: "workspace-file", label: audioPath };
    } catch (error) {
      return { ok: false, result: fail("AUDIO_TRANSCRIBE_FILE_READ_FAILED", errorText(error), true) };
    }
  }
  const fileName = safeFileName(boundedString(args.fileName, 255) ?? "audio.mp3");
  if (!fileName) return { ok: false, result: fail("AUDIO_TRANSCRIBE_FILENAME_INVALID", "fileName must be a simple file name without path separators.", false) };
  const inferredType = audioMimeType(fileName);
  const contentType = boundedString(args.contentType, 128)?.toLowerCase() ?? inferredType;
  if (!contentType || !AUDIO_MIME_TYPES.has(contentType)) return { ok: false, result: fail("AUDIO_TRANSCRIBE_MIME_INVALID", `Unsupported audio MIME type: ${contentType ?? "MIME type not declared"}.`, false) };
  const validation = validateBase64(audioBase64!, MAX_AUDIO_INPUT_BYTES);
  if (!validation.ok) return { ok: false, result: fail("AUDIO_TRANSCRIBE_BASE64_INVALID", validation.message, false) };
  return { ok: true, base64: audioBase64!, fileName, contentType, kind: "base64", label: fileName };
}

function speechOutputPath(value: string | undefined, format: string, runId: string): { ok: true; path: string } | { ok: false; result: PluginToolResult } {
  const normalized = (value ?? `cotree-output/speech-${safePathSegment(runId)}-${Date.now()}.${format}`).replaceAll("\\", "/").replace(/^\.\//, "");
  if (!normalized || normalized.startsWith("/") || /^[A-Za-z]:/.test(normalized) || normalized.includes("\0") || normalized.split("/").some((segment) => segment === ".." || segment === ".")) {
    return { ok: false, result: fail("AUDIO_SPEECH_OUTPUT_PATH_INVALID", "outputPath must be a safe workspace-relative path.", false) };
  }
  const extension = path.posix.extname(normalized).toLowerCase();
  if (extension && extension !== `.${format}`) {
    return { ok: false, result: fail("AUDIO_SPEECH_OUTPUT_FORMAT_MISMATCH", `outputPath extension ${extension} does not match format ${format}.`, false) };
  }
  return { ok: true, path: extension ? normalized : `${normalized}.${format}` };
}

async function credentialFetch(context: PluginToolContext, request: Omit<PluginCredentialFetchRequest, "secret" | "authorization">): Promise<Record<string, PluginJsonValue>> {
  let lastError: unknown;
  for (const secret of ["AUDIO_API_KEY", "OPENAI_API_KEY"]) {
    try {
      return asRecord(await context.credentials.fetch({ ...request, secret, authorization: { kind: "bearer" } }));
    } catch (error) {
      lastError = error;
      if (!/PLUGIN_CREDENTIAL_NOT_FOUND/.test(errorText(error))) throw error;
    }
  }
  throw lastError ?? new Error("No audio API credential is configured.");
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
    detail = boundedString(asRecord(asRecord(JSON.parse(body) as PluginJsonValue).error).message, 500) ?? detail;
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

function validateBase64(value: string, maxBytes: number): { ok: true } | { ok: false; message: string } {
  if (!value || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value) || Buffer.from(value, "base64").toString("base64") !== value) {
    return { ok: false, message: "Audio data must be canonical base64." };
  }
  const bytes = decodedBase64Bytes(value);
  return bytes > 0 && bytes <= maxBytes ? { ok: true } : { ok: false, message: `Audio data must contain 1-${maxBytes} bytes.` };
}

function decodedBase64Bytes(value: string): number {
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor(value.length * 3 / 4) - padding);
}

function audioMimeType(fileName: string): string | undefined {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".mp3") || lower.endsWith(".mpga") || lower.endsWith(".mpeg")) return "audio/mpeg";
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".m4a") || lower.endsWith(".mp4")) return "audio/mp4";
  if (lower.endsWith(".ogg") || lower.endsWith(".oga") || lower.endsWith(".opus")) return "audio/ogg";
  if (lower.endsWith(".webm")) return "audio/webm";
  if (lower.endsWith(".flac")) return "audio/flac";
  if (lower.endsWith(".aac")) return "audio/aac";
  return undefined;
}

function audioMimeTypeForFormat(format: string): string {
  return format === "mp3" ? "audio/mpeg" : format === "opus" ? "audio/ogg" : format === "aac" ? "audio/aac" : format === "flac" ? "audio/flac" : format === "pcm" ? "audio/L16" : "audio/wav";
}

function safeFileName(value: string): string | undefined { return value && !/[\\/\r\n\0"]/.test(value) ? value : undefined; }
function safePathSegment(value: string): string { return value.replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 80) || "run"; }
function asRecord(value: PluginJsonValue | undefined): Record<string, PluginJsonValue> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, PluginJsonValue> : {}; }
function boundedString(value: PluginJsonValue | undefined, maxLength: number): string | undefined { return typeof value === "string" && value.trim() && value.length <= maxLength ? value.trim() : undefined; }
function numberValue(value: PluginJsonValue | undefined): number | undefined { return typeof value === "number" && Number.isFinite(value) ? value : undefined; }
function enumValue<T extends string>(value: PluginJsonValue | undefined, allowed: readonly T[]): T | undefined { return typeof value === "string" && allowed.includes(value as T) ? value as T : undefined; }
function errorText(error: unknown): string { return error instanceof Error ? error.message : String(error); }
function fail(code: string, message: string, recoverable: boolean): PluginToolResult { return { ok: false, error: { code, message, recoverable }, summary: message }; }
