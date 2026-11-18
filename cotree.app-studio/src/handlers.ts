import type { PluginToolContext, PluginToolResult } from "@cotree/plugin-sdk";
import { failure, object, type Json } from "./shared.js";
import { start, coordinate } from "./coordination.js";
import { project, references, type Templates } from "./project.js";
import { capture } from "./capture.js";
import { contract } from "./contracts.js";
import { journey, run } from "./execution.js";
import { delivery } from "./delivery.js";

export function createHandlers(templates: Templates) {
  const wrap = (handler: (input: ReturnType<typeof object>, context: PluginToolContext) => Promise<PluginToolResult>) => async (input: Json, context: PluginToolContext) => {
    try { context.signal.throwIfAborted(); return await handler(object(input), context); }
    catch (error) { return failure(error); }
  };
  return {
    start: wrap((input, context) => start(input, context, templates)),
    project: wrap((input, context) => project(input, context, templates)),
    coordinate: wrap(coordinate), references: wrap(references), capture: wrap(capture),
    contract: wrap(contract), journey: wrap(journey), run: wrap(run), delivery: wrap(delivery)
  };
}
