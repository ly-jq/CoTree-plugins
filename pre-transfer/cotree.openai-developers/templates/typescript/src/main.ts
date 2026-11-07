import { Agent, run, setTracingDisabled } from '@openai/agents';
setTracingDisabled(true);
export const buildAgent = (model: string) => new Agent({ name: 'Assistant', model, instructions: 'Answer clearly. State uncertainty and do not claim unperformed actions.', tools: [] });
if (process.argv[2] === '--check') { buildAgent('offline-fixture-model'); console.log(JSON.stringify({sdk: 'openai', constructed: true, liveApiCalled: false})); }
else {
  const model = process.env.OPENAI_MODEL, key = process.env.OPENAI_API_KEY, prompt = process.argv[2];
  if (!model?.trim() || !key?.trim() || !prompt?.trim()) { console.error('Set OPENAI_API_KEY, OPENAI_MODEL and supply one prompt.'); process.exitCode = 1; }
  else {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 90000);
    const cancel = () => controller.abort(); process.once('SIGINT', cancel); process.once('SIGTERM', cancel);
    try { const result = await run(buildAgent(model), prompt, { maxTurns: 3, signal: controller.signal }); if (result.finalOutput == null) throw new Error('No output'); console.log(result.finalOutput); }
    catch { console.error('SDK run failed or was cancelled. Inspect redacted diagnostics in your application.'); process.exitCode = 1; }
    finally { clearTimeout(timer); process.removeListener('SIGINT', cancel); process.removeListener('SIGTERM', cancel); }
  }
}
