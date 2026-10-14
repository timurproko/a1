import type { EnsureTerminalHostResult } from "./ensure-terminal-host.js";

export interface ResidentHostSelectionOptions {
  readonly profileId: "a1" | "pi";
  readonly currentLaunchContract: boolean;
  readonly solo: boolean;
  readonly ensureHost: () => Promise<EnsureTerminalHostResult>;
}

/** Invariant: comparison, solo, and superseded launches stay outside resident discovery and startup. */
export async function selectResidentHost(options: ResidentHostSelectionOptions): Promise<EnsureTerminalHostResult | null> {
  if (options.profileId !== "a1" || options.solo || !options.currentLaunchContract) return null;
  return await options.ensureHost();
}
