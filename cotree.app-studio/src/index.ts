import { definePlugin } from "@cotree/plugin-sdk";
import { createHandlers } from "./handlers.js";
declare const APP_STUDIO_TEMPLATES: Record<string, string>;
export default definePlugin({ tools: createHandlers(APP_STUDIO_TEMPLATES) });
