import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplicationServer } from '../apps/api/server.mjs';

test('real service exposes both application entrances and rejects absent routes', async () => {
  const server = createApplicationServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    assert.equal((await fetch(base + '/api/health')).status, 200);
    assert.match(await (await fetch(base + '/')).text(), /应用用户端/);
    assert.match(await (await fetch(base + '/admin')).text(), /应用管理端/);
    assert.equal((await fetch(base + '/api/not-defined')).status, 404);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
