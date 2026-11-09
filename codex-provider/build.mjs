import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, copyFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import archiver from "archiver";
import { build } from "esbuild";

const root = path.dirname(fileURLToPath(import.meta.url));
const { values } = parseArgs({ options: { archive: { type: "boolean" }, "output-dir": { type: "string" } } });
const destination = values["output-dir"] ? path.resolve(values["output-dir"]) : root;
const output = path.join(destination, "package");
const manifest = JSON.parse(await readFile(path.join(root, "plugin.json"), "utf8"));
const metadata = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
if (metadata.version !== manifest.version) throw new Error("Package and plugin versions must match.");
await mkdir(path.join(output, "dist"), { recursive: true });
await build({ entryPoints: [path.join(root, "src/service.ts")], outfile: path.join(output, "dist/service.mjs"),
  bundle: true, platform: "node", format: "esm", target: "node22", tsconfigRaw: {}, sourcemap: false,
  nodePaths: process.env.NODE_PATH?.split(path.delimiter).filter(Boolean) });
await copyFile(path.join(root, "plugin.json"), path.join(output, "plugin.json"));
await copyFile(path.join(root, "README.md"), path.join(output, "README.md"));
process.stdout.write(`Provider package: ${output}\n`);

if (values.archive) {
  const releases = path.join(destination, "releases");
  await mkdir(releases, { recursive: true });
  const archivePath = path.join(releases, `${manifest.id}-${manifest.version}.zip`);
  await new Promise((resolve, reject) => {
    const stream = createWriteStream(archivePath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    stream.once("close", resolve);
    stream.once("error", reject);
    archive.once("error", reject);
    archive.once("warning", reject);
    archive.pipe(stream);
    // An explicit file list excludes source, node_modules, user files and previous releases.
    for (const name of ["plugin.json", "README.md", "dist/service.mjs"]) {
      archive.file(path.join(output, name), { name, date: new Date("1980-01-01T00:00:00Z"), mode: 0o644 });
    }
    void archive.finalize().catch(reject);
  });
  const digest = createHash("sha256").update(await readFile(archivePath)).digest("hex");
  await writeFile(`${archivePath}.sha256`, `${digest}  ${path.basename(archivePath)}\n`);
  process.stdout.write(`Provider archive: ${archivePath}\nSHA-256: ${digest}\n`);
}
