import type { PluginToolContext } from "@cotree/plugin-sdk";
import { digest, file, good, parse, relative, type Json, type ObjectValue } from "./shared.js";

export function inspectContract(contract: ObjectValue, specification?: ObjectValue) {
  const issues: Array<{ code: string; path: string; message: string }> = [];
  const operations: Array<{ operationId: string; method: string; path: string }> = [];
  const add = (code: string, path: string, message: string) => issues.push({ code, path, message });
  if (typeof contract.openapi !== "string" || !contract.openapi.startsWith("3.")) add("OPENAPI_VERSION", "openapi", "Supply an OpenAPI 3 document.");
  const paths = contract.paths && typeof contract.paths === "object" && !Array.isArray(contract.paths) ? contract.paths : {};
  const ids = new Set<string>();
  for (const [route, entry] of Object.entries(paths)) {
    if (!route.startsWith("/")) add("PATH_INVALID", route, "API paths start with /.");
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) { add("PATH_ITEM_INVALID", route, "Path item must be an object."); continue; }
    for (const method of ["get", "post", "put", "patch", "delete", "head", "options", "trace"]) {
      const value = entry[method]; if (value === undefined) continue;
      if (!value || typeof value !== "object" || Array.isArray(value)) { add("OPERATION_INVALID", `${route}.${method}`, "Operation must be an object."); continue; }
      if (typeof value.operationId !== "string" || !value.operationId) add("OPERATION_ID_MISSING", `${route}.${method}`, "Use a stable operationId for consumer and scenario mapping.");
      else {
        if (ids.has(value.operationId)) add("OPERATION_ID_DUPLICATE", `${route}.${method}`, value.operationId);
        ids.add(value.operationId); operations.push({ operationId: value.operationId, method: method.toUpperCase(), path: route });
      }
      if (!value.responses || typeof value.responses !== "object" || !Object.keys(value.responses).length) add("RESPONSES_MISSING", `${route}.${method}`, "Define observed or designed responses, including relevant errors.");
    }
  }
  const visit = (value: Json, location: string, depth: number): void => {
    if (depth > 64) { add("DEPTH_LIMIT", location, "Narrow this deeply nested contract."); return; }
    if (!value || typeof value !== "object") return;
    if (!Array.isArray(value) && typeof value.$ref === "string") {
      if (!value.$ref.startsWith("#/")) add("EXTERNAL_REF_NOT_CHECKED", location, "External references need a project validator; they are not fetched by this check.");
      else {
        let found: Json | undefined = contract;
        for (const part of value.$ref.slice(2).split("/").map(item => item.replaceAll("~1", "/").replaceAll("~0", "~"))) {
          found = found && typeof found === "object" && !Array.isArray(found) ? found[part] : undefined;
        }
        if (found === undefined) add("REF_MISSING", location, value.$ref);
      }
    }
    for (const [key, child] of Object.entries(value)) visit(child, `${location}/${key}`, depth + 1);
  };
  visit(contract, "#", 0);
  const rules = specification && Array.isArray(specification.rules) ? specification.rules : [];
  const journeys = specification && Array.isArray(specification.journeys) ? specification.journeys : [];
  const ruleIds = new Set<string>();
  for (const [index, candidate] of rules.entries()) {
    const rule = candidate && typeof candidate === "object" && !Array.isArray(candidate) ? candidate : {};
    const at = `rules/${index}`;
    if (typeof rule.ruleId !== "string" || !rule.ruleId) { add("RULE_ID_MISSING", at, "A rule needs a stable ruleId."); continue; }
    if (ruleIds.has(rule.ruleId)) add("RULE_ID_DUPLICATE", at, rule.ruleId); ruleIds.add(rule.ruleId);
    if (!["source_supported", "observed", "inferred", "proposed"].includes(String(rule.basis))) add("RULE_BASIS_MISSING", at, "Distinguish evidence, inference and proposed product decisions.");
    if ((rule.basis === "source_supported" || rule.basis === "observed") && (!Array.isArray(rule.evidenceRefs) || !rule.evidenceRefs.length)) add("RULE_EVIDENCE_MISSING", at, "Observed/source-supported claims need evidence references.");
    if (Array.isArray(rule.operationIds)) for (const operation of rule.operationIds) if (typeof operation !== "string" || !ids.has(operation)) add("RULE_OPERATION_MISSING", at, String(operation));
    if (rule.decision !== "omit" && !journeys.some(journey => journey && typeof journey === "object" && !Array.isArray(journey) && Array.isArray(journey.ruleIds) && journey.ruleIds.includes(rule.ruleId!))) add("RULE_SCENARIO_GAP", at, `${rule.ruleId} has no linked journey.`);
  }
  for (const [index, candidate] of journeys.entries()) {
    const journey = candidate && typeof candidate === "object" && !Array.isArray(candidate) ? candidate : {};
    if (Array.isArray(journey.ruleIds)) for (const rule of journey.ruleIds) if (typeof rule !== "string" || !ruleIds.has(rule)) add("JOURNEY_RULE_MISSING", `journeys/${index}`, String(rule));
  }
  return { structuralCheckPassed: issues.length === 0, operations, ruleCount: rules.length, journeyCount: journeys.length, issues,
    coverage: "Local references, operation identities and specification links. Run the project's full OpenAPI/schema validator and actual tests separately.", businessVerified: false };
}
export async function contract(input: ObjectValue, context: PluginToolContext) {
  const root = relative(input.projectPath), source = input.path === undefined ? file(root, "packages/contracts/openapi.json") : relative(input.path, "path");
  const read = await context.files.read(source, { maxBytes: 1048576 });
  let spec: ObjectValue | undefined;
  if (input.specPath !== undefined) { const name = relative(input.specPath, "specPath"); spec = parse((await context.files.read(name, { maxBytes: 524288 })).content, name); }
  const report = { path: source, sha256: digest(read.content), ...inspectContract(parse(read.content, source), spec) };
  const artifact = await context.artifacts.create({ type: "json", content: JSON.stringify(report), summary: "App Studio contract diagnostics" });
  return good({ ...report, artifact: artifact.artifact });
}
