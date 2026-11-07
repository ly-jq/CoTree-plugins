import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { z } from 'zod';

const uri = 'ui://widget/message-v1.html';
export function createAppServer() {
  const server = new McpServer({ name: '__APP_NAME__', version: '0.1.0' });
  registerAppResource(server, 'message-widget', uri, {}, async () => ({ contents: [{
    uri, mimeType: RESOURCE_MIME_TYPE, text: readFileSync(new URL('./dist/widget.html', import.meta.url), 'utf8'),
    _meta: { ui: { prefersBorder: true, csp: { connectDomains: [], resourceDomains: [] } } }
  }] }));
  registerAppTool(server, 'show_message', {
    title: 'Show a message', description: 'Display the supplied text in a local example widget. Does not save or send it.',
    inputSchema: { message: z.string().trim().min(1).max(1000) },
    outputSchema: { message: z.string() },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
    _meta: { ui: { resourceUri: uri } }
  }, async ({ message }) => ({ content: [{ type: 'text', text: message }], structuredContent: { message } }));
  return server;
}

export function startServer(port = 8787) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid port.');
  const active = new Set();
  const http = createServer(async (req, res) => {
    // Local development only. Reject browser cross-origin access and DNS rebinding.
    if (req.headers.host !== `127.0.0.1:${http.address()?.port}` || req.headers.origin) { res.writeHead(403).end(); return; }
    if (req.method === 'GET' && req.url === '/health') { res.writeHead(200, { 'content-type': 'application/json' }).end('{"ready":true}'); return; }
    if (req.url !== '/mcp') { res.writeHead(404).end(); return; }
    if (req.method !== 'POST') { res.writeHead(405, { Allow: 'POST' }).end(); return; }
    const server = createAppServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    active.add(server);
    res.on('close', () => { active.delete(server); void server.close().catch(() => {}); });
    try { await server.connect(transport); await transport.handleRequest(req, res); }
    catch { if (!res.headersSent) res.writeHead(500).end('Request failed.'); else res.end(); }
  });
  http.requestTimeout = 15000;
  http.headersTimeout = 10000;
  http.listen(port, '127.0.0.1');
  return { http, close: async () => { await Promise.all([...active].map(server => server.close())); http.closeAllConnections(); await new Promise((resolve, reject) => http.close(error => error ? reject(error) : resolve())); } };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const app = startServer(Number(process.env.PORT ?? 8787));
  app.http.on('listening', () => console.log(JSON.stringify({ url: `http://127.0.0.1:${app.http.address().port}/mcp` })));
  app.http.on('error', () => { console.error('Local server failed.'); process.exitCode = 1; });
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void app.close(); });
}
