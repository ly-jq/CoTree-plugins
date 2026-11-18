import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { cp, mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import archiver from "archiver";
import { computePluginPackageDigest, validatePluginManifest } from "@cotree/agent-plugins";
import { createManifest } from "../src/manifest.js";

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(pluginRoot, "../..");
export async function buildAppStudio() {
  const artifacts = path.join(pluginRoot, "artifacts");
  await mkdir(artifacts, { recursive: true });
  // Each build owns a new directory. Never remove a caller-supplied directory.
  const release = await mkdtemp(path.join(artifacts, "build-"));
  const packageDir = path.join(release, "package");
  await mkdir(packageDir);
  const templates: Record<string, string> = {};
  async function collect(directory: string, prefix = "") {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const key = prefix + entry.name;
      if (entry.isDirectory()) await collect(path.join(directory, entry.name), key + "/");
      else if (entry.isFile()) templates[key] = await readFile(path.join(directory, entry.name), "utf8");
      else throw new Error(`Unsupported template entry: ${key}`);
    }
  }
  await collect(path.join(pluginRoot, "templates/web-app"));
  const alias = Object.fromEntries(["", "/service"].map(suffix => [`@cotree/plugin-sdk${suffix}`, path.join(repoRoot, "packages/plugin-sdk/src", (suffix.slice(1) || "index") + ".ts")]));
  for (const entry of ["index", "service"]) await build({ entryPoints: [path.join(pluginRoot, `src/${entry}.ts`)], outfile: path.join(packageDir, `dist/${entry}.mjs`),
    bundle: true, format: "esm", platform: "node", target: "node22", alias,
    define: { APP_STUDIO_TEMPLATES: JSON.stringify(templates) }, legalComments: "none" });
  for (const folder of ["skills", "references", "templates", "assets", "evals"]) await cp(path.join(pluginRoot, folder), path.join(packageDir, folder), { recursive: true });
  await cp(path.join(pluginRoot, "README.md"), path.join(packageDir, "README.md"));
  const manifest = createManifest();
  let validation = validatePluginManifest(manifest);
  if (!validation.ok) throw new Error(JSON.stringify(validation.issues, null, 2));
  const manifestPath = path.join(packageDir, "plugin.json");
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  manifest.integrity.digest = computePluginPackageDigest(packageDir, validation.manifest!).digest;
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  validation = validatePluginManifest(manifest);
  if (!validation.ok || computePluginPackageDigest(packageDir, validation.manifest!).digest !== manifest.integrity.digest) throw new Error("Package integrity validation failed.");
  const archivePath = path.join(release, `${manifest.id}-${manifest.version}.zip`);
  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(archivePath, { flags: "wx" });
    const archive = archiver("zip", { zlib: { level: 9 } });
    output.once("close", resolve); output.once("error", reject); archive.once("error", reject); archive.once("warning", reject);
    archive.pipe(output); archive.directory(packageDir, false); void archive.finalize().catch(reject);
  });
  const sha256 = createHash("sha256").update(await readFile(archivePath)).digest("hex");
  await writeFile(`${archivePath}.sha256`, `${sha256}  ${path.basename(archivePath)}\n`);
  const report = { pluginId: manifest.id, version: manifest.version, packageDir, archivePath, sha256, digest: manifest.integrity.digest,
    tools: manifest.tools.length, skills: manifest.skills.length, agents: manifest.agents.length,
    publisherSigned: false, trust: "Host exact-digest trust is required for local plugin code.", warnings: validation.issues };
  await writeFile(path.join(artifacts, "build-report.json"), JSON.stringify(report, null, 2) + "\n");
  return report;
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) console.log(JSON.stringify(await buildAppStudio(), null, 2));
