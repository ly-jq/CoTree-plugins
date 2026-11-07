import { parseArgs } from 'node:util';
const { values } = parseArgs({ options: { 'project-ref': { type: 'string' }, write: { type: 'boolean', default: false } }, allowPositionals: false });
const project = values['project-ref'];
if (!project || !/^[a-z0-9]{1,64}$/.test(project)) throw new Error('Supply --project-ref with the project reference from the Supabase dashboard, not a URL or a key.');
const url = new URL('https://mcp.supabase.com/mcp');
url.searchParams.set('project_ref', project);
if (!values.write) url.searchParams.set('read_only', 'true');
url.searchParams.set('features', 'database,docs,debugging,development');
process.stdout.write(JSON.stringify({ mcpServers: { 'cotree.supabase.supabase': { transport: 'streamable-http', url: url.href, headersEnv: { Authorization: 'COTREE_SUPABASE_MCP_AUTHORIZATION' } } } }, null, 2) + '\n');
