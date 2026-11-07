import { execFile } from 'node:child_process';
import { lstatSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const queryArgs = ['--query-gpu=index,name,uuid,driver_version,memory.total', '--format=csv,noheader,nounits'];
function csvRow(line) {
  const values = []; let current = '', quoted = false;
  for (let i = 0; i < line.length; i++) { const c = line[i]; if (c === '"') { if (quoted && line[i + 1] === '"') { current += '"'; i++; } else quoted = !quoted; } else if (c === ',' && !quoted) { values.push(current.trim()); current = ''; } else current += c; }
  if (quoted) throw new Error('Unterminated GPU CSV quote'); values.push(current.trim()); return values;
}
export function parseGpuCsv(csv) {
  if (typeof csv !== 'string' || Buffer.byteLength(csv) > 256 * 1024) throw new Error('GPU evidence exceeds 256 KiB');
  const rows = csv.trim().split(/\r?\n/u).filter(Boolean); if (!rows.length) throw new Error('No GPU rows observed');
  const indexes = new Set(), uuids = new Set();
  return rows.map(line => {
    const fields = csvRow(line); if (fields.length !== 5) throw new Error('Expected five nvidia-smi fields');
    const [index, name, uuid, driverVersion, memory] = fields;
    if (!/^\d+$/u.test(index) || !name || !/^GPU-[a-f0-9-]+$/iu.test(uuid) || !/^\d+(?:\.\d+)+$/u.test(driverVersion)) throw new Error('GPU identity or driver evidence is missing or malformed');
    if (indexes.has(index) || uuids.has(uuid)) throw new Error('Duplicate GPU identity'); indexes.add(index); uuids.add(uuid);
    const result = { index: Number(index), name, uuid, driverVersion };
    if (memory === '[N/A]' || memory === 'N/A') result.memoryEvidence = 'nvidia-smi did not report total memory; query a supported device/driver before sizing a workload';
    else { if (!/^\d+(?:\.\d+)?$/u.test(memory) || !Number.isFinite(Number(memory))) throw new Error('Invalid GPU memory evidence'); result.memoryTotalMiB = Number(memory); }
    return result;
  });
}
export async function inspectGpu({ executable = 'nvidia-smi', signal } = {}) {
  if (executable !== 'nvidia-smi' && !path.isAbsolute(executable)) throw new Error('Custom nvidia-smi path must be absolute');
  try {
    const stdout = await new Promise((resolve, reject) => execFile(executable, queryArgs, { timeout: 10000, maxBuffer: 256 * 1024, windowsHide: true, signal }, (error, out) => error ? reject(error) : resolve(out)));
    return { schemaVersion: 1, status: 'observed', command: [executable, ...queryArgs], gpus: parseGpuCsv(stdout), computeValidated: false, next: 'Check the chosen workload CUDA/container/VRAM/interconnect requirements and run a bounded task.' };
  } catch (error) {
    if (signal?.aborted || error.name === 'AbortError') throw error;
    return { schemaVersion: 1, status: 'unavailable', command: [executable, ...queryArgs], reason: error.code ? `nvidia-smi process failed (${error.code})` : error.message, computeValidated: false, next: 'Verify nvidia-smi, the NVIDIA driver and device visibility in this execution environment, then retry.' };
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const [action, input, output] = process.argv.slice(2); let result;
    if (action === 'inspect' && input && process.argv.length === 4) result = await inspectGpu();
    else if (action === 'parse' && input && output && process.argv.length === 5) { const stat = lstatSync(input); if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 256 * 1024) throw new Error('Expected bounded GPU CSV file'); result = { schemaVersion: 1, status: 'parsed-evidence', gpus: parseGpuCsv(readFileSync(input, 'utf8')), liveVerified: false, computeValidated: false }; }
    else throw new Error('Usage: gpu-inspect.mjs inspect output.json | parse evidence.csv output.json');
    writeFileSync(output ?? input, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ status: result.status, computeValidated: false })); if (result.status === 'unavailable') process.exitCode = 2;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
