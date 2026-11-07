import { query, type Options } from '@anthropic-ai/claude-agent-sdk';
export function buildOptions(model: string): Options {
  return { model, tools: [], settingSources: [], permissionMode: 'default', persistSession: false, maxTurns: 3,
    canUseTool: async () => ({ behavior: 'deny', message: 'No tools enabled in this starter.' }) };
}
const check = process.argv[2] === '--check';
if (check) { buildOptions('offline-fixture-model'); console.log(JSON.stringify({sdk: 'claude', constructed: true, liveApiCalled: false})); }
else {
  const model = process.env.CLAUDE_MODEL, key = process.env.ANTHROPIC_API_KEY, prompt = process.argv[2];
  if (!model?.trim() || !key?.trim() || !prompt?.trim()) { console.error('Set ANTHROPIC_API_KEY, CLAUDE_MODEL and supply one prompt.'); process.exitCode = 1; }
  else {
    const abortController = new AbortController(), timer = setTimeout(() => abortController.abort(), 90000);
    const cancel = () => abortController.abort(); process.once('SIGINT', cancel); process.once('SIGTERM', cancel);
    let resultSeen = false;
    try { for await (const message of query({ prompt, options: { ...buildOptions(model), abortController } })) {
      if (message.type === 'result') { resultSeen = true; if (message.subtype !== 'success' || message.is_error) throw new Error('Run did not succeed'); console.log(message.result); }
    } if (!resultSeen) throw new Error('No terminal result'); }
    catch { console.error('SDK run failed or was cancelled. Inspect redacted diagnostics in your application.'); process.exitCode = 1; }
    finally { clearTimeout(timer); process.removeListener('SIGINT', cancel); process.removeListener('SIGTERM', cancel); }
  }
}
