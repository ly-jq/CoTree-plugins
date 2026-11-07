import path from "node:path";
import { pathToFileURL } from "node:url";

export function connectionConfig(args) {
  let project, write = false;
  for (let index = 0; index < args.length; index++) {
    if (args[index] === "--project-id" && project === undefined) project = args[++index];
    else if (args[index] === "--write" && !write) write = true;
    else throw new Error("Usage: --project-id positive-integer [--write]");
  }
  if (!/^[1-9][0-9]{0,15}$/.test(project ?? "")) throw new Error("A project ID is required");
  const url = new URL("https://mcp.posthog.com/mcp");
  url.searchParams.set("mode", "tools");
  url.searchParams.set("project_id", project);
  if (!write) url.searchParams.set("readonly", "true");
  return { mcpServers: { "cotree.posthog.posthog": { transport: "streamable-http", url: url.href, headersEnv: { Authorization: "COTREE_POSTHOG_MCP_AUTHORIZATION" } } } };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { process.stdout.write(JSON.stringify(connectionConfig(process.argv.slice(2)), null, 2) + "\n"); }
  catch (error) { process.stderr.write(error.message + "\n"); process.exitCode = 1; }
}
