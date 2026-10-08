import { PRODUCT_IDENTITY } from "../../product-identity.js";
import type { NativeProcessInspector } from "./contracts.js";

/** Resolve only the platform's exact-process inspector used by cooperative session ownership. */
export async function createNativeProcessInspector(
  environment: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
  releaseRoot?: string,
): Promise<NativeProcessInspector> {
  if (platform === "linux") {
    const { LinuxNativeProcessInspector } = await import("./linux-process-inspector.js");
    return new LinuxNativeProcessInspector();
  }
  if (platform !== "win32" && platform !== "darwin") throw new Error(`native process identity is unsupported on ${platform}`);
  if (releaseRoot === undefined && !environment[PRODUCT_IDENTITY.environment.processGuardianPath]) {
    throw new Error("native process identity helper is unavailable");
  }
  const { resolveProcessGuardianPath } = await import("./native-guardian-containment.js");
  const helper = resolveProcessGuardianPath(releaseRoot ?? process.cwd(), environment, platform);
  if (platform === "win32") {
    const { WindowsNativeProcessInspector } = await import("./windows-process-inspector.js");
    return new WindowsNativeProcessInspector(helper);
  }
  const { DarwinNativeProcessInspector } = await import("./darwin-process-inspector.js");
  return new DarwinNativeProcessInspector(helper);
}
