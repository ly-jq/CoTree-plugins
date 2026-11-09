import { execFileSync } from "node:child_process";
import { lstatSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const sdkVersion = "0.14.0";
const templates = ["tool", "service", "view", "task", "file-workbench", "batch-workbench", "workflow-workbench"];
const usage = "scaffold.mjs --output <new directory> --id <plugin.id> --name <name> --kind skill|tool|service|view|task|file-workbench|batch-workbench|workflow-workbench [--sdk <installed @cotree/plugin-sdk directory>]";

export function scaffold({ output, id, name, kind = "tool", sdk }) {
  if (typeof id !== "string" || !/^[a-z0-9][a-z0-9._-]{1,80}$/.test(id)
    || typeof name !== "string" || !name.trim() || typeof output !== "string" || !output.trim()
    || !["skill", ...templates].includes(kind) || (sdk !== undefined && (typeof sdk !== "string" || !sdk.trim()))) {
    throw new Error("Invalid plugin identity, output, kind or SDK directory");
  }
  output = path.resolve(output);
  try {
    lstatSync(output);
    throw new Error("Refusing to overwrite an existing path");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (kind === "skill") {
    if (sdk !== undefined) throw new Error("A declarative Skill does not need --sdk");
    const manifest = { manifestVersion: 3, id, name: name.trim(), version: "0.1.0", description: name.trim() + " starter",
      minKernelVersion: "0.1.0", entry: "README.md", capabilities: { skills: true }, permissions: { shell: "none", browser: "none" },
      skills: [{ name: id + ".inspect", description: "Inspect a supplied task and report observed facts", path: "skills/inspect/SKILL.md" }] };
    mkdirSync(path.dirname(output), { recursive: true });
    mkdirSync(output);
    writeJson(path.join(output, "plugin.json"), manifest, "wx");
    writeFileSync(path.join(output, "README.md"), "# " + name.trim() + "\n\nDeclarative CoTree Skill starter. Manifest v3 remains supported; no SDK code runs. Replace the example and validate in an isolated workspace.\n", { flag: "wx" });
    mkdirSync(path.join(output, "skills/inspect"), { recursive: true });
    writeFileSync(path.join(output, "skills/inspect/SKILL.md"), "---\nname: " + id + ".inspect\ndescription: Inspect a supplied task and report observed facts\n---\n\nRead the supplied inputs, separate facts from assumptions, and report evidence relevant to the task.\n", { flag: "wx" });
    return { id, output, kind, installed: false, dependenciesInstalled: false };
  }

  // Use the public SDK's one initializer; do not copy its templates or execution clients.
  let sdkRoot;
  if (sdk !== undefined) sdkRoot = path.resolve(sdk);
  else {
    try {
      const require = createRequire(path.join(process.cwd(), "package.json"));
      // The JS entries are import-only; the public CSS export resolves in either module mode.
      sdkRoot = path.dirname(require.resolve("@cotree/plugin-sdk/theme.css"));
    } catch {
      throw new Error("Install the public @cotree/plugin-sdk@" + sdkVersion + " package in the current project, or pass --sdk <installed SDK directory>. An SDK tarball can be used offline; this command does not download dependencies.");
    }
  }
  const sdkPackage = JSON.parse(readFileSync(path.join(sdkRoot, "package.json"), "utf8"));
  if (sdkPackage.name !== "@cotree/plugin-sdk" || sdkPackage.version !== sdkVersion
    || sdkPackage.bin?.["cotree-plugin-init"] !== "bin/init.mjs") {
    throw new Error("Expected the public @cotree/plugin-sdk@" + sdkVersion + " package with cotree-plugin-init");
  }
  const receipt = JSON.parse(execFileSync(process.execPath,
    [path.join(sdkRoot, "bin/init.mjs"), output, "--id", id, "--template", kind],
    { encoding: "utf8", windowsHide: true, timeout: 30000, maxBuffer: 1024 * 1024 }));
  const manifestFile = path.join(output, "plugin.json");
  const manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
  if (manifest.id !== id || manifest.manifestVersion !== 4 || manifest.sdk?.apiVersion !== 1 || receipt.sdkVersion !== sdkVersion) {
    throw new Error("SDK initializer returned an unexpected project contract; inspect the new directory before continuing");
  }
  manifest.name = name.trim();
  writeJson(manifestFile, manifest);
  return { ...receipt, id, output, kind, installed: false, dependenciesInstalled: false };
}

function writeJson(file, value, flag = "w") {
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n", { flag });
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const args = process.argv.slice(2), values = {};
    if (args.length === 1 && args[0] === "--help") console.log(usage);
    else {
      for (let index = 0; index < args.length; index += 2) {
        if (!["--output", "--id", "--name", "--kind", "--sdk"].includes(args[index])
          || !args[index + 1] || values[args[index].slice(2)] !== undefined) throw new Error(usage);
        values[args[index].slice(2)] = args[index + 1];
      }
      console.log(JSON.stringify(scaffold(values), null, 2));
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Plugin initialization failed");
    process.exitCode = 1;
  }
}
