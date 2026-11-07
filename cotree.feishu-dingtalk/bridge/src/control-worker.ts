import os from "node:os";
import path from "node:path";
import { MessagingControl } from "./control.js";
import { BridgeError, object, safeError, string } from "./config.js";
import { hash } from "./store.js";

export async function runControlWorker() {
  let control: MessagingControl | undefined, buffer = "", closing = false;
  let queue = Promise.resolve();
  const close = async () => { if (closing) return; closing = true; await queue; await control?.close(); process.stdin.destroy(); };
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk: string) => {
    if (closing) return;
    buffer += chunk;
    if (Buffer.byteLength(buffer) > 131072) { void close(); return; }
    let index: number;
    while ((index = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, index); buffer = buffer.slice(index + 1);
      queue = queue.then(async () => {
        let id = "invalid";
        try {
          const frame = object(JSON.parse(line)); id = string(frame.id, "id");
          if (frame.method === "initialize") {
            if (control) throw new BridgeError("ALREADY_INITIALIZED");
            const workspace = string(object(frame.input).workspace, "workspace", 4096);
            const file = path.join(os.homedir(), ".cotree", "messaging", "workspaces", hash(path.resolve(workspace)).slice(0, 32), "config.json");
            control = new MessagingControl(file);
            process.stdout.write(JSON.stringify({ id, ok: true, running: false, data: { initialized: true } }) + "\n");
            return;
          }
          if (!control) throw new BridgeError("NOT_INITIALIZED");
          process.stdout.write(JSON.stringify({ id, ...await control.call(string(frame.method, "method"), frame.input ?? {}) }) + "\n");
        } catch (error) { process.stdout.write(JSON.stringify({ id, ok: false, running: control?.bridge.running ?? false, code: safeError(error) }) + "\n"); }
      });
    }
  });
  process.stdin.once("end", () => { void close(); });
  process.stdout.once("error", () => { void close(); });
  process.once("SIGINT", () => { void close(); });
  process.once("SIGTERM", () => { void close(); });
}
