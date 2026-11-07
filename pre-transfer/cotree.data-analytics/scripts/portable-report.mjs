import { readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildPortableArtifact } from "../runtime/portable-builder.mjs";

export function createReport(input, output) {
  if (!statSync(input).isFile() || statSync(input).size > 3_000_000) throw new Error("Input must be a JSON file of at most 3 MB");
  const html = buildPortableArtifact(JSON.parse(readFileSync(input, "utf8")));
  // Explicit new destination only. Do not overwrite a prior report or follow an existing symlink.
  writeFileSync(output, html, { encoding: "utf8", flag: "wx" });
  return { output: path.resolve(output), readOnly: true, offline: true, bytes: Buffer.byteLength(html), rendered: false };
}
export function main(args) {
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!["--input", "--output"].includes(args[i]) || !args[i + 1] || Object.hasOwn(options, args[i])) throw new Error("Usage: --input artifact.json --output new-report.html");
    options[args[i]] = args[i + 1];
  }
  if (!options["--input"] || !options["--output"]) throw new Error("Input and output are required");
  return createReport(options["--input"], options["--output"]);
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { process.stdout.write(JSON.stringify(main(process.argv.slice(2))) + "\n"); }
  catch (error) { process.stderr.write(error.message + "\n"); process.exitCode = 1; }
}
