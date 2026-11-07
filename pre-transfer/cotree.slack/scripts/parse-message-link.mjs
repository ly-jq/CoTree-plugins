import { pathToFileURL } from 'node:url';

export function parseMessageLink(input) {
  const url = new URL(input);
  if (url.protocol !== 'https:' || !/^[a-z0-9-]+\.slack\.com$/.test(url.hostname) || url.username || url.password || url.port) throw new Error('Expected an HTTPS workspace.slack.com message permalink.');
  const match = url.pathname.match(/^\/archives\/([CGD][A-Z0-9]{8,})\/p(\d{16,22})\/?$/);
  if (!match) throw new Error('Unsupported Slack message link. Resolve the conversation and message using Slack tools.');
  const channel = match[1], packed = match[2], messageTs = packed.slice(0, -6) + '.' + packed.slice(-6);
  const threadTs = url.searchParams.get('thread_ts'), cid = url.searchParams.get('cid');
  if (threadTs && !/^\d{10,16}\.\d{6}$/.test(threadTs)) throw new Error('Invalid thread timestamp.');
  if (cid && cid !== channel) throw new Error('Conversation identifiers disagree.');
  return { workspaceHost: url.hostname, channelId: channel, messageTs, threadTs, verifiedByService: false };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: node parse-message-link.mjs <Slack message permalink>');
    process.stdout.write(JSON.stringify(parseMessageLink(process.argv[2]), null, 2) + '\n');
  } catch (error) { process.stderr.write(`Slack link parsing failed: ${error.message}\n`); process.exitCode = 1; }
}
