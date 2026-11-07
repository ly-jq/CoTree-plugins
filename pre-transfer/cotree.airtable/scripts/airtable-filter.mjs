import { openSync, fstatSync, readFileSync, closeSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.length > 0 && value.length <= 4096;
const types = {
  singleLineText: 'text', multilineText: 'text', email: 'text', url: 'text', phoneNumber: 'text', richText: 'text', barcode: 'text',
  number: 'number', percent: 'number', currency: 'number', rating: 'number', duration: 'number', autoNumber: 'number', count: 'number',
  date: 'date', dateTime: 'date', createdTime: 'date', lastModifiedTime: 'date',
  singleSelect: 'select', multipleSelects: 'selects', singleCollaborator: 'person', multipleCollaborators: 'people', multipleRecordLinks: 'links', multipleAttachments: 'files', checkbox: 'check'
};
const operators = {
  '=': ['text', 'number', 'date', 'check', 'select', 'selects', 'person', 'people', 'links'],
  '!=': ['text', 'number', 'date', 'select', 'person'],
  '<': ['number', 'date'], '>': ['number', 'date'], '<=': ['number', 'date'], '>=': ['number', 'date'],
  contains: ['text', 'links'], doesNotContain: ['text', 'links', 'selects', 'people'],
  isEmpty: ['text', 'number', 'date', 'select', 'selects', 'person', 'people', 'links', 'files'],
  isNotEmpty: ['text', 'number', 'date', 'select', 'selects', 'person', 'people', 'links', 'files'],
  hasAnyOf: ['selects', 'people', 'links'], hasAllOf: ['selects', 'people', 'links'], isAnyOf: ['select', 'person'], isNoneOf: ['select', 'person', 'links'],
  isWithin: ['date'], filename: ['files'], fileType: ['files']
};
function keys(value, allowed) {
  if (!object(value) || Object.keys(value).some(key => !allowed.includes(key))) throw new Error('Unexpected filter shape; use the documented local input format.');
}

/** Offline preparation only. Current tools/list remains authoritative for the remote schema. */
export function prepareFilter(input) {
  if (Buffer.byteLength(JSON.stringify(input) ?? '') > 256 * 1024) throw new Error('Filter input exceeds 256 KiB.');
  keys(input, ['fields', 'filters']);
  if (!Array.isArray(input.fields) || !input.fields.length || input.fields.length > 500) throw new Error('Supply 1..500 fields from the actual table schema.');
  const byId = new Map(), byName = new Map(), resolved = new Set();
  for (const field of input.fields) {
    if (!object(field) || !/^fld[A-Za-z0-9]{1,64}$/.test(field.id) || !text(field.name) || typeof field.type !== 'string' || byId.has(field.id)) throw new Error('Invalid or duplicate schema field.');
    byId.set(field.id, field); byName.set(field.name, [...(byName.get(field.name) ?? []), field]);
  }
  let conditions = 0;
  function group(node, depth) {
    keys(node, ['operator', 'operands']);
    if (depth > 8 || !['and', 'or', undefined].includes(node.operator) || !Array.isArray(node.operands) || !node.operands.length || node.operands.length > 100) throw new Error('Use non-empty AND/OR groups, at most 8 levels and 100 conditions.');
    return { operator: node.operator ?? 'and', operands: node.operands.map(part => {
      if (object(part) && ['and', 'or', undefined].includes(part.operator)) return group(part, depth + 1);
      return condition(part);
    }) };
  }
  function condition(node) {
    keys(node, ['operator', 'operands', 'operatorOptions']);
    if (++conditions > 100 || typeof node.operator !== 'string' || !Object.hasOwn(operators, node.operator) || !Array.isArray(node.operands)) throw new Error('Unsupported local operator or too many conditions; inspect the live tool schema.');
    const empty = ['isEmpty', 'isNotEmpty'].includes(node.operator);
    if (node.operands.length !== (empty ? 1 : 2) || !text(node.operands[0])) throw new Error('Invalid condition operands.');
    const matches = byId.has(node.operands[0]) ? [byId.get(node.operands[0])] : byName.get(node.operands[0]);
    if (matches?.length !== 1) throw new Error('Field missing or ambiguous; use an observed field ID.');
    const field = matches[0], type = ['formula', 'rollup', 'multipleLookupValues'].includes(field.type) ? field.options?.result?.type : field.type;
    const category = Object.hasOwn(types, type) ? types[type] : undefined;
    if (!category || !operators[node.operator].includes(category)) throw new Error('Operator not supported locally for this field result type.');
    resolved.add(field.id);
    const value = node.operands[1];
    const array = ['hasAnyOf', 'hasAllOf', 'isAnyOf', 'isNoneOf'].includes(node.operator) || (node.operator === 'doesNotContain' && ['selects', 'people'].includes(category));
    if (!empty) {
      if (array) {
        if (!Array.isArray(value) || !value.length || value.length > 100 || !value.every(text)) throw new Error('Supply a non-empty array of observed IDs.');
      } else if (category === 'date') {
        if (!object(value) || !text(value.mode) || !text(value.timeZone)) throw new Error('Date filters require a mode object and explicit timeZone.');
        try { new Intl.DateTimeFormat('en', { timeZone: value.timeZone }); } catch { throw new Error('Invalid IANA time zone.'); }
        // Modes and range members evolve remotely; retain them without inventing or converting dates.
      } else if (category === 'number') {
        if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Numeric filters need a finite number.');
      } else if (category === 'check') {
        if (typeof value !== 'boolean') throw new Error('Checkbox equality needs a boolean.');
      } else if (!text(value)) throw new Error('Supply a bounded string operand.');
      if (['select', 'selects'].includes(category)) {
        const choices = field.options?.choices;
        if (!Array.isArray(choices) || !(array ? value : [value]).every(v => /^sel[A-Za-z0-9]+$/.test(v) && choices.some(c => c.id === v))) throw new Error('Use observed choice IDs, not labels; include choices from the table schema.');
      }
    }
    if (node.operatorOptions !== undefined) {
      keys(node.operatorOptions, ['matchGroupsByMembership']);
      if (!['person', 'people'].includes(category) || typeof node.operatorOptions.matchGroupsByMembership !== 'boolean') throw new Error('Group membership options apply only to collaborator fields.');
    }
    return { operator: node.operator, operands: [field.id, ...(empty ? [] : [structuredClone(value)])], ...(node.operatorOptions === undefined ? {} : { operatorOptions: structuredClone(node.operatorOptions) }) };
  }
  const filters = group(input.filters, 1);
  return { filters, resolvedFieldIds: [...resolved], conditions, preparedOffline: true, verifiedByService: false };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { values } = parseArgs({ options: { input: { type: 'string' }, output: { type: 'string' }, help: { type: 'boolean' } } });
    if (values.help) process.stdout.write('Usage: node airtable-filter.mjs --input schema-and-filter.json [--output new-file.json]. Offline only; never reads credentials or contacts Airtable.\n');
    else {
      const fd = openSync(values.input, 'r'); let input;
      try { const info = fstatSync(fd); if (!info.isFile() || info.size > 256 * 1024) throw new Error('Use a regular JSON file no larger than 256 KiB.'); input = JSON.parse(readFileSync(fd, 'utf8')); }
      finally { closeSync(fd); }
      const result = JSON.stringify(prepareFilter(input), null, 2) + '\n';
      if (values.output) writeFileSync(values.output, result, { flag: 'wx', mode: 0o600 }); else process.stdout.write(result);
    }
  } catch (error) { process.stderr.write((error?.code || error instanceof SyntaxError || error instanceof TypeError ? 'Invalid input or output file; existing output is never overwritten.' : error.message) + '\n'); process.exitCode = 1; }
}
