import { parseArgs } from 'node:util';
const { values } = parseArgs({ options: { mode: { type: 'string' } }, allowPositionals: false });
if (!['desktop', 'remote'].includes(values.mode)) throw new Error('Supply --mode desktop or --mode remote.');
const remote = values.mode === 'remote';
process.stdout.write(JSON.stringify({ mcpServers: { 'cotree.figma.figma': { transport: 'streamable-http', url: remote ? 'https://mcp.figma.com/mcp' : 'http://127.0.0.1:3845/mcp', ...(remote ? { headersEnv: { Authorization: 'COTREE_FIGMA_MCP_AUTHORIZATION' } } : {}) } } }, null, 2) + '\n');
