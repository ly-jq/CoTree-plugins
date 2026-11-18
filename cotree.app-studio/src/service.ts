import { defineService, createServiceCapabilityClients } from "@cotree/plugin-sdk/service";
import { failure, good, integer, object, StudioError, text, type ObjectValue } from "./shared.js";
import { PREVIEW_SCRIPTS, scriptInput } from "./execution.js";

export default defineService({
  async call(method, payload, context) {
    try {
      if (method !== "environment") throw new StudioError("STUDIO_SERVICE_METHOD_INVALID", "Use environment.");
      const input = object(object(payload).input, "tool input"), action = text(input.action, "action", 40);
      const clients = createServiceCapabilityClients(context);
      if (action === "inspect") return good(await context.process.inspect("node"));
      if (action === "list") return good({ processes: await context.process.list() });
      if (action === "start") {
        const { root, script } = await scriptInput(input, clients);
        if (!PREVIEW_SCRIPTS.includes(script)) throw new StudioError("STUDIO_PREVIEW_SCRIPT_INVALID", "Use a declared dev/preview script; finite checks belong to journey.start.");
        const env: Record<string, string> = {};
        if (input.port !== undefined) env.PORT = String(integer(input.port, "port", 1024, 65535, 3000));
        env.HOST = "127.0.0.1";
        const receipt = await context.process.spawn("node", ["--run", script], { requestKey: text(input.requestKey, "requestKey", 200),
          cwd: { kind: "workspace-directory", path: root }, env, maxOutputBytes: 4194304 });
        return good({ ...receipt, projectPath: root, script, readiness: "not_observed", next: "Read the original process log and verify the actual service URL. Process admission does not prove health or business completion." });
      }
      const processId = text(input.processId, "processId", 160);
      if (action === "stop") return good(await context.process.stop(processId));
      if (action === "read") {
        const cursor = input.cursor === undefined ? undefined : object(input.cursor, "cursor");
        const options = { maxBytes: integer(input.maxBytes, "maxBytes", 1024, 65536, 16384), timeoutMs: 0,
          ...(cursor ? { cursor: { stdoutOffset: integer(cursor.stdoutOffset, "stdoutOffset", 0, Number.MAX_SAFE_INTEGER, 0), stderrOffset: integer(cursor.stderrOffset, "stderrOffset", 0, Number.MAX_SAFE_INTEGER, 0) } } : {}) };
        return good(await context.process.read(processId, options));
      }
      throw new StudioError("STUDIO_ACTION_INVALID", "Use inspect, start, list, read or stop.");
    } catch (error) { return failure(error) as ObjectValue; }
  }
});
