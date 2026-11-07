import { createHmac, timingSafeEqual } from 'node:crypto';

export function configuration(env) {
  if (typeof env.ZOOM_WEBHOOK_SECRET_TOKEN !== 'string' || !env.ZOOM_WEBHOOK_SECRET_TOKEN.trim()) throw new Error('Set ZOOM_WEBHOOK_SECRET_TOKEN.');
  return { secret: env.ZOOM_WEBHOOK_SECRET_TOKEN };
}
export function handleWebhook(request, config, now = Date.now()) {
  const respond = (status, body) => ({ status, type: 'application/json', body: JSON.stringify(body) });
  if (request.url !== '/webhook') return respond(404, { error: 'route-not-found' });
  const type = request.headers['content-type'];
  if (typeof type !== 'string' || type.split(';')[0].trim().toLowerCase() !== 'application/json') return respond(415, { error: 'json-body-required' });
  const timestamp = request.headers['x-zm-request-timestamp'], signature = request.headers['x-zm-signature'];
  if (typeof timestamp !== 'string' || !/^\d{10,}$/.test(timestamp) || !Number.isSafeInteger(Number(timestamp)) || !Number.isFinite(now) || Math.abs(now / 1000 - Number(timestamp)) > 300) return respond(403, { error: 'timestamp-missing-or-stale' });
  if (typeof signature !== 'string' || !/^v0=[a-f0-9]{64}$/.test(signature)) return respond(403, { error: 'signature-invalid' });
  const expected = 'v0=' + createHmac('sha256', config.secret).update(`v0:${timestamp}:`).update(request.rawBody).digest('hex');
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return respond(403, { error: 'signature-invalid' });
  let data;
  try { data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(request.rawBody)); } catch { return respond(400, { error: 'json-invalid' }); }
  if (!data || typeof data.event !== 'string' || !data.event.trim() || !data.payload || typeof data.payload !== 'object' || Array.isArray(data.payload)) return respond(400, { error: 'event-fields-missing' });
  if (data.event === 'endpoint.url_validation') {
    const token = data.payload.plainToken;
    if (typeof token !== 'string' || !token || token.length > 4096) return respond(400, { error: 'challenge-token-missing' });
    return respond(200, { plainToken: token, encryptedToken: createHmac('sha256', config.secret).update(token).digest('hex') });
  }
  // A protocol acknowledgement only; no queue, business action or delivery guarantee.
  return respond(200, { received: true, businessProcessed: false });
}
