import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { identifier, inputObject, readLocal } from './google-api-common.mjs';
const mailbox = value => {
  if (typeof value !== 'string' || value.length > 254 || !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$/.test(value)) throw new Error('Use a plain ASCII mailbox address without a display name or newline.');
  return value;
};
const messageId = value => {
  if (typeof value !== 'string' || value.length > 250 || !/^<[A-Za-z0-9.!#$%&'*+\-/=?^_`{|}~]+@[A-Za-z0-9.-]+>$/.test(value)) throw new Error('Use the observed RFC Message-ID, including angle brackets.');
  return value;
};
function subjectWords(value) {
  if (typeof value !== 'string' || /[\r\n\x00]/.test(value) || Buffer.byteLength(value) > 4096) throw new Error('Supply a bounded, single-line subject.');
  if (!value) return '';
  const chunks = []; let chunk = '';
  for (const character of value) { if (Buffer.byteLength(chunk + character) > 36) { chunks.push(chunk); chunk = ''; } chunk += character; }
  if (chunk || !chunks.length) chunks.push(chunk);
  return chunks.map(text => `=?UTF-8?B?${Buffer.from(text).toString('base64')}?=`).join('\r\n ');
}
export function composeMessage(input) {
  inputObject(input, ['from', 'to', 'cc', 'bcc', 'subject', 'text', 'threadId', 'inReplyTo', 'references', 'messageId']);
  const from = mailbox(input.from), headers = [`From: ${from}`]; let recipients = 0;
  for (const [field, label] of [['to', 'To'], ['cc', 'Cc'], ['bcc', 'Bcc']]) {
    const list = input[field] ?? [];
    if (!Array.isArray(list) || list.length > 100) throw new Error('Recipients must be arrays of up to 100 addresses.');
    recipients += list.length; if (list.length) headers.push(`${label}: ${list.map(mailbox).join(',\r\n ')}`);
  }
  if (!recipients || recipients > 100) throw new Error('Supply 1..100 explicit recipients.');
  if (typeof input.text !== 'string' || Buffer.byteLength(input.text) > 512 * 1024 || input.text.includes('\0')) throw new Error('Plain text body must be at most 512 KiB and contain no NUL.');
  const id = messageId(input.messageId ?? `<${randomUUID()}@${from.split('@')[1]}>`);
  headers.push(`Subject: ${subjectWords(input.subject)}`, `Message-ID: ${id}`);
  if (input.threadId !== undefined) {
    identifier(input.threadId);
    if (!input.inReplyTo || !input.references?.length) throw new Error('A thread reply requires observed In-Reply-To and References Message-IDs plus a matching subject.');
  }
  if (input.inReplyTo !== undefined) headers.push(`In-Reply-To: ${messageId(input.inReplyTo)}`);
  if (input.references !== undefined) {
    if (!Array.isArray(input.references) || !input.references.length || input.references.length > 50) throw new Error('Use 1..50 References Message-IDs.');
    headers.push(`References: ${input.references.map(messageId).join('\r\n ')}`);
  }
  headers.push('MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64');
  const body = Buffer.from(input.text.replace(/\r?\n/g, '\r\n')).toString('base64').match(/.{1,76}/g)?.join('\r\n') ?? '';
  return { messageId: id, message: { raw: Buffer.from(headers.join('\r\n') + '\r\n\r\n' + body + '\r\n').toString('base64url'), ...(input.threadId ? { threadId: input.threadId } : {}) }, sent: false };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { values } = parseArgs({ options: { input: { type: 'string' }, output: { type: 'string' } }, allowPositionals: false });
    if (!values.output) throw new Error('Supply --input message.json --output new-draft.json.');
    let input; try { input = JSON.parse(readLocal(values.input).toString('utf8')); } catch { throw new Error('Cannot read message JSON.'); }
    const result = composeMessage(input);
    writeFileSync(values.output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    process.stdout.write(JSON.stringify({ output: values.output, messageId: result.messageId, sent: false }) + '\n');
  } catch (error) { process.stderr.write(`Gmail compose: ${error.message}\n`); process.exitCode = 1; }
}
