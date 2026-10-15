import type { EnsureTerminalHostResult } from "./ensure-terminal-host.js";

export interface ResidentHostSelectionOptions {
  readonly profileId: "a1" | "pi";
  readonly currentLaunchContract: boolean;
  readonly solo: boolean;
  /** Both standard input and standard output are terminals the attach client can own. */
  readonly interactive: boolean;
  readonly ensureHost: () => Promise<EnsureTerminalHostResult>;
}

/** Invariant: comparison, solo, and superseded launches stay outside resident discovery and startup. */
export async function selectResidentHost(options: ResidentHostSelectionOptions): Promise<EnsureTerminalHostResult | null> {
  if (options.profileId !== "a1" || options.solo || !options.currentLaunchContract) return null;
  // Platform: the attach client reads the outer terminal's size and owns its raw input, so piped
  // or redirected launches run the direct UI, which already serves non-terminal streams.
  if (!options.interactive) return { status: "fallback", reason: "no interactive terminal" };
  return await options.ensureHost();
}
