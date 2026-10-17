import { PRODUCT_IDENTITY } from "../../product-identity.js";
import type { ProcessGuardianAddon } from "./addon.js";
import type { NativeProcessInspector } from "./contracts.js";

/** Resolve only the platform's exact-process inspector used by cooperative session ownership. */
export async function createNativeProcessInspector(
  environment: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
  releaseRoot?: string,
  loadAddon?: (path: string) => ProcessGuardianAddon,
): Promise<NativeProcessInspector> {
  if (platform === "linux") {
    const { LinuxNativeProcessInspector } = await import("./linux-process-inspector.js");
    return new LinuxNativeProcessInspector();
  }
  if (platform !== "win32" && platform !== "darwin") throw new Error(`native process identity is unsupported on ${platform}`);
  if (releaseRoot === undefined && !environment[PRODUCT_IDENTITY.environment.processGuardianPath]) {
    throw new Error("native process identity addon is unavailable");
  }
  const [{ resolveProcessGuardianPath }, { loadProcessGuardianAddon }, { AddonProcessInspector }] = await Promise.all([
    import("./addon-containment.js"),
    import("./addon.js"),
    import("./addon-process-inspector.js"),
  ]);
  const addonPath = resolveProcessGuardianPath(releaseRoot ?? process.cwd(), environment, platform);
  const addon = (loadAddon ?? loadProcessGuardianAddon)(addonPath);
  return new AddonProcessInspector(addon, platform === "win32" ? "windows-filetime:" : "darwin-proc-start:");
}
