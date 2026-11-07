import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Only reads local files; does not install, start servers, or access the network.
const directory = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
assert.ok(args.length === 0 || (args.length === 2 && args[0] === "--platform"),
  "Usage: node verify.mjs [--platform windows-x64|linux-x64|linux-arm64]");
const platform = args[1];
const manifest = JSON.parse(await readFile(path.join(directory, "manifest.json"), "utf8"));
assert.equal(manifest.schemaVersion, 1);
assert.ok(!platform || manifest.platforms.includes(platform), "Unknown platform");
const artifacts = manifest.artifacts.filter(item => !platform || !item.target || item.target === platform);
assert.ok(artifacts.length > 0, "Empty artifact manifest");
let bytes = 0;
for (const item of artifacts) {
  assert.match(item.sha256, /^[a-f0-9]{64}$/);
  const file = path.resolve(directory, item.file);
  const relative = path.relative(directory, file);
  assert.ok(relative && !path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`), "Invalid artifact path");
  assert.equal((await stat(file)).size, item.size, `Size mismatch: ${item.file}`);
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  assert.equal(hash.digest("hex"), item.sha256, `SHA-256 mismatch: ${item.file}`);
  bytes += item.size;
  console.log(`OK ${item.file}`);
}
console.log(JSON.stringify({ ok: true, platform: platform ?? "all", artifacts: artifacts.length, bytes }));
