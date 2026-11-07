import { isDeepStrictEqual } from "node:util";
import { createHash } from "node:crypto";
import { computerTargetKey, isCuaDriverManagement, isCuaDriverObservation } from "@cotree/agent-core";
import type { PluginJsonValue } from "@cotree/plugin-sdk";
import type { PluginServiceContext } from "@cotree/plugin-sdk/service";
import { object } from "./browser.js";
import type { CuaDriverPort } from "./desktop.js";

export type FullCuaDriver = CuaDriverPort & { listToolsJson(): Promise<string>; shutdown(): Promise<void> };
const json = (value: unknown): PluginJsonValue => JSON.parse(JSON.stringify(value));
const fail = (code: string, message: string) => ({ ok: false, error: { code, message, recoverable: true },
  output: { execution: "not_started", executionSettled: true, effect: "none" } });
// These commands configure or manage the Driver. A successful native return
// acknowledges that command; it is not a claim about an application's UI.
// In particular Cua's session/cursor/recorder outputs have no `effect` field.
function publicDefinition(tool: Record<string, unknown>): Record<string, unknown> {
  const schema = object(tool.inputSchema);
  const visible = (key: string) => key !== "session" && !key.startsWith("_");
  return { ...tool, inputSchema: { ...schema,
    properties: Object.fromEntries(Object.entries(object(schema.properties)).filter(([key]) => visible(key))),
    ...(Array.isArray(schema.required) ? { required: schema.required.filter(key => typeof key === "string" && visible(key)) } : {}) } };
}
async function updateCheckpoint(checkpoints: NonNullable<PluginServiceContext["checkpoints"]>, update: (root: Record<string, unknown>) => void): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    const saved = await checkpoints.get(), root = object(saved?.value);
    update(root);
    try { await checkpoints.set(json(root), saved?.revision ?? 0); return; }
    catch (error) {
      if (attempt >= 3 || !(object(error).code === "CONTROL_STATE_CONFLICT" || String(error).includes("CONTROL_STATE_CONFLICT"))) throw error;
    }
  }
}

/** Full native catalog; no alternate agent loop or hand-written action emulator.
 * Each host scope owns a native runtime, preventing cross-agent session,
 * recording and browser capability leakage. Persistent Driver settings keep
 * Cua's native machine/user scope and are not claimed to be session-local. */
export function createCuaDriverAdapter(factory: (authority: { authorize(request: string): Promise<boolean> }) => FullCuaDriver) {
  type Invocation = { context: PluginServiceContext; name: string; input: Record<string, unknown> };
  type Scope = { driver: FullCuaDriver; catalog: Map<string, Record<string, unknown>>;
    tails: Map<string, Promise<unknown>>; barrier: Promise<unknown>; authority: Set<Invocation> };
  const scopes = new Map<string, Promise<Scope>>();
  const pending = new Set<Promise<PluginJsonValue>>();
  let disposed = false;
  async function invoke(request: PluginJsonValue, context: PluginServiceContext): Promise<PluginJsonValue> {
    const checkpoints = context.checkpoints, control = context.control;
    if (!checkpoints || !control) return fail("CUA_DRIVER_AUTHORITY_MISSING", "Checkpoint and input lease services are required.");
    const args = object(request), authority = object(await context.host.call("desktop.scope", {}));
    if (!["tools", "read", "call"].includes(String(args.mode))) return fail("CUA_DRIVER_MODE_INVALID", "Use tools, read or call.");
    if (typeof authority.key !== "string") return fail("CUA_DRIVER_AUTHORITY_MISSING", "Host scope is unavailable.");
    const scopeKey = authority.key;
    let scope = scopes.get(scopeKey);
    if (!scope) {
      if (scopes.size >= 32) return fail("CUA_DRIVER_SCOPE_LIMIT", "Close an unused Driver scope.");
      const nativeAuthority = new Set<Invocation>();
      const driver = factory({ async authorize(request) {
        const args = object(JSON.parse(request));
        // UniFFI callbacks do not inherit JS async context. Correlate their exact
        // native request with its live host invocation instead of a global slot.
        const candidates = [...nativeAuthority].filter(active => {
          if (active.context.signal.aborted) return false;
          if (args.kind === "dispatch") return args.tool === active.name && isDeepStrictEqual(args.input, active.input);
          if (args.kind === "replay") return active.name === "replay_trajectory";
          const resource = object(args.resource);
          return args.kind === "protected" && active.name === "browser_prepare"
            && resource.pid === active.input.pid && resource.window_id === active.input.window_id;
        });
        if (candidates.length !== 1) return false;
        return await candidates[0]!.context.host.call("driver.authorize", json(args)) === true;
      } });
      scope = (async (): Promise<Scope> => { try {
        const native = object(JSON.parse(await driver.listToolsJson()));
        const tools = Array.isArray(native.tools) ? native.tools.map(object) : [];
        if (!tools.length) throw new Error("Driver returned no tool catalog.");
        return { driver, catalog: new Map(tools.map(tool => [String(tool.name), tool])), tails: new Map(), barrier: Promise.resolve(), authority: nativeAuthority };
      } catch (error) { await driver.shutdown(); throw error; } })();
      scopes.set(scopeKey, scope);
      void scope.catch(() => { if (scopes.get(scopeKey) === scope) scopes.delete(scopeKey); });
    }
    const active = await scope;
    const resource = computerTargetKey(String(args.name), object(args.input));
    const barrier = isCuaDriverManagement(String(args.name), object(args.input)) || args.name === "replay_trajectory";
    const dependencies = [active.barrier, ...(barrier ? active.tails.values() : [active.tails.get(resource)])];
    const work = Promise.allSettled(dependencies).then(async () => {
      if (context.signal.aborted) return fail("CUA_DRIVER_CANCELLED", "Cancelled before dispatch.");
      if (args.mode === "tools") {
        const names = Array.isArray(args.names) ? args.names.map(String) : undefined;
        if (names?.some(name => !active.catalog.has(name))) return fail("CUA_DRIVER_TOOL_UNAVAILABLE", "A requested name is absent from this platform's native catalog.");
        const tools = [...active.catalog.values()].filter(tool => !names || names.includes(String(tool.name))).map(tool => names ? publicDefinition(tool) :
          { name: tool.name, annotations: tool.annotations, capabilities: tool.capabilities, risk: tool.risk });
        return json({ ok: true, output: { provider: "cua-driver", platform: process.platform, tools,
          sessionManagedByHost: true, schemaDetails: names ? "included" : "Request names to retrieve complete native schemas." } });
      }
      const name = String(args.name), definition = active.catalog.get(name);
      if (!definition) return fail("CUA_DRIVER_TOOL_UNAVAILABLE", "Read the current platform catalog before selecting a Driver tool.");
      const readOnly = object(definition.annotations).readOnlyHint === true
        || name === "browser_dialog" && object(args.input).action === "inspect";
      if (args.mode === "read" && !readOnly) return fail("CUA_DRIVER_READ_ONLY_REQUIRED", "This native tool can mutate state; use call so the host admits input authority.");
      const input = { ...object(args.input) };
      if (Object.keys(input).some(key => key === "session" || key.startsWith("_"))) return fail("CUA_DRIVER_AUTHORITY_INVALID", "Host session/private fields cannot be supplied by the caller.");
      const session = `cotree-driver-${authority.key}`;
      // The native registry consumes this trusted lifecycle field before typed
      // projection, including for schemas that do not advertise it (zoom,
      // perception, recording). Omitting it splits capture/recording ownership
      // between the named and implicit sessions inside the same runtime.
      input.session = session;
      const mutation = args.mode === "call" && !readOnly;
      const operationId = String(authority.operationId ?? "");
      if (mutation && !operationId) return fail("CUA_DRIVER_OPERATION_REQUIRED", "Host invocation identity is required for Driver mutations.");
      const digest = createHash("sha256").update(JSON.stringify([name, input])).digest("hex");
      const saved = await checkpoints.get();
      const checkpoint = object(saved?.value), records = object(checkpoint.driverOperations), previous = object(records[operationId]);
      if (mutation && previous.digest) return previous.digest !== digest ? fail("CUA_DRIVER_REPLAY_MISMATCH", "Invocation identity cannot be reused for different input.")
        : json(previous.receipt ?? fail("CUA_DRIVER_PREVIOUS_INPUT_UNKNOWN", "This invocation was already admitted; observe its effect instead of replaying it."));
      const durable = object(object(checkpoint.driverScopes)[scopeKey]);
      const target = computerTargetKey(name, input);
      const uncertain = durable.uncertain === true || Object.values(records).some(value => {
        const record = object(value);
        return record.scope === scopeKey && (record.state === "dispatched" || record.uncertain === true)
          && record.reconciled !== true && (!record.target || record.target === target);
      });
      const management = isCuaDriverManagement(name, input);
      if (mutation && uncertain && !management) return fail("CUA_DRIVER_PREVIOUS_INPUT_UNKNOWN", "Read the affected browser/window state before sending more input to that target.");
      let leased = false;
      const invocation = { context, name, input };
      try {
        if (mutation) {
          // CDP-only browser commands do not occupy the physical keyboard/mouse.
          if (!name.startsWith("browser_") || name === "browser_prepare") {
            await control.acquire(); leased = true;
            await control.assert();
          }
          if (context.signal.aborted) return fail("CUA_DRIVER_CANCELLED", "Cancelled before native dispatch.");
          await updateCheckpoint(checkpoints, root => {
            const entries = object(root.driverOperations);
            if (entries[operationId]) throw new Error("CUA_DRIVER_REPLAY_CONFLICT: Invocation was already admitted.");
            // Keep every identity/digest, but bound historical native payloads.
            // Compact receipts remain usable replay tombstones, not fresh input.
            const settled = Object.values(entries).map(object).filter(record => record.state === "settled" && record.receipt);
            for (const record of settled.slice(0, Math.max(0, settled.length - 63))) {
              const prior = object(record.receipt), output = object(prior.output);
              record.receipt = { ok: prior.ok, ...(prior.error ? { error: prior.error } : {}), output: {
                execution: output.execution, executionSettled: true, inputAcknowledged: output.inputAcknowledged,
                effect: output.effect, retained: true, payloadCompacted: true, tool: output.tool } };
            }
            entries[operationId] = { digest, state: "dispatched", scope: scopeKey, target };
            root.driverOperations = entries;
          });
        }
        // Do not cancel a native sender promise: its settlement owns the lease.
        active.authority.add(invocation);
        const result = await active.driver.callTool(name, JSON.stringify(input), !mutation ? { signal: context.signal } : undefined);
        const data = result.structuredJson ? object(JSON.parse(result.structuredJson)) : object(object(JSON.parse(result.rawJson || "{}")).structuredContent);
        const refused = result.isError || data.status === "refused" || data.effect === "refused"
          || name === "replay_trajectory" && Number(data.failed) > 0;
        const confirmed = !refused && data.effect === "confirmed";
        const notDispatched = data.effect === "refused";
        const inputAcknowledged = mutation && !refused && data.effect !== "unknown" && data.execution !== "unknown";
        const effect = !mutation ? "observed" : confirmed ? "confirmed" : notDispatched || !refused && management ? "none" : "unknown";
        const receipt = json({ ok: !refused && !context.signal.aborted,
          output: { provider: { backend: "cua", driver: "cua-driver", scope: authority.key }, tool: name, result: data,
            text: result.text, execution: mutation && !notDispatched ? "completed" : "not_started", executionSettled: true,
            inputAcknowledged,
            effect, ...(mutation && management && !refused ? { commandAcknowledged: true } : {}) },
          ...(refused || context.signal.aborted ? { error: { code: context.signal.aborted ? "CUA_DRIVER_CANCELLED" : result.errorCode ?? object(data.refusal).code ?? "CUA_DRIVER_REFUSED",
            message: context.signal.aborted ? "Native invocation settled after cancellation; inspect the retained receipt." : result.text, recoverable: true } } : {}),
          ...(result.images.length ? { content: result.images.map(image => ({ type: "image", mimeType: image.mimeType, data: image.dataBase64 })) } : {}) });
        if (mutation) {
          // Binary content stays on the media channel; only the authoritative
          // receipt is persisted for replay rejection/recovery.
          await updateCheckpoint(checkpoints, root => {
            const entries = object(root.driverOperations);
            entries[operationId] = { digest, state: "settled", scope: scopeKey, target,
              uncertain: !inputAcknowledged && !notDispatched, receipt: { ...object(receipt), content: undefined } };
            root.driverOperations = entries;
          });
        } else if (!refused && !context.signal.aborted && isCuaDriverObservation(name, input)) {
          await updateCheckpoint(checkpoints, root => {
            const entries = object(root.driverOperations), states = object(root.driverScopes);
            for (const value of Object.values(entries)) {
              const record = object(value);
              if (record.scope === scopeKey && (!record.target || record.target === target)) record.reconciled = true;
            }
            states[scopeKey] = { uncertain: false };
            root.driverOperations = entries; root.driverScopes = states;
          });
        }
        return receipt;
      } catch (error) {
        const reason = object(object(error).inner).reason;
        if (typeof reason === "string") throw Object.assign(new Error(`CUA_DRIVER_NATIVE_ERROR: ${reason}`), { cause: error });
        throw error;
      } finally { active.authority.delete(invocation); if (leased) await control.release(); }
    });
    active.tails.set(resource, work);
    if (barrier) active.barrier = work.catch(() => undefined);
    void work.finally(() => { if (active.tails.get(resource) === work) active.tails.delete(resource); }).catch(() => undefined);
    return work;
  }
  return { invoke(request: PluginJsonValue, context: PluginServiceContext) {
    if (disposed) return Promise.resolve(json(fail("CUA_DRIVER_CLOSED", "The Driver provider is closed.")));
    // Exact targets have independent queues; shared session management is a
    // barrier, and physical input continues to use the host seat lease.
    const work = invoke(request, context); pending.add(work);
    void work.then(() => pending.delete(work), () => pending.delete(work));
    return work;
  }, async dispose() {
    disposed = true;
    await Promise.allSettled([...pending]);
    for (const scope of scopes.values()) await (await scope).driver.shutdown();
    scopes.clear();
  } };
}
