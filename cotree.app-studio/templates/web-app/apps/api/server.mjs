import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
export function createApplicationServer() {
  return http.createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    if (request.method === 'GET' && url.pathname === '/api/health') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ status: 'ready', scope: 'application shell only' })); return;
    }
    const pages = { '/': 'web/index.html', '/admin': 'admin/index.html' };
    const page = pages[url.pathname];
    if (request.method !== 'GET' || !page) { response.writeHead(404); response.end('Not found'); return; }
    try { const content = await readFile(path.join(root, page)); response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); response.end(content); }
    catch { response.writeHead(500); response.end('Application page is unavailable'); }
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createApplicationServer();
  server.listen(Number(process.env.PORT ?? 3000), process.env.HOST ?? '127.0.0.1', () => {
    const address = server.address();
    if (address && typeof address === 'object') console.log(JSON.stringify({ event: 'listening', url: `http://127.0.0.1:${address.port}`, adminPath: '/admin' }));
  });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
}
