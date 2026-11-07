import { pathToFileURL } from "node:url";

export function researchRequest(service, id) {
  if (typeof id !== "string" || !id || id.length > 32) throw new Error("A public accession is required");
  const profiles = {
    uniprot: { valid: /^[A-Z0-9]{6,10}(?:-\d+)?$/, url: `https://rest.uniprot.org/uniprotkb/${encodeURIComponent(id)}.json` },
    ensembl: { valid: /^ENS[A-Z]*G\d{11}$/, url: `https://rest.ensembl.org/lookup/id/${encodeURIComponent(id)}?content-type=application/json` },
    pdb: { valid: /^[A-Za-z0-9]{4}$/, url: `https://data.rcsb.org/rest/v1/core/entry/${encodeURIComponent(id.toUpperCase())}` },
    clinicaltrials: { valid: /^NCT\d{8}$/, url: `https://clinicaltrials.gov/api/v2/studies/${encodeURIComponent(id)}` }
  };
  const profile = Object.hasOwn(profiles, service) ? profiles[service] : undefined;
  if (!profile || !profile.valid.test(id)) throw new Error("Unsupported service or invalid public accession; inspect references/connection.md");
  return { service, id, url: profile.url };
}

function compact(service, data) {
  let result;
  if (service === "uniprot") result = { id: data.primaryAccession, name: data.proteinDescription?.recommendedName?.fullName?.value, organism: data.organism?.scientificName, sequenceLength: data.sequence?.length };
  if (service === "ensembl") result = { id: data.id, name: data.display_name, species: data.species, assembly: data.assembly_name, chromosome: data.seq_region_name, start: data.start, end: data.end, strand: data.strand };
  if (service === "pdb") result = { id: data.rcsb_id, title: data.struct?.title, methods: data.exptl?.map(item => item.method) };
  if (service === "clinicaltrials") { const p = data.protocolSection; result = { id: p?.identificationModule?.nctId, title: p?.identificationModule?.briefTitle, status: p?.statusModule?.overallStatus, lastUpdate: p?.statusModule?.lastUpdatePostDateStruct?.date }; }
  if (!result || typeof result.id !== "string" || !result.id) throw new Error("Response lacks the service accession; inspect the API schema before using this evidence");
  return result;
}

export async function lookupPublicRecord(service, id, { fetchImpl = fetch, signal, timeoutMs = 20000, maxBytes = 2097152 } = {}) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000 || !Number.isInteger(maxBytes) || maxBytes < 1 || maxBytes > 2097152) throw new Error("Invalid request bounds");
  const request = researchRequest(service, id);
  const timeout = AbortSignal.timeout(timeoutMs);
  const response = await fetchImpl(request.url, { method: "GET", headers: { Accept: "application/json" }, redirect: "error", signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
  if (!response.ok) { await response.body?.cancel(); throw new Error(`Public ${service} request returned HTTP ${response.status}; check accession or retry later, without inferring absence of biological evidence`); }
  if (!response.body) throw new Error("Public response has no body");
  const reader = response.body.getReader(), chunks = []; let bytes = 0;
  try {
    while (true) { const { done, value } = await reader.read(); if (done) break; bytes += value.length; if (bytes > maxBytes) throw new Error("Public response exceeds the bounded reader; use a reviewed paginated client"); chunks.push(value); }
  } finally { await reader.cancel(); reader.releaseLock(); }
  const data = compact(service, JSON.parse(Buffer.concat(chunks).toString("utf8")));
  if (data.id.toUpperCase() !== id.toUpperCase()) throw new Error("Service returned a different accession; resolve the identifier explicitly before continuing");
  return { service, source: request.url, observedAt: new Date().toISOString(), httpStatus: response.status, bytes, data, interpretation: "Public database metadata only; no independent biological or clinical validation" };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 4 || args[0] !== "--service" || args[2] !== "--id") throw new Error("Usage: node scripts/public-research.mjs --service uniprot|ensembl|pdb|clinicaltrials --id ACCESSION");
    console.log(JSON.stringify(await lookupPublicRecord(args[1], args[3]), null, 2));
  } catch (error) { console.error(error instanceof Error ? error.message : "Public lookup failed without an Error object; inspect the invocation"); process.exitCode = 1; }
}
