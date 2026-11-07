const operators = new Set(['regex_match', 'contains', 'equals', 'not_contains', 'starts_with', 'ends_with']);
function text(value, label, max = 4096) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`${label} must be nonempty text within ${max} characters`);
  return value;
}
export function validateRules(document) {
  if (document?.schemaVersion !== 1 || !Array.isArray(document.rules) || document.rules.length > 64) throw new Error('Use schemaVersion 1 with up to 64 rules');
  const ids = new Set();
  for (const rule of document.rules) {
    text(rule.id, 'rule.id', 80); if (ids.has(rule.id)) throw new Error(`Duplicate rule: ${rule.id}`); ids.add(rule.id);
    if (typeof rule.enabled !== 'boolean' || !['before', 'after', 'run_completed'].includes(rule.phase) || !['warn', 'block'].includes(rule.action)) throw new Error(`Invalid enabled, phase or action for ${rule.id}`);
    text(rule.message, 'rule.message');
    if (!Array.isArray(rule.tools) || !rule.tools.length || rule.tools.length > 32 || rule.tools.some(t => typeof t !== 'string' || !t || t.length > 128)) throw new Error(`Provide explicit tool names or * for ${rule.id}`);
    if (!Array.isArray(rule.conditions) || !rule.conditions.length || rule.conditions.length > 16) throw new Error(`Provide 1-16 conditions for ${rule.id}`);
    for (const condition of rule.conditions) {
      text(condition.field, 'condition.field', 160);
      if (condition.field.split('.').some(k => !k || ['__proto__', 'constructor', 'prototype'].includes(k))) throw new Error('Invalid condition field');
      if (!operators.has(condition.operator)) throw new Error('Unsupported condition operator');
      text(condition.pattern, 'condition.pattern', 256);
      if (condition.operator === 'regex_match') new RegExp(condition.pattern, 'iu');
    }
  }
  return document.rules;
}
function fieldAt(input, field) {
  let value = input;
  for (const key of field.split('.')) { if (!value || typeof value !== 'object' || !Object.hasOwn(value, key)) return undefined; value = value[key]; }
  return typeof value === 'string' ? value : undefined;
}
export function evaluateRules(document, event) {
  const rules = validateRules(document);
  if (!event || !['before', 'after', 'run_completed'].includes(event.phase)) throw new Error('Explicit supported lifecycle phase required');
  const matches = [];
  for (const rule of rules) {
    if (!rule.enabled || rule.phase !== event.phase || (!rule.tools.includes('*') && !rule.tools.includes(event.toolName))) continue;
    const matched = rule.conditions.every(c => {
      const value = fieldAt(event, c.field); if (value === undefined) return false;
      if (value.length > 32768) throw new Error(`Field exceeds evaluation bound for ${rule.id}; narrow the rule or tool payload`);
      switch (c.operator) {
        case 'regex_match': return new RegExp(c.pattern, 'iu').test(value);
        case 'equals': return value === c.pattern;
        case 'contains': return value.includes(c.pattern);
        case 'not_contains': return !value.includes(c.pattern);
        case 'starts_with': return value.startsWith(c.pattern);
        case 'ends_with': return value.endsWith(c.pattern);
        default: throw new Error('Condition operator was not validated');
      }
    });
    if (matched) matches.push({ id: rule.id, action: rule.action, message: rule.message });
  }
  const blocked = event.phase === 'before' && matches.some(r => r.action === 'block');
  return { action: blocked ? 'block' : 'continue', ...(blocked ? { reason: matches.filter(r => r.action === 'block').map(r => `${r.id}: ${r.message}`).join('\n') } : {}), output: { matches, phase: event.phase, postEventCannotUndo: event.phase !== 'before' }, summary: `${matches.length} configured rule(s) matched` };
}
export async function executeHook(request) {
  try {
    if (!request.context.files?.read) throw new Error('This CoTree host lacks the hook read broker; update the host before enabling Hookify');
    let file;
    try { file = await request.context.files.read('.cotree/hookify/rules.json', { maxBytes: 131072 }); } catch (error) { if (error.code === 'PLUGIN_FILE_NOT_FOUND') return { action: 'continue', summary: 'No workspace Hookify rules configured' }; throw error; }
    if (typeof file?.content !== 'string') throw new Error('Hook read broker returned no text content');
    const phase = request.target === 'run_completed' ? 'run_completed' : request.input.phase;
    return evaluateRules(JSON.parse(file.content), { ...request.input, phase });
  } catch (error) {
    return { action: request.input?.phase === 'before' ? 'block' : 'continue', reason: `Hookify rule evaluation unavailable: ${error.message}. Inspect .cotree/hookify/rules.json before relying on this policy.`, output: { evaluationCompleted: false }, summary: 'Hookify configuration or evaluation error' };
  }
}
