import { readFileSync } from "node:fs";
const args = process.argv.slice(2);
if (args.length !== 1) throw new Error("Usage: summarize.mjs <results.json>");
const text = readFileSync(args[0], "utf8");
if (Buffer.byteLength(text) > 8 * 1024 * 1024) throw new Error("Input is too large");
const data = JSON.parse(text);
if (!Array.isArray(data.runs) || data.runs.length > 10000) throw new Error("Expected bounded runs array");
const groups = new Map();
for (const run of data.runs) {
  if (typeof run.scenario !== "string" || !run.scenario.trim() || typeof run.variant !== "string" || !run.variant.trim() || !["passed", "failed", "not-run"].includes(run.status)) throw new Error("Invalid scenario, variant or status");
  if (!Array.isArray(run.checks) || run.checks.some(c => typeof c.name !== "string" || typeof c.passed !== "boolean" || typeof c.evidence !== "string" || !c.evidence.trim())) throw new Error("Checks require observed evidence");
  if (run.status === "passed" && (!run.checks.length || run.checks.some(c => !c.passed))) throw new Error("Passed runs need successful evidenced checks");
  if (run.status === "not-run" && (!run.reason?.trim() || run.checks.length || run.tokens !== undefined || run.elapsedMs !== undefined)) throw new Error("Unexecuted scenarios need a reason and cannot carry measured results");
  for (const key of ["tokens", "elapsedMs"]) if (run[key] !== undefined && (!Number.isFinite(run[key]) || run[key] < 0)) throw new Error("Invalid measured usage");
  const key = JSON.stringify([run.scenario, run.variant]);
  groups.set(key, [...(groups.get(key) ?? []), run]);
}
const metric = (runs, key) => { const values = runs.filter(r => r[key] !== undefined).map(r => r[key]); if (!values.length) return { samples: 0, mean: null, variance: null }; const mean = values.reduce((a,b) => a+b,0)/values.length; return { samples: values.length, mean, variance: values.reduce((sum,x) => sum+(x-mean)**2,0)/values.length }; };
console.log(JSON.stringify({ scope: "provided-records-only", independentlyVerified: false, groups: [...groups].map(([key,runs]) => { const [scenario,variant]=JSON.parse(key); return { scenario, variant, runs:runs.length, passed:runs.filter(r=>r.status==="passed").length, failed:runs.filter(r=>r.status==="failed").length, notRun:runs.filter(r=>r.status==="not-run").length, tokens:metric(runs,"tokens"), elapsedMs:metric(runs,"elapsedMs") }; }) }, null, 2));
