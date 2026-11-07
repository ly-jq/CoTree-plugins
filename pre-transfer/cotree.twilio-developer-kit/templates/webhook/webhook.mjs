import twilio from 'twilio';

export function configuration(env) {
  const authToken = env.TWILIO_AUTH_TOKEN, publicUrl = env.TWILIO_WEBHOOK_URL;
  if (!authToken?.trim() || !publicUrl?.trim()) throw new Error('Set TWILIO_AUTH_TOKEN and TWILIO_WEBHOOK_URL.');
  const url = new URL(publicUrl);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.pathname !== '/webhook') throw new Error('Use an exact public HTTPS /webhook URL without credentials or a fragment.');
  return { authToken, publicUrl, requestTarget: url.pathname + url.search };
}
export function handleWebhook(request, config) {
  const respond = (status, error) => ({ status, type: 'application/json', body: JSON.stringify({ error }) });
  if (request.url !== config.requestTarget) return respond(404, 'route-not-found');
  const type = request.headers['content-type'];
  if (typeof type !== 'string' || type.split(';')[0].trim().toLowerCase() !== 'application/x-www-form-urlencoded') return respond(415, 'form-body-required');
  const signature = request.headers['x-twilio-signature'];
  if (typeof signature !== 'string' || !signature) return respond(403, 'signature-required');
  const text = new TextDecoder('utf-8', { fatal: true }).decode(request.rawBody), params = Object.create(null);
  for (const [key, value] of new URLSearchParams(text)) {
    if (!(key in params)) params[key] = value;
    else params[key] = [].concat(params[key], value);
  }
  // The public URL is configured, never reconstructed from untrusted proxy headers.
  if (!twilio.validateRequest(config.authToken, signature, config.publicUrl, params)) return respond(403, 'signature-invalid');
  return { status: 200, type: 'application/xml', body: new twilio.twiml.MessagingResponse().toString() };
}
