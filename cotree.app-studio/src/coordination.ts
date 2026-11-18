import type { PluginToolContext, PluginSessionsClient } from "@cotree/plugin-sdk";
import { good, object, PLUGIN_ID, StudioError, text, type ObjectValue } from "./shared.js";
import { project, type Templates } from "./project.js";

export const TEAM = [
  { role: "lead", family: "coordination", skill: "app-studio", responsibility: "Own scope, shared contracts, Group dependencies, original-member repair and evidence-based delivery." },
  { role: "business", family: "execution", skill: "business-model", responsibility: "Research references and API recordings; own adopted business rules, contracts and product decisions." },
  { role: "resource-analyst", family: "execution", skill: "code-resource-analysis", responsibility: "Analyze authorized source/bundles/decompiled resources; retain provenance and send candidate rules/test vectors to the business owner." },
  { role: "backend", family: "execution", skill: "backend-build", responsibility: "Implement domain behavior, authorization, persistence, migrations, idempotency and API tests." },
  { role: "web", family: "execution", skill: "customer-web-build", responsibility: "Implement customer journeys against the exact shared API contract, including error and empty states." },
  { role: "admin", family: "execution", skill: "admin-web-build", responsibility: "Implement operational journeys, roles, data scope and audit displays against the shared backend." },
  { role: "integrator", family: "execution", skill: "integrate-verify", responsibility: "Integrate exact member artifacts serially; verify real API/database/web/admin journeys and report defects to original owners." }
] as const;

export async function start(input: ObjectValue, context: PluginToolContext, templates: Templates) {
  if (!context.sessionId) throw new StudioError("STUDIO_SESSION_REQUIRED", "Send the application request in a conversation so the original Session can own its Group.");
  const capabilities = await context.sessions.query({ view: "capabilities" });
  const prepared = await project({ ...input, action: input.scaffold === true ? "scaffold" : "initialize" }, context, templates);
  return good({ sessionId: context.sessionId, project: prepared.output, capabilities,
    team: TEAM.map(member => ({ ...member, agent: `${PLUGIN_ID}.${member.role}`, skill: `${PLUGIN_ID}.${member.skill}` })),
    next: "Continue in this conversation: use its current Group or SessionControl evolve if eligible; interpret the goal, publish the first slice's rules/contract, delegate independent work, integrate and test, continue original members for fixes, then deliver actual artifacts. This receipt prepares inputs; it does not finish the application." });
}
export async function coordinate(input: ObjectValue, context: PluginToolContext) {
  const action = text(input.action, "action", 40), request = object(input.request ?? {}, "request");
  const requestKey = action === "query" ? undefined : text(input.requestKey, "requestKey", 200);
  // The SDK and original Session schemas revalidate all authority, scope, generation and dependency fields.
  switch (action) {
    case "query": return good(await context.sessions.query(request as Parameters<PluginSessionsClient["query"]>[0]));
    case "delegate": return good(await context.sessions.delegate({ ...request, requestKey } as Parameters<PluginSessionsClient["delegate"]>[0]));
    case "message": return good(await context.sessions.message({ ...request, requestKey } as Parameters<PluginSessionsClient["message"]>[0]));
    case "control": return good(await context.sessions.control({ ...request, requestKey } as Parameters<PluginSessionsClient["control"]>[0]));
    case "worktree": return good(await context.sessions.worktree({ ...request, requestKey } as Parameters<PluginSessionsClient["worktree"]>[0]));
    default: throw new StudioError("STUDIO_ACTION_INVALID", "Use query, delegate, message, control or worktree with the original Session input fields.");
  }
}
