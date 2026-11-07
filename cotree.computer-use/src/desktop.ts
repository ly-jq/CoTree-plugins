import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { PluginJsonValue } from "@cotree/plugin-sdk";
import type { PluginServiceContext } from "@cotree/plugin-sdk/service";
import { DesktopBridgeFailure, type DesktopBridgeProvider, type DesktopBridgeStatus } from "../../../packages/runtimes/src/desktop/bridge-client.js";
import { decorateObservation, fingerprintObservation, stableControlKey } from "../../../packages/runtimes/src/desktop/locator.js";
import { executeDesktopAtomic } from "../../../packages/runtimes/src/desktop/operation-tools.js";
import { conditionMatches } from "../../../packages/runtimes/src/desktop/conditions.js";
import { createDesktopService } from "../../../packages/runtimes/src/desktop/service.js";
import type { DesktopAction, DesktopElement, DesktopObservation, DesktopRect } from "../../../packages/runtimes/src/desktop/types.js";

type ObjectValue = Record<string, unknown>;
const object = (value: unknown): ObjectValue => value && typeof value === "object" && !Array.isArray(value) ? value as ObjectValue : {};
const json = (value: unknown): PluginJsonValue => JSON.parse(JSON.stringify(value)) as PluginJsonValue;
export type CuaDesktopResult = { text: string; structuredJson?: string; rawJson: string; isError: boolean;
  errorCode?: string; images: Array<{ mimeType: string; dataBase64: string }> };
/** Narrow subset of the real CuaDriver SDK. No generic call is exposed to model input. */
export type CuaDriverPort = {
  callTool(name: string, argumentsJson: string, options?: { signal: AbortSignal }): Promise<CuaDesktopResult>;
};
type NativeWindow = { windowRef: string; processId: number; nativeWindowId: string; title: string; processName: string; active: boolean };

export function createCuaDesktopAdapter(driver: CuaDriverPort) {
  const active = new AsyncLocalStorage<PluginServiceContext>();
  const scopes = new Map<string, ReturnType<typeof createScope>>();
  const current = () => { const context = active.getStore(); if (!context) throw new Error("DESKTOP_AUTHORITY_MISSING: No active host call."); return context; };
  function createScope(scope: string) {
    const bridge = new CuaDesktopBridge(driver, current, scope);
    const service = createDesktopService(() => bridge, "cua");
    const contextFor = (context: PluginServiceContext): PluginServiceContext => ({ ...context,
      checkpoints: context.checkpoints ? {
        async get() { const root = object((await context.checkpoints!.get())?.value); const entry = object(object(root.desktopScopes)[scope]);
          if (!entry.value) return null; return { revision: Number(entry.revision), value: json(entry.value) }; },
        async set(value, expectedRevision) {
          const saved = await context.checkpoints!.get(); const root = object(saved?.value); const entries = object(root.desktopScopes); const entry = object(entries[scope]);
          if (Number(entry.revision ?? 0) !== expectedRevision) throw new Error("DESKTOP_CHECKPOINT_CONFLICT: Scope checkpoint changed.");
          entries[scope] = { revision: expectedRevision + 1, value };
          await context.checkpoints!.set(json({ ...root, desktopScopes: entries }), saved?.revision ?? 0); return expectedRevision + 1;
        }
      } : undefined });
    const started = Promise.resolve(service.start(contextFor(current())));
    return {
      async invoke(input: PluginJsonValue, context: PluginServiceContext) {
        await started;
        return executeDesktopAtomic(input, { services: { async state() { return "ready"; },
          async call(_id, method, args) { return service.call(method, args, contextFor(context)); } } });
      },
      async dispose(context: PluginServiceContext) { await started; await service.stop(contextFor(context)); }
    };
  }
  return {
    async invoke(input: PluginJsonValue, context: PluginServiceContext): Promise<PluginJsonValue> {
      return active.run(context, async () => {
        const identity = object(await context.host.call("desktop.scope", {}));
        if (typeof identity.key !== "string" || !identity.key) throw new Error("DESKTOP_AUTHORITY_MISSING: Host scope is unavailable.");
        let scope = scopes.get(identity.key);
        if (!scope) { if (scopes.size >= 64) throw new Error("DESKTOP_SCOPE_LIMIT: Close an unused desktop scope."); scope = createScope(identity.key); scopes.set(identity.key, scope); }
        const result = await scope.invoke(input, context);
        const mode = String(object(input).mode ?? "status");
        // These methods pass through the same serialized service queue as the
        // prior mutation; a successful reply therefore establishes settlement.
        return json({ ...result, output: { ...object(result.output),
          ...(["status", "observe", "verify"].includes(mode) && result.ok ? { executionSettled: true } : {}),
          provider: { id: "cotree.computer-use", backend: "cua", driver: "cua-driver", version: "0.29.1" } } });
      });
    },
    async dispose(context: PluginServiceContext) { await active.run(context, () => Promise.all([...scopes.values()].map(scope => scope.dispose(context)))); scopes.clear(); }
  };
}

class CuaDesktopBridge implements DesktopBridgeProvider {
  private readonly generation = randomUUID();
  private latest?: DesktopObservation;
  private windows = new Map<string, NativeWindow>();
  private capture?: { id: string; revision: string; bounds: DesktopRect; scale: number };
  constructor(private readonly driver: CuaDriverPort, private readonly context: () => PluginServiceContext, private readonly session: string) {}

  private async call(name: string, input: ObjectValue, signal?: AbortSignal, mutation = false) {
    if (signal?.aborted) throw new DesktopBridgeFailure("DESKTOP_OPERATION_CANCELLED: Cancelled before Cua dispatch.", undefined, "not_started");
    // Cancellation of a Rust future cannot prove that a Windows COM/input worker
    // stopped. Keep the host input lease until its actual SDK call settles.
    const result = await this.driver.callTool(name, JSON.stringify(input), !mutation && signal ? { signal } : undefined);
    const data = result.structuredJson ? object(JSON.parse(result.structuredJson)) : object(object(JSON.parse(result.rawJson || "{}")).structuredContent);
    if (result.isError || data.effect === "refused" || data.status === "refused") {
      const refused = data.effect === "refused" || data.status === "refused";
      throw new DesktopBridgeFailure(`DESKTOP_CUA_REFUSED: ${result.errorCode ?? object(data.error).code ?? result.text}`,
        { driver: "cua-driver", receipt: data }, refused || !mutation ? "not_started" : undefined);
    }
    return { data, result };
  }

  async status(signal?: AbortSignal): Promise<DesktopBridgeStatus> {
    const { data } = await this.call("list_windows", { on_screen_only: true }, signal);
    const native = object(await this.context().host.call("desktop.windowIdentity", {}));
    const candidates = Array.isArray(native.windows) ? native.windows.map(object) : [];
    const cuaWindows = Array.isArray(data.windows) ? data.windows.map(object) : [];
    this.windows.clear();
    for (const window of candidates) {
      if (typeof window.nativeWindowId !== "string" || typeof window.windowRef !== "string") continue;
      const matches = cuaWindows.filter(candidate => candidate.pid === window.processId && String(candidate.window_id) === window.nativeWindowId);
      if (matches.length === 1) this.windows.set(window.windowRef, window as unknown as NativeWindow);
    }
    return { apiVersion: "desktop-operator-v1", adapter: "cua", available: true, platform: process.platform,
      capabilities: ["semantic-tree", "control-patterns", "window-capture", "send-input"],
      supportedActions: ["set_value", "type_text", "toggle", "invoke", "click", "right_click", "double_click", "key"],
      windows: [...this.windows.values()],
      message: "Cua owns observation and action execution. Host window lifecycle identity is checked independently. Unsupported action routes never fall back to native input." };
  }

  private async identity(window: NativeWindow) {
    const actual = object(await this.context().host.call("desktop.windowIdentity", { windowRef: window.windowRef,
      pid: window.processId, windowId: window.nativeWindowId }));
    if (actual.windowRef !== window.windowRef || actual.processId !== window.processId || actual.nativeWindowId !== window.nativeWindowId) {
      throw new DesktopBridgeFailure("DESKTOP_TARGET_APP_DRIFT: Cua target no longer has its host window lifecycle identity.", undefined, "not_started");
    }
    return actual;
  }

  async observe(input: Parameters<DesktopBridgeProvider["observe"]>[0], signal?: AbortSignal): Promise<DesktopObservation> {
    await this.status(signal);
    const candidates = [...this.windows.values()].filter(window => input.windowRef ? window.windowRef === input.windowRef
      : input.pid ? window.processId === input.pid : input.title ? window.title.includes(input.title) : window.active);
    if (candidates.length !== 1) throw new DesktopBridgeFailure(`DESKTOP_WINDOW_${candidates.length ? "AMBIGUOUS" : "NOT_FOUND"}: Select one exact visible windowRef.`, undefined, "not_started");
    const window = candidates[0]!; await this.identity(window);
    const { data, result } = await this.call("get_window_state", { pid: window.processId, window_id: Number(window.nativeWindowId), session: this.session,
      include_accessibility_tree: true, include_screenshot: input.mode === "visual", max_elements: input.maxElements,
      ...(input.query ? { query: input.query } : {}) }, signal);
    await this.identity(window);
    if (data.pid !== window.processId || String(data.window_id) !== window.nativeWindowId || typeof data.snapshot_id !== "string") {
      throw new DesktopBridgeFailure("DESKTOP_CUA_OBSERVATION_INVALID: Snapshot does not identify the exact requested window.", undefined, "not_started");
    }
    const revision = `${this.generation}:${data.snapshot_id}`;
    const bounds = rect(object(data.window_bounds));
    const rows = Array.isArray(data.elements) ? data.elements.map(object) : [];
    const elements: DesktopElement[] = rows.map(row => {
      const state: DesktopElement["state"] = {};
      for (const key of ["enabled", "selected", "focused", "checked", "expanded", "password", "focusable", "offscreen"] as const) if (typeof row[key] === "boolean") state[key] = row[key] as boolean;
      // Cua Windows read_cached_selected checks TogglePattern before
      // SelectionItemPattern. Its explicit CheckBox + toggle schema therefore
      // exposes checked state as selected; unknown/mixed remains unknown.
      if (row.role === "CheckBox" && Array.isArray(row.actions) && row.actions.includes("toggle")
        && state.checked === undefined && typeof row.selected === "boolean") state.checked = row.selected;
      if (typeof row.value === "string" && state.password !== true) state.value = row.value;
      return { ref: String(row.element_token ?? `${revision}:${String(row.element_index)}`), runtimeId: "",
        ...(row.parent_index !== undefined ? { parentRef: String(rows.find(parent => parent.element_index === row.parent_index)?.element_token ?? "") } : {}),
        depth: Number(row.depth ?? 0), name: String(row.name ?? row.label ?? ""), automationId: String(row.automation_id ?? ""), controlType: String(row.role ?? "role not reported"),
        className: "", frameworkId: "cua", helpText: "", acceleratorKey: "", accessKey: "", bounds: rect(object(row.frame)),
        patterns: Array.isArray(row.actions) ? row.actions.filter((entry): entry is string => typeof entry === "string") : [], state,
        actionable: typeof row.element_token === "string" && state.enabled === true };
    });
    let observation: DesktopObservation = { apiVersion: "desktop-operator-v1", adapter: "cua", mode: input.mode, revision,
      providerGeneration: this.generation, observedAt: new Date().toISOString(), viewFingerprint: "",
      app: { appKey: `cua:${window.processName}`, processId: window.processId, processName: window.processName, productName: String(data.app_name ?? window.processName), version: "", framework: "cua" },
      window: { windowRef: window.windowRef, processId: window.processId, title: String(data.window_title ?? window.title), className: "", active: window.active, bounds },
      semanticCoverage: data.elements_complete === true ? 1 : 0, elementCount: Number(data.total_element_count ?? rows.length), returnedElementCount: rows.length,
      truncated: data.truncated === true || data.elements_complete !== true, elements,
      warnings: ["Unavailable Cua state fields remain unknown. Snapshot tokens are not durable UIA runtime identities."] };
    if (input.mode === "visual") {
      const image = result.images.find(image => image.mimeType === "image/png");
      if (!image || data.screenshot_frame_valid !== true || typeof data.capture_id !== "string") throw new DesktopBridgeFailure("DESKTOP_CUA_CAPTURE_UNAVAILABLE: Cua did not provide an admitted selected-window PNG.", undefined, "not_started");
      observation.screenshot = { contentType: "image/png", base64: image.dataBase64, width: Number(data.screenshot_width), height: Number(data.screenshot_height), reason: input.visualReason ?? "visual_assertion",
        capture: { provider: "cua-driver", captureId: data.capture_id, windowRef: window.windowRef, screenshotFrameValid: true } };
      this.capture = { id: data.capture_id, revision, bounds, scale: Number(data.screenshot_scale ?? 1) };
    }
    observation = decorateObservation(observation);
    // Windows UIA can expose an edit's current value as its Name. Treat that
    // value as state, not a durable locator. Identical semantic controls still
    // share a key and the executor refuses their ambiguity; array indices and
    // snapshot tokens never become fabricated runtime IDs.
    const identities = new Map(observation.elements.map((element, index) => [element.ref,
      element.automationId || element.patterns.includes("set_value") && typeof rows[index]?.name !== "string" ? { ...element, name: "" } : element]));
    observation.elements = observation.elements.map(element => ({ ...element,
      controlKey: stableControlKey(observation.app.appKey, `${observation.app.processId}:${window.windowRef}`, identities.get(element.ref)!, identities) }));
    observation.viewFingerprint = fingerprintObservation(observation);
    this.latest = observation; return observation;
  }

  async act(action: DesktopAction, signal?: AbortSignal): ReturnType<DesktopBridgeProvider["act"]> {
    const before = this.latest; const window = before && this.windows.get(before.window.windowRef);
    if (!before || !window) throw new DesktopBridgeFailure("DESKTOP_TARGET_REQUIRED: Observe one exact Cua window first.", undefined, "not_started");
    const target = before.elements.find(element => action.controlRef === element.ref);
    const args: ObjectValue = { pid: window.processId, window_id: Number(window.nativeWindowId), session: this.session };
    let method: string;
    if (action.action === "set_value" && target) { method = "set_value"; args.value = action.text ?? ""; args.element_token = target.ref; }
    else if (action.action === "type_text" && target) {
      // Cua's background element route uses ValuePattern.SetValue (replacement).
      // Its foreground route verifies exact HWND + element focus before typing,
      // preserving insert-at-caret semantics under the existing host input lease.
      method = "type_text"; args.text = action.text ?? ""; args.element_token = target.ref; args.delivery_mode = "foreground";
    } else if (action.action === "toggle" && target && target.patterns.includes("toggle")
      && (target.controlType === "CheckBox" || !target.patterns.includes("invoke")) && typeof target.state.checked === "boolean") {
      // Cua click owns the platform's Invoke/Toggle route. CheckBox's default
      // action is a toggle even when WinForms exposes both patterns. Generic
      // Invoke+Toggle controls remain ambiguous; require the inverse readback.
      method = "click"; args.element_token = target.ref; args.delivery_mode = "background"; args.button = "left"; args.count = 1;
    }
    else if (["invoke", "click", "right_click", "double_click"].includes(action.action)) {
      method = "click"; args.delivery_mode = "background"; args.button = action.action === "right_click" ? "right" : "left"; args.count = action.action === "double_click" ? 2 : 1;
      if (target) args.element_token = target.ref;
      else if (this.capture && Number.isFinite(action.x) && Number.isFinite(action.y)) {
        if (JSON.stringify(this.capture.bounds) !== JSON.stringify(before.window.bounds)) throw new DesktopBridgeFailure("DESKTOP_COORDINATE_FRAME_CHANGED: Window geometry changed.", undefined, "not_started");
        args.x = (action.x! - this.capture.bounds.left) * this.capture.scale;
        args.y = (action.y! - this.capture.bounds.top) * this.capture.scale; args.capture_id = this.capture.id;
      } else throw new DesktopBridgeFailure("DESKTOP_VISUAL_OBSERVATION_REQUIRED: Coordinate input needs an admitted Cua capture.", undefined, "not_started");
    } else if (action.action === "key" && target) {
      method = "press_key"; args.key = action.keys ?? ""; args.element_token = target.ref; args.delivery_mode = "background";
    } else throw new DesktopBridgeFailure(`DESKTOP_ACTION_UNSUPPORTED: Cua has no verified ${action.action} mapping for this binding.`, undefined, "not_started");
    await this.identity(window); await this.context().control?.assert();
    this.capture = undefined;
    const { data } = await this.call(method, args, signal, true);
    if (signal?.aborted) throw new DesktopBridgeFailure("DESKTOP_OPERATION_CANCELLED: Cua invocation settled after cancellation; observe before further input.", { driver: "cua-driver", receipt: data });
    const receipt = { ok: data.effect !== "suspected_noop" && data.effect !== "partial", backend: "cua-driver",
      inputReceipt: { driver: "cua-driver", receipt: data }, ...(data.effect !== "confirmed" ? { warning: "Cua returned no complete effect confirmation; explicit postconditions determine verification." } : {}) };
    if (!action.observeAfter) return receipt;
    let observation: DesktopObservation;
    try {
      observation = await this.observe({ mode: "compact", maxElements: 100, windowRef: window.windowRef }, signal);
    } catch (error) {
      // A successful input may close its target (for example an Open dialog).
      // Failure to observe that old window cannot retroactively mean no input
      // was sent. Keep the Cua receipt and require independent outcome evidence.
      return { ...receipt, observationUnavailable: error instanceof Error ? error.message : String(error) };
    }
    return { ...receipt, observation };
  }

  async waitFor(condition: Parameters<DesktopBridgeProvider["waitFor"]>[0], signal?: AbortSignal): ReturnType<DesktopBridgeProvider["waitFor"]> {
    const observation = await this.observe({ mode: "compact", maxElements: 100, windowRef: this.latest?.window.windowRef }, signal);
    return { matched: conditionMatches(observation, condition), observation };
  }
  async stop() { this.latest = undefined; this.capture = undefined; this.windows.clear(); }
}

function rect(value: ObjectValue): DesktopRect {
  const left = Number(value.x ?? 0); const top = Number(value.y ?? 0);
  const width = Number(value.width ?? value.w ?? 0); const height = Number(value.height ?? value.h ?? 0);
  return { left, top, width, height, right: left + width, bottom: top + height, centerX: left + width / 2, centerY: top + height / 2 };
}
