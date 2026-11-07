import { pathToFileURL } from 'node:url';

/** Offline locator only. A tenant hostname is not an Atlassian cloudId or proof of access. */
export function parseAtlassianTarget(input) {
  if (typeof input !== 'string' || input.length > 4096) throw new Error('Supply a bounded Atlassian Cloud URL or Jira issue key.');
  if (/^[A-Z][A-Z0-9_]{0,63}-[1-9][0-9]{0,15}$/.test(input)) return { kind: 'jira-issue', issueKey: input, verified: false };
  let url;
  try { url = new URL(input); } catch { throw new Error('Use a full Atlassian Cloud URL or Jira issue key.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !/^[a-z0-9][a-z0-9-]*\.atlassian\.net$/.test(url.hostname)) throw new Error('Only an HTTPS Atlassian Cloud tenant URL is supported.');
  const issue = url.pathname.match(/^\/browse\/([A-Z][A-Z0-9_]{0,63}-[1-9][0-9]{0,15})\/?$/);
  if (issue) return { kind: 'jira-issue', siteOrigin: url.origin, issueKey: issue[1], verified: false };
  const page = url.pathname.match(/^\/wiki\/spaces\/[^/]+\/pages\/([1-9][0-9]{0,31})(?:\/[^/]*)?\/?$/);
  const pageId = page?.[1] ?? (url.pathname === '/wiki/pages/viewpage.action' && url.searchParams.getAll('pageId').length === 1 ? url.searchParams.get('pageId') : null);
  if (pageId && /^[1-9][0-9]{0,31}$/.test(pageId)) return { kind: 'confluence-page', siteOrigin: url.origin, pageId, verified: false };
  throw new Error('Unsupported locator. Resolve short links, Data Center sites or other objects through an authorized service.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: node atlassian-target.mjs <URL-or-issue-key>');
    process.stdout.write(JSON.stringify(parseAtlassianTarget(process.argv[2]), null, 2) + '\n');
  } catch (error) { process.stderr.write(error.message + '\n'); process.exitCode = 1; }
}
