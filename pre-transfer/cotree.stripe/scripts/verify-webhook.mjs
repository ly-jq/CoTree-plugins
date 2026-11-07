import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
export function verifyWebhook(payload, signature, secret, { now = Date.now(), toleranceSeconds = 300 } = {}) {
  if (!Buffer.isBuffer(payload) || payload.length > 1024 * 1024) throw new Error('Use exact raw event bytes, at most 1 MiB.');
  if (typeof secret !== 'string' || !secret.startsWith('whsec_') || /\s/.test(secret)) throw new Error('Set COTREE_STRIPE_WEBHOOK_SECRET locally to the endpoint signing secret.');
  if (typeof signature !== 'string' || signature.length > 8192 || !Number.isFinite(now) || !Number.isInteger(toleranceSeconds) || toleranceSeconds < 1 || toleranceSeconds > 300) throw new Error('Invalid signature header or verification clock/tolerance.');
  const parts = signature.split(',').map(part => part.trim().split('='));
  const timestamps = parts.filter(([key]) => key === 't').map(([, value]) => value);
  if (timestamps.length !== 1 || !/^\d{10,12}$/.test(timestamps[0])) throw new Error('Signature requires one timestamp.');
  const timestamp = Number(timestamps[0]);
  if (Math.abs(Math.floor(now / 1000) - timestamp) > toleranceSeconds) throw new Error('Webhook timestamp is outside the tolerance.');
  const expected = createHmac('sha256', secret).update(`${timestamps[0]}.`).update(payload).digest();
  const verified = parts.filter(([key, value]) => key === 'v1' && /^[a-fA-F0-9]{64}$/.test(value ?? '')).some(([, value]) => timingSafeEqual(expected, Buffer.from(value, 'hex')));
  if (!verified) throw new Error('Webhook signature does not match.');
  let event; try { event = JSON.parse(payload.toString('utf8')); } catch { throw new Error('Signed payload is not valid JSON.'); }
  if (!event || typeof event.id !== 'string' || typeof event.type !== 'string' || typeof event.livemode !== 'boolean') throw new Error('Signed payload is not a supported Stripe event envelope.');
  return { signatureVerified: true, id: event.id, type: event.type, livemode: event.livemode, apiVersion: event.api_version ?? null, timestamp, payloadSha256: createHash('sha256').update(payload).digest('hex'), processed: false, replayProtection: 'Caller must deduplicate event IDs in its existing durable store.' };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { values } = parseArgs({ options: { payload: { type: 'string' }, signature: { type: 'string' } }, allowPositionals: false });
    if (!values.payload || !statSync(values.payload).isFile() || statSync(values.payload).size > 1024 * 1024) throw new Error('Supply a raw event file, at most 1 MiB.');
    const result = verifyWebhook(readFileSync(values.payload), values.signature, process.env.COTREE_STRIPE_WEBHOOK_SECRET);
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } catch (error) { process.stderr.write(`Stripe webhook: ${error.message}\n`); process.exitCode = 1; }
}
