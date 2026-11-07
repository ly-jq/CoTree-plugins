import { createHash } from "node:crypto";
import { readFileSync, lstatSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const resources = ["predictions:structure-and-binding", "predictions:adme", "small-molecule:library-screen", "small-molecule:design", "protein:library-screen", "protein:design"];
function identity(resource, runName, outputRoot) {
  if (!resources.includes(resource)) throw new Error("Choose an explicit supported Boltz resource");
  if (typeof runName !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(runName)) throw new Error("Invalid run name / idempotency key");
  if (typeof outputRoot !== "string" || !path.isAbsolute(outputRoot)) throw new Error("Use an absolute output root");
  return path.resolve(outputRoot);
}
function payloadDigest(payload) {
  if (typeof payload !== "string" || !path.isAbsolute(payload)) throw new Error("Use an absolute JSON payload path");
  const stat = lstatSync(payload);
  if (stat.isSymbolicLink() || !stat.isFile() || stat.size > 2097152) throw new Error("Payload must be a regular JSON file up to 2 MiB");
  const bytes = readFileSync(payload), data = JSON.parse(bytes.toString("utf8"));
  if (!data || typeof data !== "object" || Array.isArray(data) || !Object.keys(data).length) throw new Error("Payload must be a nonempty API request object");
  return createHash("sha256").update(bytes).digest("hex");
}
export function prepareJob({ resource, payload, runName, outputRoot }) {
  const root = identity(resource, runName, outputRoot), sha256 = payloadDigest(payload);
  const input = ["--input", `@json://${path.resolve(payload)}`];
  return { schemaVersion: 1, resource, runName, outputRoot: root, payload: path.resolve(payload), payloadSha256: sha256, remoteSubmitted: false,
    commands: { estimateCost: ["boltz-api", resource, "estimate-cost", ...input], start: ["boltz-api", resource, "start", "--idempotency-key", runName, ...input, "--format", "json"], localStatus: ["boltz-api", "--format", "json", "download-status", "--name", runName, "--root-dir", root] },
    next: "Check current CLI help and payload schema, inspect a real cost estimate and current user authorization, then verify this payload digest immediately before any submission. This plan does not submit a job." };
}
export function verifyJob(plan) {
  if (!plan || plan.schemaVersion !== 1 || plan.remoteSubmitted !== false) throw new Error("Expected an unsubmitted local job plan");
  const fresh = prepareJob(plan);
  if (fresh.payloadSha256 !== plan.payloadSha256 || JSON.stringify(fresh.commands) !== JSON.stringify(plan.commands)) throw new Error("Payload or commands changed; prepare and review a new plan before submission");
  return { verified: true, payloadSha256: fresh.payloadSha256, remoteSubmitted: false };
}
export function resumeJob({ resource, id, runName, outputRoot }) {
  const root = identity(resource, runName, outputRoot);
  if (typeof id !== "string" || !/^[A-Za-z][A-Za-z0-9_-]{1,159}$/.test(id)) throw new Error("A concrete returned Boltz job ID is required");
  return { resource, id, runName, outputRoot: root, remoteSubmitted: false,
    commands: { retrieve: ["boltz-api", resource, "retrieve", "--id", id, "--format", "json"], localStatus: ["boltz-api", "--format", "json", "download-status", "--name", runName, "--root-dir", root], download: ["boltz-api", "download-results", "--id", id, "--name", runName, "--root-dir", root] },
    next: "Verify the remote ID/resource and original checkpoint, then resume with the same directory. Inspect current CLI support for this resource; do not resubmit to recover an interrupted download." };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [mode, input, output, ...extra] = process.argv.slice(2);
    if (!input || extra.length || !["prepare", "verify", "resume"].includes(mode) || (mode === "verify" && output)) throw new Error("Usage: node scripts/boltz-job.mjs prepare|resume INPUT.json [NEW_OUTPUT.json], or verify PLAN.json");
    if (lstatSync(input).size > 2097152) throw new Error("Input exceeds 2 MiB");
    const data = JSON.parse(readFileSync(input, "utf8"));
    const result = mode === "prepare" ? prepareJob(data) : mode === "verify" ? verifyJob(data) : resumeJob(data);
    const text = JSON.stringify(result, null, 2) + "\n";
    if (output) writeFileSync(output, text, { flag: "wx" }); else process.stdout.write(text);
  } catch (error) { console.error(error instanceof Error ? error.message : "Job planning failed without an Error object; inspect the invocation"); process.exitCode = 1; }
}
