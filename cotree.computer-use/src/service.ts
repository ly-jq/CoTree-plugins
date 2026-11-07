import { defineService } from "@cotree/plugin-sdk/service";
import { createCuaBrowserService, type CuaBrowserSdk } from "../../../packages/runtimes/src/browser/cua/service.js";
export { closeBrowserTransport } from "../../../packages/runtimes/src/browser/cua/service.js";
import { createCuaDesktopAdapter, type CuaDriverPort } from "./desktop.js";
import { hostErrorReason } from "./host-errors.js";
import { createCuaDriverAdapter, type FullCuaDriver } from "./driver.js";

type CuaSdk = CuaBrowserSdk & {
  HostDriver: { create(options: { claudeCodeCompatibility: boolean; authorization: { allowedModes: number[]; compatibilityMode: number;
    unrestrictedAcknowledged: boolean; maxSessionTtlSeconds: bigint; maxIdleTtlSeconds: bigint } }, host: { authorize(request: string): Promise<boolean> }): FullCuaDriver };
  HostDriverError: { Failed: new (input: { reason: string }) => Error };
  HostBrowserError: { Failed: new (input: { reason: string }) => Error };
  CuaDriver: { createForEmbedding(options: { claudeCodeCompatibility: boolean; authorization: { allowedModes: number[]; compatibilityMode: number;
    unrestrictedAcknowledged: boolean; maxSessionTtlSeconds: bigint; maxIdleTtlSeconds: bigint } }): FullCuaDriver } };
let sdkPromise: Promise<CuaSdk> | undefined;
const sdk = () => sdkPromise ??= import(new URL("./cua/dist/index.js", import.meta.url).href) as Promise<CuaSdk>;
let browserService: ReturnType<typeof createCuaBrowserService> | undefined;
let driver: (CuaDriverPort & { shutdown(): Promise<void> }) | undefined;
let desktop: ReturnType<typeof createCuaDesktopAdapter> | undefined;
let desktopPromise: Promise<ReturnType<typeof createCuaDesktopAdapter>> | undefined;
let fullDriver: ReturnType<typeof createCuaDriverAdapter> | undefined;
async function desktopAdapter() {
  return desktopPromise ??= (async () => {
    driver = (await sdk()).CuaDriver.createForEmbedding({ claudeCodeCompatibility: false, authorization: {
      allowedModes: [0], compatibilityMode: 0, unrestrictedAcknowledged: false, maxSessionTtlSeconds: 3600n, maxIdleTtlSeconds: 900n } });
    desktop = createCuaDesktopAdapter(driver);
    return desktop;
  })().catch(error => { desktopPromise = undefined; throw error; });
}

export default defineService({
  async call(method, value, context) {
    if (method === "status") { await sdk(); return { ready: true, driver: "cua-driver", version: "0.29.1", embeddedBrowser: true, cursorPresentationRevision: true, cursorPersistence: true }; }
    // Explicit non-input preflight. The host may fall back only if this phase
    // fails; failures from the actual desktop operation are never replayed.
    if (method === "desktop.initialize") { await desktopAdapter(); return { ready: true, driver: "cua-driver", version: "0.29.1" }; }
    if (method === "desktop") return (await desktopAdapter()).invoke(value ?? null, context);
    if (method === "driver") {
      const runtime = await sdk();
      fullDriver ??= createCuaDriverAdapter(authority => runtime.HostDriver.create({ claudeCodeCompatibility: false, authorization: {
        allowedModes: [0], compatibilityMode: 0, unrestrictedAcknowledged: false, maxSessionTtlSeconds: 3600n, maxIdleTtlSeconds: 900n } }, {
          async authorize(request) { try { return await authority.authorize(request); }
            catch (error) { throw new runtime.HostDriverError.Failed({ reason: hostErrorReason(error) }); } }
        }));
      return fullDriver.invoke(value ?? null, context);
    }
    browserService ??= createCuaBrowserService(sdk, context.pluginId);
    return browserService.call(method, value, context);
  },
  async stop(context) {
    await browserService?.stop(); browserService = undefined;
    await desktopPromise?.catch(() => undefined);
    if (desktop) await desktop.dispose(context);
    await fullDriver?.dispose(); fullDriver = undefined;
    if (driver) await driver.shutdown();
    desktop = undefined; driver = undefined; desktopPromise = undefined;
  }
});
