import { buildPluginToolName, type PluginToolContext } from "@cotree/plugin-sdk";
import { file, good, integer, object, parse, PLUGIN_ID, relative, StudioError, text, type ObjectValue } from "./shared.js";

export const PROJECT_SCRIPTS = ["dev", "dev:web", "dev:admin", "dev:api", "preview", "build", "typecheck", "lint", "test", "test:api", "test:e2e", "migrate", "seed"] as const;
export const PREVIEW_SCRIPTS = ["dev", "dev:web", "dev:admin", "dev:api", "preview"];
export async function scriptInput(input: ObjectValue, context: Pick<PluginToolContext, "files">) {
  const root = relative(input.projectPath), script = text(input.script, "script", 80);
  if (!(PROJECT_SCRIPTS as readonly string[]).includes(script)) throw new StudioError("STUDIO_SCRIPT_NOT_DECLARED", `Use a declared package script: ${PROJECT_SCRIPTS.join(", ")}. Other stacks can use the original authorized Shell tools.`);
  const source = file(root, "package.json"), pkg = parse((await context.files.read(source, { maxBytes: 262144 })).content, source);
  const scripts = object(pkg.scripts, "package.json scripts"); text(scripts[script], `scripts.${script}`, 8000);
  return { root, script };
}
export async function journey(input: ObjectValue, context: PluginToolContext) {
  const action = text(input.action, "action", 40);
  if (action === "start") {
    await scriptInput(input, context);
    const requestKey = text(input.requestKey, "requestKey", 200);
    const receipt = await context.tasks.submit({ toolName: buildPluginToolName(PLUGIN_ID, "run"), requestKey,
      input: { projectPath: relative(input.projectPath), script: text(input.script, "script", 80), requestKey, timeoutMs: integer(input.timeoutMs, "timeoutMs", 1000, 240000, 120000) } });
    return good({ ...receipt, next: "Read this original taskRef. A submitted task is not a passed test." });
  }
  if (action === "list") return good(await context.tasks.list());
  const ref = text(input.taskRef, "taskRef", 4096);
  if (action === "read") return good(await context.tasks.read(ref));
  if (action === "cancel") return good(await context.tasks.cancel(ref, "App Studio user/coordinator requested stop"));
  if (action === "events") return good(await context.tasks.events(ref, { afterSeq: integer(input.afterSeq, "afterSeq", 0, Number.MAX_SAFE_INTEGER, 0), limit: 50 }));
  throw new StudioError("STUDIO_ACTION_INVALID", "Use start, list, read, events or cancel.");
}
export async function run(input: ObjectValue, context: PluginToolContext) {
  const { root, script } = await scriptInput(input, context);
  const receipt = await context.process.execute("node", ["--run", script], { cwd: { kind: "workspace-directory", path: root },
    requestKey: text(input.requestKey, "requestKey", 200), timeoutMs: integer(input.timeoutMs, "timeoutMs", 1000, 240000, 120000), maxOutputBytes: 1048576 });
  const report = { projectPath: root, script, process: receipt, commandSucceeded: receipt.executionSettled && receipt.exitCode === 0,
    coverage: "Observed declared package command only. Inspect test counts, scenarios and source identity before claiming business verification." };
  const artifact = await context.artifacts.create({ type: "json", content: JSON.stringify(report), summary: `App Studio ${script} process receipt` });
  return { ...good({ ...report, artifact: artifact.artifact }), ok: report.commandSucceeded,
    ...(!report.commandSucceeded ? { error: { code: receipt.executionSettled ? "STUDIO_COMMAND_FAILED" : "STUDIO_COMMAND_UNCONFIRMED",
      message: receipt.executionSettled ? `Declared ${script} did not exit successfully. Inspect the retained process receipt.`
        : `Execution settlement for ${script} was not observed. Read the original process receipt before retrying or claiming an outcome.`, recoverable: true } } : {}) };
}
