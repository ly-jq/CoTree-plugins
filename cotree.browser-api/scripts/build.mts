import { createWriteStream } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import archiver from "archiver";
import { computePluginPackageDigest, validatePluginManifest } from "@cotree/agent-plugins";

const source = fileURLToPath(new URL("../", import.meta.url));
const root = path.resolve(source, "../..");
const artifacts = path.join(root, ".cotree/artifacts/browser-api-plugin");
// A fresh directory makes package contents deterministic without deleting existing artifacts.
const stageIndex = process.argv.indexOf("--stage-dir");
if (stageIndex >= 0 && !process.argv[stageIndex + 1]) throw new Error("--stage-dir requires a directory");
const stageOnly = stageIndex >= 0;
const directory = stageOnly ? path.resolve(process.argv[stageIndex + 1]!) : path.join(artifacts, `build-${Date.now()}`);
await mkdir(path.join(directory, "ui"), { recursive: true });
await mkdir(path.join(directory, "evals"), { recursive: true });
await mkdir(path.join(directory, "skills/browser-demonstration"), { recursive: true });
const bundled = await build({ entryPoints: [path.join(source, "ui/app.ts")], outfile: path.join(directory, "ui/app.js"), write: false, bundle: true, platform: "browser", format: "esm", target: "chrome128",
  plugins: [{ name: "sdk-theme", setup(builder) { builder.onResolve({ filter: /^@cotree\/plugin-sdk\/theme.css$/ }, () => ({ path: path.join(root, "packages/plugin-sdk/theme.css") })); } }] });
// Publish through the Node build host, which owns this staging directory.
// Some Windows installations deny writes from the pnpm-linked native compiler.
await Promise.all(bundled.outputFiles.map(file => writeFile(file.path, file.contents)));
await Promise.all(["ui/index.html", "index.mjs", "service.mjs", "workflow.mjs", "README.md", "evals/tool-smoke.json", "skills/browser-demonstration/SKILL.md"].map(file => copyFile(path.join(source, file), path.join(directory, file))));
const manifest = JSON.parse(await readFile(path.join(source, "plugin.json"), "utf8"));
manifest.integrity = { algorithm: "sha256", digest: "0".repeat(64) };
const manifestPath = path.join(directory, "plugin.json");
await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
let checked = validatePluginManifest(manifest);
if (!checked.ok || !checked.manifest) throw new Error(JSON.stringify(checked.issues));
manifest.integrity.digest = computePluginPackageDigest(directory, checked.manifest).digest;
await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
checked = validatePluginManifest(manifest);
if (!checked.ok || !checked.manifest || computePluginPackageDigest(directory, checked.manifest).digest !== manifest.integrity.digest) throw new Error("Invalid finalized package digest");
const archivePath = `${directory}.zip`;
if (!stageOnly) {
await new Promise<void>((resolve, reject) => {
  const stream = createWriteStream(archivePath, { flags: "wx" });
  const archive = archiver("zip", { zlib: { level: 9 } });
  stream.once("close", resolve); stream.once("error", reject); archive.once("error", reject);
  archive.pipe(stream); archive.directory(directory, false); void archive.finalize().catch(reject);
});
await writeFile(path.join(artifacts, "latest.json"), JSON.stringify({ directory, archivePath, digest: manifest.integrity.digest }, null, 2));
}
console.log(JSON.stringify({ directory, ...(stageOnly ? {} : { archivePath }), digest: manifest.integrity.digest }));
