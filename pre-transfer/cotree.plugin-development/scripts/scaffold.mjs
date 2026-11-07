import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
const values = {};
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) {
  if (!["--output", "--id", "--name", "--kind"].includes(args[i]) || !args[i + 1] || values[args[i]]) throw new Error("Expected --output <new directory> --id <plugin.id> --name <name> --kind skill|tool");
  values[args[i]] = args[i + 1];
}
const id = values["--id"], name = values["--name"], kind = values["--kind"] ?? "tool";
if (!id || !/^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/.test(id) || !name?.trim() || !values["--output"] || !["skill", "tool"].includes(kind)) throw new Error("Invalid plugin identity, output or kind");
const output = path.resolve(values["--output"]);
if (existsSync(output)) throw new Error("Refusing to overwrite an existing path");
const manifest = { manifestVersion: 3, id, name, version: "0.1.0", description: name + " starter", minKernelVersion: "0.1.0", entry: kind === "tool" ? "index.mjs" : "README.md", capabilities: { [kind === "tool" ? "tools" : "skills"]: true }, permissions: { shell: "none", browser: "none" } };
if (kind === "tool") {
  manifest.execution = { runtime: "node", abi: "cotree.plugin.tool.v2", isolation: "brokered-process" };
  manifest.tools = [{ name: "echo", description: "Echo supplied JSON without external effects", inputSchema: { type: "object", additionalProperties: true }, riskLevel: "low", idempotent: true }];
} else manifest.skills = [{ name: id + ".inspect", description: "Inspect a supplied task and report observed facts", path: "skills/inspect/SKILL.md" }];
mkdirSync(output, { recursive: true });
writeFileSync(path.join(output, "plugin.json"), JSON.stringify(manifest, null, 2) + "\n");
writeFileSync(path.join(output, "README.md"), "# " + name + "\n\nMinimal CoTree starter. Replace the example with the requested workflow and verify through the native host before delivery.\n");
if (kind === "tool") writeFileSync(path.join(output, "index.mjs"), "export default { tools: { echo(input) { return { ok: true, output: input }; } } };\n");
else { mkdirSync(path.join(output, "skills/inspect"), { recursive: true }); writeFileSync(path.join(output, "skills/inspect/SKILL.md"), "---\nname: " + id + ".inspect\ndescription: Inspect a supplied task and report observed facts\n---\n\nRead the supplied inputs, separate facts from assumptions, and report evidence relevant to the task.\n"); }
console.log(JSON.stringify({ id, output, kind, installed: false }));
