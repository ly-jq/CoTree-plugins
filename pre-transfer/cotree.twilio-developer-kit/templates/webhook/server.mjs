import { createServer } from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { handleWebhook, configuration } from './webhook.mjs';

export function createWebhookServer(config) {
  const server = createServer(async (req, res) => {
    const send = (status, body, type = 'application/json') => {
      res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(body);
    };
    if (req.method !== 'POST') { req.resume(); send(405, '{"error":"post-required"}'); return; }
    if (req.url?.split('?')[0] !== '/webhook') { req.resume(); send(404, '{"error":"route-not-found"}'); return; }
    try {
      const chunks = []; let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 1024 * 1024) { send(413, '{"error":"body-too-large"}'); return; }
        chunks.push(chunk);
      }
      const result = handleWebhook({ url: req.url, headers: req.headers, rawBody: Buffer.concat(chunks) }, config);
      send(result.status, result.body, result.type);
    } catch { if (!res.headersSent) send(400, '{"error":"request-unreadable"}'); }
  });
  server.requestTimeout = 10000; server.headersTimeout = 5000; server.keepAliveTimeout = 5000;
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const config = configuration(process.env), port = Number(process.env.PORT ?? '8787');
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid port');
    const server = createWebhookServer(config);
    server.on('error', () => { console.error(JSON.stringify({ event: 'listen-failed' })); process.exitCode = 1; });
    server.listen(port, '127.0.0.1', () => console.log(JSON.stringify({ event: 'listening', host: '127.0.0.1', port, businessProcessing: false })));
    const stop = () => { server.close(); server.closeAllConnections(); };
    process.once('SIGINT', stop); process.once('SIGTERM', stop);
  } catch { console.error(JSON.stringify({ event: 'configuration-missing-or-invalid', next: 'Read README.md and supply the named environment values.' })); process.exitCode = 1; }
}
