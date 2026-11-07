import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
const variables = { openai: ['OPENAI_API_KEY', 'OPENAI_MODEL'], claude: ['ANTHROPIC_API_KEY', 'CLAUDE_MODEL'] };
export function inspectEnvironment(provider, environment = process.env) {
  if (!Object.hasOwn(variables, provider)) throw new Error('provider must be openai or claude.');
  return { provider, variables: Object.fromEntries(variables[provider].map(name => [name, typeof environment[name] === 'string' && environment[name].trim().length > 0])), credentialsValidated: false, networkExecuted: false, filesRead: false };
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try { const { values } = parseArgs({ options: { provider: { type: 'string' } } }); console.log(JSON.stringify(inspectEnvironment(values.provider))); }
  catch { console.error('Choose --provider openai or claude. No credential values were printed.'); process.exitCode = 1; }
}
