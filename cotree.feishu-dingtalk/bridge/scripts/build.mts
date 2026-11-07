import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import archiver from "archiver";
import { computePluginPackageDigest, validatePluginManifest } from "@cotree/agent-plugins";
import { toolDefinitions } from "../src/mcp.js";

const source = fileURLToPath(new URL("../", import.meta.url));
const pluginRoot = path.resolve(source, "..");
const root = path.resolve(pluginRoot, "../..");
const artifacts = path.join(root, ".cotree", "artifacts", "feishu-dingtalk-plugin");
const directory = path.join(artifacts, `build-${Date.now()}`);
await mkdir(path.join(directory, "dist"), { recursive: true });
const bundle = await build({ entryPoints: [path.join(source, "src/cli.ts")], outfile: path.join(directory, "dist/bridge.cjs"),
  platform: "node", format: "cjs", target: "node22", bundle: true, metafile: true, legalComments: "eof", external: ["bufferutil", "utf-8-validate"] });
await copyFile(path.join(pluginRoot, "README.md"), path.join(directory, "README.md"));
await mkdir(path.join(directory, "ui"), { recursive: true });
await Promise.all([
  build({ entryPoints: [path.join(source, "src/service.ts")], outfile: path.join(directory, "dist/service.mjs"), platform: "node", format: "esm", target: "node22", bundle: true }),
  build({ entryPoints: [path.join(source, "src/plugin.ts")], outfile: path.join(directory, "dist/plugin.mjs"), platform: "node", format: "esm", target: "node22", bundle: true }),
  build({ entryPoints: [path.join(source, "ui/app.ts")], outfile: path.join(directory, "ui/app.js"), platform: "browser", format: "esm", target: "es2022", bundle: true }),
  copyFile(path.join(source, "ui/index.html"), path.join(directory, "ui/index.html")),
  copyFile(path.join(source, "ui/style.css"), path.join(directory, "ui/style.css")),
  copyFile(path.join(root, "packages/plugin-sdk/theme.css"), path.join(directory, "ui/theme.css"))
]);
// Preserve third-party licenses for every package whose code entered the bundle.
const licenses: string[] = []; const visited = new Set<string>();
for (const input of Object.keys(bundle.metafile!.inputs)) {
  if (!input.includes("node_modules")) continue;
  let current = path.dirname(path.resolve(input));
  while (current !== path.dirname(current)) {
    try {
      const json = JSON.parse(await readFile(path.join(current, "package.json"), "utf8"));
      const identity = `${json.name}@${json.version}`;
      if (!visited.has(identity)) {
        visited.add(identity);
        const candidates = (await readdir(current)).filter(name => /^(license|licence|copying|notice)(\.|$)/i.test(name));
        licenses.push(`\n--- ${identity} (${json.license ?? "see license"}) ---\n`);
        for (const name of candidates) {
          try { licenses.push(await readFile(path.join(current, name), "utf8")); } catch { /* Some packages use a license directory. */ }
        }
      }
      break;
    } catch { current = path.dirname(current); }
  }
}
await writeFile(path.join(directory, "THIRD_PARTY_NOTICES.txt"), licenses.join("\n"));
const manifest = JSON.parse(await readFile(path.join(pluginRoot, "plugin.json"), "utf8"));
manifest.tools = toolDefinitions.map(tool => ({ name: tool.name, description: tool.description, inputSchema: tool.inputSchema,
  outputSchema: { type: "object" }, riskLevel: "readOnlyHint" in (tool.annotations ?? {}) ? "low" : "medium",
  idempotent: ["messaging_status", "messaging_workspaces", "messaging_start", "messaging_stop"].includes(tool.name), timeoutMs: 60000, requiresApproval: false }));
manifest.integrity = { algorithm: "sha256", digest: "0".repeat(64) };
const manifestPath = path.join(directory, "plugin.json");
await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
let validation = validatePluginManifest(manifest);
if (!validation.ok || !validation.manifest) throw new Error(JSON.stringify(validation.issues));
manifest.integrity.digest = computePluginPackageDigest(directory, validation.manifest).digest;
await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
validation = validatePluginManifest(manifest);
if (!validation.ok || !validation.manifest || computePluginPackageDigest(directory, validation.manifest).digest !== manifest.integrity.digest) throw new Error("Package integrity validation failed");
const archivePath = path.join(artifacts, `cotree.feishu-dingtalk-${manifest.version}-${path.basename(directory)}.zip`);
await new Promise<void>((resolve, reject) => {
  const output = createWriteStream(archivePath, { flags: "wx" }), archive = archiver("zip", { zlib: { level: 9 } });
  output.on("close", resolve); output.on("error", reject); archive.on("error", reject);
  archive.pipe(output); archive.directory(directory, false); void archive.finalize().catch(reject);
});
const sha = createHash("sha256"); for await (const chunk of createReadStream(archivePath)) sha.update(chunk);
const sha256 = sha.digest("hex");
await writeFile(`${archivePath}.sha256`, `${sha256}  ${path.basename(archivePath)}\n`);
const report = { directory, archivePath, sha256, digest: manifest.integrity.digest, runtime: "Node.js >=22.13.0", platforms: ["feishu", "dingtalk"] };
await writeFile(path.join(artifacts, "latest.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
