import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
export function connectionConfig(account) {
  if (account !== undefined && (typeof account !== 'string' || !/^acct_[A-Za-z0-9]{1,128}$/.test(account))) throw new Error('Use an observed connected account ID.');
  return { mcpServers: { 'cotree.stripe.stripe': { transport: 'streamable-http', url: 'https://mcp.stripe.com', headersEnv: { Authorization: 'COTREE_STRIPE_MCP_AUTHORIZATION' }, ...(account ? { headers: { 'Stripe-Account': account } } : {}) } } };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { const { values } = parseArgs({ options: { account: { type: 'string' } }, allowPositionals: false }); process.stdout.write(JSON.stringify(connectionConfig(values.account), null, 2) + '\n'); }
  catch (error) { process.stderr.write(`Stripe configuration: ${error.message}\n`); process.exitCode = 1; }
}
