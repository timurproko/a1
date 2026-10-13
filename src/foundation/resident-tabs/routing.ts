import type { EnsureTerminalHostResult } from "./ensure-terminal-host.js";

export interface ResidentHostSelectionOptions {
  readonly profileId: "a1" | "pi";
  readonly hasSessionSelection: boolean;
  readonly currentLaunchContract: boolean;
  readonly readSetting: () => Promise<boolean>;
  readonly ensureHost: () => Promise<EnsureTerminalHostResult>;
}

/** Invariant: every non-bare or default-off launch stays outside resident discovery and startup. */
export async function selectResidentHost(options: ResidentHostSelectionOptions): Promise<EnsureTerminalHostResult | null> {
  if (options.profileId !== "a1" || !options.currentLaunchContract) return null;
  if (!await options.readSetting()) return null;
  return await options.ensureHost();
}
