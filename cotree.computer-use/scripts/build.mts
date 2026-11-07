import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import archiver from "archiver";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { packageCuaSdk } from "../../../integrations/cua/package-sdk.mjs";
import { computePluginPackageDigest, validatePluginManifest, createPluginInstallGateReport, createPluginEvalGateReport, type PluginRegistryEntry } from "@cotree/agent-plugins";

const source = fileURLToPath(new URL("../", import.meta.url));
const root = path.resolve(source, "../..");
const sdkRoot = process.env.COTREE_CUA_SDK_ROOT || path.join(root, ".cotree", "artifacts", "cua", "sdk");
const platform = process.env.COTREE_PACKAGE_PLATFORM || process.platform;
const arch = process.env.COTREE_PACKAGE_ARCH || process.arch;
const sdkIdentity = JSON.parse(await readFile(path.join(sdkRoot, "build-identity.json"), "utf8"));
const pinned = JSON.parse(await readFile(path.join(root, "integrations/cua/upstream.json"), "utf8"));
if (sdkIdentity.platform !== platform || sdkIdentity.arch !== arch ||
    sdkIdentity.upstream !== pinned.revision || sdkIdentity.patchSha256 !== pinned.patchSha256) {
  throw new Error(`Cua SDK identity does not match current source and target ${platform}-${arch}. Rebuild the target SDK.`);
}
for (const entry of sdkIdentity.files) {
  if (path.isAbsolute(entry.path) || entry.path.split(/[\\/]/).includes("..")) throw new Error("Unsafe Cua SDK identity path");
  const digest = createHash("sha256").update(await readFile(path.join(sdkRoot, entry.path))).digest("hex");
  if (digest !== entry.sha256) throw new Error(`Cua SDK input changed: ${entry.path}`);
}
const stageArg = process.argv.indexOf("--stage-dir");
const output = stageArg >= 0 ? path.resolve(process.argv[stageArg + 1]!) : path.join(root, ".cotree", "artifacts", "computer-use", `build-${Date.now()}`);
await mkdir(output, { recursive: true });
if ((await readdir(output)).length) throw new Error("Stage directory must be empty to prevent stale native artifacts.");
// Fewer runtime files reduce live integrity-scan overhead on slow hosts. The
// package digest and per-call authority checks still cover every shipped file.
await packageCuaSdk(sdkRoot, path.join(output, "cua"));
await cp(path.join(source, "index.mjs"), path.join(output, "index.mjs"));
await cp(path.join(source, "README.md"), path.join(output, "README.md"));
await cp(path.join(source, "evals"), path.join(output, "evals"), { recursive: true });
await cp(path.join(source, "skills"), path.join(output, "skills"), { recursive: true });
await build({ entryPoints: [path.join(source, "src", "service.ts")], outfile: path.join(output, "service.mjs"),
  bundle: true, format: "esm", platform: "node", target: "node22", sourcemap: false, legalComments: "inline" });
const files: string[] = [];
async function walk(dir: string): Promise<void> { for (const entry of await readdir(dir, { withFileTypes: true })) {
  const file = path.join(dir, entry.name); if (entry.isDirectory()) await walk(file); else files.push(file);
} }
await walk(path.join(output, "cua"));
const addons = files.filter(file => file.endsWith(".node"));
const libraries = files.filter(file => /cua_driver_sdk\.(dll|so|dylib)$/.test(file));
if (addons.length !== 1 || libraries.length !== 1) throw new Error("The SDK stage must contain exactly one matching native module and Driver library.");
if (platform === "linux") {
  const machine = arch === "x64" ? 0x3e : arch === "arm64" ? 0xb7 : undefined;
  if (!machine) throw new Error(`Unsupported Linux Cua architecture: ${arch}`);
  for (const file of [...addons, ...libraries]) {
    const bytes = await readFile(file);
    if (bytes.length < 20 || bytes.readUInt32BE(0) !== 0x7f454c46 || bytes[4] !== 2 || bytes[5] !== 1 || bytes.readUInt16LE(18) !== machine) {
      throw new Error(`Cua native file does not match Linux ${arch}: ${file}`);
    }
  }
}
const manifest = JSON.parse(await readFile(path.join(source, "plugin.template.json"), "utf8"));
const declaration = async (file: string, id: string) => ({ id, path: path.relative(output, file).split(path.sep).join("/"),
  platform, arch, sha256: createHash("sha256").update(await readFile(file)).digest("hex") });
manifest.nativeModules = [{ ...await declaration(addons[0]!, "cua-runtime"), napiVersion: 8 }];
manifest.nativeLibraries = [await declaration(libraries[0]!, "cua-sdk")];
manifest.integrity = { algorithm: "sha256", digest: "0".repeat(64) };
const manifestPath = path.join(output, "plugin.json");
await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
let validated = validatePluginManifest(manifest);
if (!validated.ok || !validated.manifest) throw new Error(JSON.stringify(validated.issues));
manifest.integrity.digest = computePluginPackageDigest(output, validated.manifest).digest;
await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
validated = validatePluginManifest(manifest);
if (!validated.ok || !validated.manifest || computePluginPackageDigest(output, validated.manifest).digest !== manifest.integrity.digest) throw new Error("Final Computer Use integrity check failed.");
// The ZIP must pass the same non-executing install/eval gates as Desktop's
// activation preview. Package integrity alone does not make it activatable.
const entry: PluginRegistryEntry = { scope: "staging", rootDir: output, manifestPath,
  pluginId: manifest.id, version: manifest.version, active: false, validation: validated };
const installGate = createPluginInstallGateReport(entry);
const evalGate = createPluginEvalGateReport(entry);
if (!installGate.installAllowed || !evalGate.evalAllowed || evalGate.caseCount === 0) {
  throw new Error(`Computer Use activation content gates failed: ${JSON.stringify([...installGate.issues, ...evalGate.issues])}`);
}
console.log(JSON.stringify({ directory: output, id: manifest.id, version: manifest.version, digest: manifest.integrity.digest }));
if (process.argv.includes("--archive")) {
  const archivePath = path.join(path.dirname(output), `cotree.computer-use-${manifest.version}-${platform}-${arch}-${manifest.integrity.digest.slice(0, 12)}.zip`);
  await new Promise<void>((resolve, reject) => {
    const target = createWriteStream(archivePath, { flags: "wx" });
    const archive = archiver("zip", { zlib: { level: 9 } });
    target.once("close", resolve); target.once("error", reject); archive.once("error", reject);
    archive.pipe(target); archive.directory(output, false); void archive.finalize().catch(reject);
  });
  console.log(JSON.stringify({ archivePath, sha256: createHash("sha256").update(await readFile(archivePath)).digest("hex") }));
}
