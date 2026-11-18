import type { PluginToolContext } from "@cotree/plugin-sdk";
import { digest, file, good, identifier, object, parse, relative, StudioError, text, type ObjectValue } from "./shared.js";

export type Templates = Record<string, string>;
export async function project(input: ObjectValue, context: PluginToolContext, templates: Templates) {
  const root = relative(input.projectPath), action = text(input.action, "action");
  if (action === "inspect") {
    const entries = await context.files.list(root, { maxEntries: 200 });
    const result: ObjectValue = { projectPath: root, entries: entries.entries };
    for (const name of ["app-studio.json", "docs/product/spec.json", "docs/product/delivery.json"]) {
      if (await exists(context, file(root, name))) result[name] = parse((await context.files.read(file(root, name), { maxBytes: 262144 })).content, name);
    }
    return good(result);
  }
  if (action !== "initialize" && action !== "scaffold") throw new StudioError("STUDIO_ACTION_INVALID", "Use initialize, scaffold or inspect.");
  const goal = text(input.goal, "goal", 16000), name = input.name === undefined ? "My application" : text(input.name, "name", 120);
  const config = { schemaVersion: 1, name, goal, contract: "packages/contracts/openapi.json", specification: "docs/product/spec.json", sourceRoots: ["apps", "packages", "tests"], scripts: ["dev", "test", "test:e2e", "build"] };
  const planned: Templates = {
    "app-studio.json": JSON.stringify(config, null, 2) + "\n",
    "docs/product/brief.md": `# ${name}\n\n${goal}\n\nRecord scope, decisions and meaningful remaining questions here. This file is product documentation, not runtime state.\n`,
    "docs/product/spec.json": JSON.stringify({ schemaVersion: 1, rules: [], journeys: [], references: [], decisions: [] }, null, 2) + "\n"
  };
  if (action === "scaffold") Object.assign(planned, templates);
  const created: string[] = [], retained: string[] = [], conflicts: string[] = [];
  // Preflight all existing files before making a partial scaffold; replay reuses identical content only.
  for (const [name, content] of Object.entries(planned)) {
    if (!await exists(context, file(root, name))) continue;
    const existing = await context.files.read(file(root, name), { maxBytes: 262144 });
    if (existing.content !== content) conflicts.push(name); else retained.push(name);
  }
  if (conflicts.length) throw new StudioError("STUDIO_PROJECT_CONFLICT", `Existing files differ: ${conflicts.join(", ")}. Inspect the existing project and adapt it; initialization never overwrites.`);
  for (const [name, content] of Object.entries(planned)) {
    if (retained.includes(name)) continue;
    await context.files.write(file(root, name), content, { create: true, overwrite: false }); created.push(name);
  }
  return good({ projectPath: root, created, retained, scaffold: action === "scaffold", businessImplemented: false, next: "Use Group members to implement the requested business rules and verify the real application." });
}
export async function exists(context: Pick<PluginToolContext, "files">, name: string): Promise<boolean> {
  const pieces = relative(name).split("/"), base = pieces.pop()!;
  try {
    const list = await context.files.list(pieces.join("/") || ".", { maxEntries: 2000 });
    return list.entries.some(entry => entry.path.replaceAll("\\", "/").split("/").at(-1) === base);
  } catch (error) {
    // Only an explicit missing directory permits create; denied/limited observations must propagate.
    if (error instanceof Error && /(?:ENOENT|PLUGIN_FILE_NOT_FOUND|FILE_NOT_FOUND)/.test(error.message)) return false;
    throw error;
  }
}
export async function references(input: ObjectValue, context: PluginToolContext) {
  const action = text(input.action, "action"), root = relative(input.projectPath);
  if (action === "inventory") {
    const directory = relative(input.path, "path"), result = await context.files.list(directory, { recursive: true, maxEntries: 500 });
    return good({ path: directory, entries: result.entries, interpretation: "File inventory only. Analyze selected code paths; no code has been executed." });
  }
  if (action === "source-map") {
    const sourcePath = relative(input.path, "path"), read = await context.files.read(sourcePath, { maxBytes: 1048576 });
    const map = parse(read.content, sourcePath);
    if (map.version !== 3 || !Array.isArray(map.sources)) throw new StudioError("STUDIO_SOURCE_MAP_INVALID", "Expected a version 3 source map with sources.");
    const start = typeof input.offset === "number" ? input.offset : 0;
    if (!Number.isInteger(start) || start < 0) throw new StudioError("STUDIO_INPUT_INVALID", "offset must be a nonnegative integer.");
    const selected = map.sources.slice(start, start + 30).map((source, index) => {
      const content = Array.isArray(map.sourcesContent) ? map.sourcesContent[start + index] : undefined;
      return { index: start + index, source, ...(typeof content === "string" ? { bytes: Buffer.byteLength(content), sha256: digest(content), excerpt: content.slice(0, 2000), complete: content.length <= 2000 } : { missing: "sourcesContent absent for this entry" }) };
    });
    return good({ path: sourcePath, sha256: digest(read.content), sources: selected, total: map.sources.length, ...(start + 30 < map.sources.length ? { nextOffset: start + 30 } : {}), sourceNamesAreUntrusted: true });
  }
  if (action !== "record") throw new StudioError("STUDIO_ACTION_INVALID", "Use record, inventory or source-map.");
  const id = identifier(input.id, "id"), source = object(input.source, "source");
  text(source.kind, "source.kind", 80); text(source.locator, "source.locator", 2000);
  text(source.usage, "source.usage", 2000);
  const record: ObjectValue = { schemaVersion: 1, id, source, notes: input.notes ?? "", recordedAt: new Date().toISOString(), attribution: "caller-supplied source metadata" };
  if (input.path !== undefined) {
    const sourcePath = relative(input.path, "path"), read = await context.files.read(sourcePath, { encoding: "base64", maxBytes: 1048576 });
    record.file = { path: sourcePath, sha256: digest(Buffer.from(read.content, "base64")), bytes: read.bytes };
  }
  const destination = file(root, `docs/product/references/${id}.json`);
  await context.files.write(destination, JSON.stringify(record, null, 2) + "\n", { overwrite: false });
  return good({ path: destination, reference: record });
}
