import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const port = (value, name) => { if (!Number.isInteger(value) || value < 1 || value > 65535) throw new Error(`${name} must be an integer from 1 to 65535`); return value; };
const host = (value, name) => { if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9.-]{0,252}$/.test(value) || value.includes('..')) throw new Error(`${name} must be a DNS name or IPv4 literal`); return value; };
export function tunnelPlan(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Tunnel input must be an object');
  const sshHost = host(input.sshHost, 'sshHost'), remoteHost = host(input.remoteHost, 'remoteHost');
  const sshPort = port(input.sshPort ?? 22, 'sshPort'), remotePort = port(input.remotePort, 'remotePort'), localPort = port(input.localPort, 'localPort');
  if (typeof input.user !== 'string' || !/^[a-zA-Z0-9_][a-zA-Z0-9_.-]{0,63}$/.test(input.user)) throw new Error('Explicit SSH user is required');
  if (typeof input.path !== 'string' || !/^\/[a-zA-Z0-9_./~-]*$/.test(input.path) || input.path.split('/').includes('..')) throw new Error('Explicit MCP path without query, fragment or traversal is required');
  if (input.remoteScheme !== 'http') throw new Error('remoteScheme must be http inside SSH; for HTTPS upstream use the original HTTPS origin and its verified certificate');
  if (typeof input.knownHostsFile !== 'string' || !path.isAbsolute(input.knownHostsFile) || /[\r\n\0"]/.test(input.knownHostsFile)) throw new Error('Explicit absolute knownHostsFile is required');
  const args = ['-F', 'none', '-N', '-T', '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-o', `UserKnownHostsFile="${input.knownHostsFile.replaceAll('\\', '/')}"`, '-o', 'ExitOnForwardFailure=yes', '-o', 'ServerAliveInterval=30', '-o', 'ServerAliveCountMax=3', '-o', 'ForwardAgent=no', '-o', 'ClearAllForwardings=no', '-p', String(sshPort)];
  if (input.identityFile !== undefined) { if (typeof input.identityFile !== 'string' || !path.isAbsolute(input.identityFile) || /[\r\n\0]/.test(input.identityFile)) throw new Error('identityFile must be absolute'); args.push('-i', input.identityFile, '-o', 'IdentitiesOnly=yes'); }
  args.push('-L', `127.0.0.1:${localPort}:${remoteHost}:${remotePort}`, `${input.user}@${sshHost}`);
  if (input.authorizationEnv !== undefined && (typeof input.authorizationEnv !== 'string' || !/^[A-Z][A-Z0-9_]{0,100}$/.test(input.authorizationEnv))) throw new Error('authorizationEnv must be a host environment variable name');
  return { command: 'ssh', args, mcpServer: { name: 'private-tunnel', transport: 'streamable-http', url: `http://127.0.0.1:${localPort}${input.path}`, ...(input.authorizationEnv ? { headersEnv: { Authorization: input.authorizationEnv } } : {}), timeoutMs: 30000 }, observations: { connected: false, toolsDiscovered: false }, scope: 'Local loopback forwarding only. SSH must reach the private upstream; remoteHost is resolved by the SSH server.' };
}
export function runTunnel(input, options = {}) {
  const plan = tunnelPlan(input);
  return new Promise((resolve, reject) => {
    const child = spawn(plan.command, plan.args, { shell: false, windowsHide: true, stdio: 'inherit', signal: options.signal });
    child.once('error', reject); child.once('exit', (code, signal) => code === 0 ? resolve({ code, signal, connected: null, evidence: 'SSH process exited; use MCP initialize/tools/list to verify actual access.' }) : reject(new Error(`SSH tunnel exited with code ${code} and signal ${signal ?? 'none'}`)));
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { const [action, file] = process.argv.slice(2); if (!['plan', 'run'].includes(action) || !file) throw new Error('Usage: mcp-tunnel.mjs plan|run request.json'); const raw = readFileSync(file); if (raw.length > 65536) throw new Error('Input exceeds 64 KiB'); const input = JSON.parse(raw.toString('utf8')); const result = action === 'plan' ? tunnelPlan(input) : await runTunnel(input); console.log(JSON.stringify(result, null, 2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
