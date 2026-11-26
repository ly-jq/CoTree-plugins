import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { copyFile, cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import archiver from "archiver";
import { computePluginPackageDigest, validatePluginManifest } from "@cotree/agent-plugins";
import { createManifest } from "../src/manifest.js";

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(pluginRoot, "../..");

export async function buildExternalCliPlugin(options: { stageDir?: string } = {}) {
  const artifacts = path.join(pluginRoot, "artifacts");
  await mkdir(artifacts, { recursive: true });
  const stageOnly = Boolean(options.stageDir);
  const release = stageOnly ? undefined : await mkdtemp(path.join(artifacts, "build-"));
  const packageDir = options.stageDir ? path.resolve(options.stageDir) : path.join(release!, "package");
  await mkdir(path.join(packageDir, "dist"), { recursive: true });
  await mkdir(path.join(packageDir, "ui"), { recursive: true });

  const nodeAlias = {
    "@cotree/plugin-sdk": path.join(repoRoot, "packages/plugin-sdk/src/index.ts"),
    "@cotree/plugin-sdk/service": path.join(repoRoot, "packages/plugin-sdk/src/service.ts")
  };

  for (const entry of ["index", "service"]) {
    const bundled = await build({
      entryPoints: [path.join(pluginRoot, `src/${entry}.ts`)],
      outfile: path.join(packageDir, `dist/${entry}.mjs`),
      write: false,
      bundle: true,
      format: "esm",
      platform: "node",
      target: "node22",
      alias: nodeAlias,
      legalComments: "none"
    });
    await Promise.all(bundled.outputFiles.map((file) => writeFile(file.path, file.contents)));
  }

  const browserPlugins = [
    {
      name: "sdk-theme",
      setup(builder: import("esbuild").PluginBuild) {
        builder.onResolve({ filter: /^@cotree\/plugin-sdk\/theme\.css$/ }, () => ({
          path: path.join(repoRoot, "packages/plugin-sdk/theme.css")
        }));
      }
    }
  ];

  const browserAlias = {
    "@cotree/plugin-sdk": path.join(repoRoot, "packages/plugin-sdk/src/index.ts"),
    "@cotree/plugin-sdk/ui": path.join(repoRoot, "packages/plugin-sdk/src/ui.ts")
  };

  for (const uiEntry of ["app", "transcript"]) {
    const uiBundled = await build({
      entryPoints: [path.join(pluginRoot, `ui/${uiEntry}.ts`)],
      outfile: path.join(packageDir, `ui/${uiEntry}.js`),
      write: false,
      bundle: true,
      format: "esm",
      platform: "browser",
      target: "chrome128",
      alias: browserAlias,
      plugins: browserPlugins,
      legalComments: "none"
    });
    await Promise.all(uiBundled.outputFiles.map((file) => writeFile(file.path, file.contents)));
  }

  await copyFile(path.join(pluginRoot, "ui/index.html"), path.join(packageDir, "ui/index.html"));
  await copyFile(path.join(pluginRoot, "ui/transcript.html"), path.join(packageDir, "ui/transcript.html"));

  for (const folder of ["skills", "assets", "evals"]) {
    await cp(path.join(pluginRoot, folder), path.join(packageDir, folder), { recursive: true });
  }
  await copyFile(path.join(pluginRoot, "README.md"), path.join(packageDir, "README.md"));

  const manifest = createManifest();
  let validation = validatePluginManifest(manifest);
  if (!validation.ok || !validation.manifest) {
    throw new Error(`Manifest validation failed:\n${JSON.stringify(validation.issues, null, 2)}`);
  }
  const manifestPath = path.join(packageDir, "plugin.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  manifest.integrity.digest = computePluginPackageDigest(packageDir, validation.manifest).digest;
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  validation = validatePluginManifest(manifest);
  if (!validation.ok || !validation.manifest || computePluginPackageDigest(packageDir, validation.manifest).digest !== manifest.integrity.digest) {
    throw new Error("Finalized package integrity validation failed.");
  }

  let archivePath: string | undefined;
  let sha256: string | undefined;
  if (!stageOnly && release) {
    archivePath = path.join(release, `${manifest.id}-${manifest.version}.zip`);
    await new Promise<void>((resolve, reject) => {
      const output = createWriteStream(archivePath!, { flags: "wx" });
      const archive = archiver("zip", { zlib: { level: 9 } });
      output.once("close", resolve);
      output.once("error", reject);
      archive.once("error", reject);
      archive.once("warning", reject);
      archive.pipe(output);
      archive.directory(packageDir, false);
      void archive.finalize().catch(reject);
    });
    sha256 = createHash("sha256").update(await readFile(archivePath)).digest("hex");
    await writeFile(`${archivePath}.sha256`, `${sha256}  ${path.basename(archivePath)}\n`);
  }

  const report = {
    pluginId: manifest.id,
    version: manifest.version,
    packageDir,
    ...(archivePath ? { archivePath } : {}),
    ...(sha256 ? { sha256 } : {}),
    digest: manifest.integrity.digest,
    tools: manifest.tools.length,
    skills: manifest.skills.length,
    agents: manifest.agents.length,
    views: manifest.ui.views.length,
    publisherSigned: false,
    trust: "Host exact-digest trust is required for local plugin code.",
    warnings: validation.issues
  };
  if (!stageOnly) {
    await writeFile(path.join(artifacts, "build-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  }
  return report;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const stageIdx = process.argv.indexOf("--stage-dir");
  const stageDir = stageIdx >= 0 ? process.argv[stageIdx + 1] : undefined;
  console.log(JSON.stringify(await buildExternalCliPlugin({ ...(stageDir ? { stageDir } : {}) }), null, 2));
}
